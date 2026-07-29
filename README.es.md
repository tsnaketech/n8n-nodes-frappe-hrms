# n8n-nodes-frappe-hrms

Paquete de nodos comunitarios de n8n para [Frappe HR](https://frappe.io/hr) (la aplicación `hrms`, también conocida como Frappe HRMS). Permite leer y escribir empleados, solicitudes de vacaciones, registros de asistencia, notas de gastos, nóminas y todo el proceso de selección desde tus flujos de trabajo de n8n.

[n8n](https://n8n.io/) es una plataforma de automatización de workflows con [licencia fair-code](https://docs.n8n.io/reference/license/).

Otros idiomas: [English](README.md) · [Français](README.fr.md) · [Deutsch](README.de.md)

[Instalación](#instalación)
[Credenciales](#credenciales)
[Operaciones](#operaciones)
[Uso](#uso)
[Compatibilidad](#compatibilidad)
[Recursos](#recursos)
[Historial de versiones](#historial-de-versiones)
[Desarrollo](#desarrollo)

## Instalación

Sigue la [guía de instalación](https://docs.n8n.io/integrations/community-nodes/installation/) de la documentación de nodos comunitarios de n8n, usando `n8n-nodes-frappe-hrms` como nombre del paquete.

**Autoalojado, desde la interfaz de n8n** — ve a **Settings > Community nodes > Install**, escribe `n8n-nodes-frappe-hrms` y confirma.

**Autoalojado, manualmente:**

```bash
cd ~/.n8n/custom
npm install n8n-nodes-frappe-hrms
```

Reinicia n8n y busca «Frappe HRMS» en el panel de nodos.

## Credenciales

Este paquete usa un único tipo de credencial, **Frappe API** (`frappeApi`) — el *mismo* tipo que los nodos Frappe CRM y Frappe Helpdesk. Si ya la tienes configurada, el nodo Frappe HRMS puede seleccionarla directamente.

### Generar las claves API en Frappe

1. En tu sitio Frappe, abre el usuario en cuyo nombre debe actuar n8n (`/app/user`).
2. Baja hasta **Settings > API Access** y pulsa **Generate Keys**.
3. Copia el **API Secret** — se muestra una sola vez — y la **API Key** visible en la ficha del usuario.

El nodo actúa como ese usuario, por lo que hereda sus roles y permisos. Si una llamada falla por permisos, revisa los roles sobre el doctype antes de sospechar de la credencial.

### Rellenar la credencial

| Campo      | Ejemplo                          | Notas                                                            |
| ---------- | -------------------------------- | ---------------------------------------------------------------- |
| Site URL   | `https://mi-sitio.frappe.cloud`  | Raíz del sitio. Un `/hr` o `/` final se elimina automáticamente   |
| API Key    | `a1b2c3d4e5f6g7h`                |                                                                  |
| API Secret | `s1e2c3r4e5t6`                   | n8n lo almacena cifrado                                          |

Las peticiones se autentican con la cabecera `Authorization: token {apiKey}:{apiSecret}`. El botón **Test** valida la conexión: llama a `/api/method/frappe.auth.get_logged_user` y falla si el sitio responde como `Guest`, que es lo que devuelve Frappe cuando no reconoce las claves.

### Una sola credencial para todos los nodos Frappe

`frappeApi` no tiene deliberadamente **nada** específico de RR. HH. Frappe autentica a un *usuario en un sitio*, no a una aplicación: la misma clave API sirve para Frappe HR, Frappe CRM, Frappe Helpdesk y Frappe LMS, que viven en el mismo sitio y comparten el mismo endpoint `/api`.

Crea una instancia por *sitio* («Frappe – prod», «Frappe – staging»), no una por aplicación. Consulta [docs/CREDENTIALS.md](docs/CREDENTIALS.md) para la arquitectura completa, la lista de nodos consumidores y los roles de Frappe que requiere cada operación.

## Operaciones

| Recurso           | Doctype de Frappe   | Operaciones                                                   |
| ----------------- | ------------------- | ------------------------------------------------------------- |
| Employee          | `Employee`          | Create, Get, Get Many, Update, Delete                          |
| Leave Application | `Leave Application` | Create, Get, Get Many, Update, Delete, **Approve**, **Reject** |
| Attendance        | `Attendance`        | Create, Get, Get Many, Update, Delete                          |
| Expense Claim     | `Expense Claim`     | Create, Get, Get Many, Update, Delete                          |
| Salary Slip       | `Salary Slip`       | Get, Get Many — solo lectura                                   |
| Job Opening       | `Job Opening`       | Create, Get, Get Many, Update, Delete                          |
| Job Applicant     | `Job Applicant`     | Create, Get, Get Many, Update, Delete                          |
| Job Offer         | `Job Offer`         | Create, Get, Get Many, Update, Delete                          |

Todas las operaciones pasan por la API REST estándar de Frappe en `/api/resource/{doctype}` con `GET`, `POST`, `PUT` y `DELETE`. La única excepción es **Approve / Reject**, que además llama a `/api/method/frappe.client.submit` — ver más abajo.

Los nombres de doctype se han verificado en [github.com/frappe/hrms](https://github.com/frappe/hrms) (`hrms/hr/doctype/`, `hrms/payroll/doctype/`) y [github.com/frappe/erpnext](https://github.com/frappe/erpnext).

> **¿Por qué `Employee` no está en la app `hrms`?**
> Porque no lo está. `Employee` vive en ERPNext (`erpnext/setup/doctype/employee`), y `hrms/hooks.py` declara `required_apps = ["frappe/erpnext"]` — Frappe HR extiende el doctype en lugar de poseerlo, mediante un `override_doctype_class` y una serie de custom fields añadidos por `hrms/setup.py`.
>
> Consecuencia práctica: `/api/resource/Employee` funciona en cualquier sitio ERPNext, pero los campos **Employment Type**, **Grade**, **Default Shift**, **Leave Approver** y **Expense Approver** que expone este nodo solo existen una vez instalado Frappe HR.

> **Salary Slip es de solo lectura, a propósito.**
> Las nóminas las produce la ejecución de payroll (`Payroll Entry`), que calcula cada línea de devengo, deducción e impuesto a partir de la estructura salarial. Crear una por REST acabaría siendo sobrescrito por la siguiente ejecución, o produciría un documento incoherente con sus propias tablas hijas. El nodo solo expone Get y Get Many.

### Doctypes «submittable» y `docstatus`

`Leave Application`, `Attendance`, `Expense Claim`, `Job Offer` y `Salary Slip` son **submittable** en Frappe: llevan un `docstatus` con valor `0` (borrador), `1` (enviado) o `2` (cancelado).

**Create deja el documento como borrador** (`docstatus: 0`). Es el comportamiento REST de Frappe, no una limitación del nodo: `POST /api/resource/{doctype}` inserta, no envía. Un registro de asistencia solo cuenta en los informes una vez enviado, así que el borrador es un paso, rara vez un estado final.

Para Leave Application, las operaciones **Approve** y **Reject** hacen el envío por ti. Para el resto de doctypes, envía desde la interfaz de Frappe o añade un segundo nodo que llame a `frappe.client.submit` con el nodo HTTP Request.

Frappe también se niega a modificar un documento enviado: **Update** sobre un registro con `docstatus: 1` falla para cualquier campo no marcado como `allow_on_submit`. Hay que cancelar y enmendar en Frappe.

### Aprobar / rechazar una solicitud de vacaciones

`Leave Application.status` es un campo `Select` (`Open`, `Approved`, `Rejected`, `Cancelled`) declarado en **permlevel 1**: escribirlo requiere un rol habilitado en permlevel 1, típicamente `Leave Approver` o `HR Manager`. Además, HRMS se niega a enviar una solicitud cuyo estado siga siendo `Open`.

El nodo hace, por tanto, en este orden:

1. `GET` del documento, para leer su `docstatus` actual;
2. rechazo explícito si ya está enviado o cancelado — Frappe los congela, y la salida es Cancel + Amend, no un fallo silencioso;
3. cambio de `status` a `Approved` o `Rejected` (y de `leave_approver`, si lo indicas);
4. `POST /api/method/frappe.client.submit` con el documento resultante, que guarda *y* envía en una sola ida y vuelta.

La opción **Submit** (activa por defecto) controla el paso 4. Desactívala para dejar la solicitud como borrador con el nuevo estado — útil cuando una etapa posterior del flujo se encarga del envío.

### Opciones de Get Many

| Opción             | Equivale a                          | Notas                                                        |
| ------------------ | ----------------------------------- | ------------------------------------------------------------ |
| Return All         | paginación automática `limit_start` | Trae 100 registros por petición hasta la última página        |
| Limit              | `limit_page_length`                 | Se usa cuando Return All está desactivado                     |
| Offset             | `limit_start`                       | Se ignora cuando Return All está activo                       |
| Fields             | `fields`                            | Separados por comas o array JSON. Por defecto `["*"]`         |
| Filters (JSON)     | `filters`                           | Sintaxis de filtros de Frappe                                 |
| Or Filters (JSON)  | `or_filters`                        | Misma sintaxis, combinada con OR                              |
| Sort Field / Order | `order_by`                          | p. ej. `modified desc`                                        |

Sin `fields`, Frappe solo devuelve la columna `name`: por eso el nodo envía `["*"]` por defecto y te da el documento completo.

Los filtros aceptan las dos formas de Frappe — un objeto para la igualdad simple, o un array de tripletas para los operadores:

```json
{ "status": "Open" }
```

```json
[["from_date", ">=", "2026-01-01"], ["status", "!=", "Rejected"]]
```

### Fechas

Frappe almacena datetimes **naive**, interpretados en la zona horaria del sitio (**Settings > System Settings > Time Zone**). El nodo convierte los valores que llevan zona horaria — lo que produce el selector de fechas de n8n, por ejemplo `2026-08-15T09:00:00+02:00` o `...Z` — a la **zona horaria del workflow de n8n**, y deja intactos los que no la llevan.

Los campos `Date` se envían como `YYYY-MM-DD` y los `Datetime` como `YYYY-MM-DD HH:mm:ss`. En la práctica: mantén la misma zona horaria en el workflow de n8n y en el sitio Frappe, o un fichaje a las 09:00 acabará a otra hora.

### Gestión de errores

Frappe informa de sus errores en un campo `_server_messages` que contiene JSON codificado *dentro* de JSON, a menudo con marcado HTML. El nodo lo desenvuelve y muestra el mensaje real: obtienes `Value missing for Employee: Date Of Joining` en lugar de `Request failed with status code 417`. Si no lo encuentra, recurre al campo `exception` y después al código HTTP.

Las respuestas `401` y `403` incluyen una indicación que apunta al rol de Frappe y no a la credencial, porque casi siempre es la causa.

## Uso

Cada ejemplo es un nodo que puedes pegar en un workflow de n8n. Sustituye el bloque `credentials` por el tuyo.

### Employee — crear

```json
{
	"parameters": {
		"resource": "employee",
		"operation": "create",
		"first_name": "Marie",
		"gender": "Female",
		"date_of_birth": "1992-04-17",
		"date_of_joining": "2026-09-01",
		"company": "Acme SAS",
		"additionalFields": {
			"last_name": "Dupont",
			"company_email": "marie.dupont@acme.io",
			"department": "Engineering - A",
			"designation": "Backend Developer",
			"employment_type": "Full-time",
			"holiday_list": "France 2026",
			"leave_approver": "rh@acme.io",
			"reports_to": "HR-EMP-00002"
		}
	},
	"type": "n8n-nodes-frappe-hrms.frappeHrms",
	"typeVersion": 1,
	"name": "Create Employee",
	"position": [0, 0],
	"credentials": { "frappeApi": { "id": "1", "name": "Frappe account" } }
}
```

`first_name`, `gender`, `date_of_birth`, `date_of_joining` y `company` son los cinco campos que el doctype declara `reqd`. `employee_name` lo deriva Frappe de las partes del nombre, por lo que no se expone. `Gender`, `Department`, `Designation` y `Employment Type` son Link: el valor debe ser el `name` de un registro existente.

### Leave Application — crear

```json
{
	"parameters": {
		"resource": "leaveApplication",
		"operation": "create",
		"employee": "HR-EMP-00001",
		"leave_type": "Casual Leave",
		"from_date": "2026-08-10",
		"to_date": "2026-08-14",
		"additionalFields": {
			"description": "Vacaciones de verano",
			"leave_approver": "rh@acme.io",
			"posting_date": "2026-07-29"
		}
	},
	"type": "n8n-nodes-frappe-hrms.frappeHrms",
	"typeVersion": 1,
	"name": "Request Leave",
	"position": [0, 0],
	"credentials": { "frappeApi": { "id": "1", "name": "Frappe account" } }
}
```

El registro se crea como borrador con estado `Open`. `company` y `department` no se exponen: el doctype los marca como read-only con un `fetch_from` sobre el empleado, así que los rellena Frappe.

### Leave Application — aprobar

```json
{
	"parameters": {
		"resource": "leaveApplication",
		"operation": "approve",
		"documentId": "HR-LAP-2026-00001",
		"approvalOptions": {
			"leave_approver": "rh@acme.io",
			"submit": true
		}
	},
	"type": "n8n-nodes-frappe-hrms.frappeHrms",
	"typeVersion": 1,
	"name": "Approve Leave",
	"position": [0, 0],
	"credentials": { "frappeApi": { "id": "1", "name": "Frappe account" } }
}
```

**Reject** es el mismo nodo con `"operation": "reject"`: pone el estado en `Rejected` y envía igual — en HRMS una solicitud rechazada es un documento enviado, no un documento borrado.

La salida es el documento enviado completo, `docstatus` incluido, para que un nodo posterior pueda ramificar sobre él.

### Attendance — crear

```json
{
	"parameters": {
		"resource": "attendance",
		"operation": "create",
		"employee": "HR-EMP-00001",
		"attendance_date": "2026-07-29",
		"status": "Present",
		"additionalFields": {
			"shift": "Day Shift",
			"in_time": "2026-07-29T09:03:00",
			"out_time": "2026-07-29T17:45:00",
			"working_hours": 8.7,
			"late_entry": true
		}
	},
	"type": "n8n-nodes-frappe-hrms.frappeHrms",
	"typeVersion": 1,
	"name": "Record Attendance",
	"position": [0, 0],
	"credentials": { "frappeApi": { "id": "1", "name": "Frappe account" } }
}
```

`in_time` y `out_time` son campos Datetime; `attendance_date` es un campo Date y se trunca al día. El registro se crea como borrador — envíalo en Frappe para que cuente en los informes de asistencia.

### Expense Claim — crear

```json
{
	"parameters": {
		"resource": "expenseClaim",
		"operation": "create",
		"employee": "HR-EMP-00001",
		"expenses": {
			"expense": [
				{
					"expense_date": "2026-07-21",
					"expense_type": "Travel",
					"description": "Tren París–Lyon, kick-off con el cliente",
					"amount": 128.4
				},
				{
					"expense_date": "2026-07-21",
					"expense_type": "Food",
					"description": "Comida con el cliente",
					"amount": 46
				}
			]
		},
		"additionalFields": {
			"expense_approver": "rh@acme.io",
			"posting_date": "2026-07-22",
			"cost_center": "Main - A"
		}
	},
	"type": "n8n-nodes-frappe-hrms.frappeHrms",
	"typeVersion": 1,
	"name": "Create Expense Claim",
	"position": [0, 0],
	"credentials": { "frappeApi": { "id": "1", "name": "Frappe account" } }
}
```

Es obligatoria al menos una línea: `expenses` es una tabla hija `reqd` (`Expense Claim Detail`) y cada fila necesita `expense_type` y `amount`. En **Update**, las líneas que envíes *reemplazan* la tabla existente; deja la colección vacía para no tocarla.

### Salary Slip — get many

Todas las nóminas enviadas de un periodo, ordenadas por empleado:

```json
{
	"parameters": {
		"resource": "salarySlip",
		"operation": "getAll",
		"returnAll": true,
		"options": {
			"fields": "name,employee,employee_name,start_date,end_date,gross_pay,net_pay,status",
			"filters": "[[\"start_date\",\">=\",\"2026-07-01\"],[\"end_date\",\"<=\",\"2026-07-31\"],[\"docstatus\",\"=\",1]]",
			"sortField": "employee_name",
			"sortOrder": "asc"
		}
	},
	"type": "n8n-nodes-frappe-hrms.frappeHrms",
	"typeVersion": 1,
	"name": "July Salary Slips",
	"position": [0, 0],
	"credentials": { "frappeApi": { "id": "1", "name": "Frappe account" } }
}
```

`docstatus = 1` descarta los borradores, que es casi siempre lo que se busca al exportar la nómina.

### Job Opening — crear

```json
{
	"parameters": {
		"resource": "jobOpening",
		"operation": "create",
		"job_title": "Senior Backend Developer",
		"company": "Acme SAS",
		"designation": "Backend Developer",
		"additionalFields": {
			"department": "Engineering - A",
			"employment_type": "Full-time",
			"location": "Paris - A",
			"status": "Open",
			"closes_on": "2026-09-30",
			"currency": "EUR",
			"lower_range": 55000,
			"upper_range": 70000,
			"description": "<p>Python, Frappe Framework, PostgreSQL.</p>"
		}
	},
	"type": "n8n-nodes-frappe-hrms.frappeHrms",
	"typeVersion": 1,
	"name": "Publish Job Opening",
	"position": [0, 0],
	"credentials": { "frappeApi": { "id": "1", "name": "Frappe account" } }
}
```

`description` es un campo Text Editor de Frappe, así que admite HTML. `location` es un Link a `Branch`, pese a su nombre.

### Job Applicant — crear

```json
{
	"parameters": {
		"resource": "jobApplicant",
		"operation": "create",
		"applicant_name": "Jean Martin",
		"email_id": "jean.martin@email.com",
		"additionalFields": {
			"phone_number": "+33 6 12 34 56 78",
			"job_title": "HR-OPN-2026-0001",
			"designation": "Backend Developer",
			"country": "France",
			"source": "Website Listing",
			"status": "Open",
			"resume_link": "https://www.linkedin.com/in/jean-martin"
		}
	},
	"type": "n8n-nodes-frappe-hrms.frappeHrms",
	"typeVersion": 1,
	"name": "Register Applicant",
	"position": [0, 0],
	"credentials": { "frappeApi": { "id": "1", "name": "Frappe account" } }
}
```

Cuidado con `job_title`: en `Job Applicant` este campo es un **Link a `Job Opening`**, no texto libre. Por eso el nodo lo etiqueta como **Job Opening**. Dale el `name` de la oferta (`HR-OPN-2026-0001`), no su título.

### Job Offer — crear

```json
{
	"parameters": {
		"resource": "jobOffer",
		"operation": "create",
		"job_applicant": "HR-APP-2026-00001",
		"offer_date": "2026-08-05",
		"designation": "Backend Developer",
		"company": "Acme SAS",
		"additionalFields": {
			"status": "Awaiting Response",
			"terms": "<p>Salario base 62 000 € brutos, incorporación el 2026-10-01.</p>"
		}
	},
	"type": "n8n-nodes-frappe-hrms.frappeHrms",
	"typeVersion": 1,
	"name": "Send Job Offer",
	"position": [0, 0],
	"credentials": { "frappeApi": { "id": "1", "name": "Frappe account" } }
}
```

`applicant_name` es obligatorio en el doctype pero lleva un `fetch_from` sobre el candidato, así que lo rellena Frappe — el nodo no lo pide.

### Delete

Cualquier recurso de escritura, a partir de su document ID:

```json
{
	"parameters": {
		"resource": "jobOpening",
		"operation": "delete",
		"documentId": "HR-OPN-2026-0001"
	},
	"type": "n8n-nodes-frappe-hrms.frappeHrms",
	"typeVersion": 1,
	"name": "Delete Job Opening",
	"position": [0, 0],
	"credentials": { "frappeApi": { "id": "1", "name": "Frappe account" } }
}
```

El nodo devuelve `{ "success": true, "doctype": "Job Opening", "name": "HR-OPN-2026-0001" }`. Frappe se niega a borrar un documento enviado, y cualquier documento al que apunte otro registro — cancélalo antes.

## Compatibilidad

Probado con n8n 1.x y Frappe Framework v15 con Frappe HR (`hrms`) y ERPNext. El nodo solo usa los endpoints REST estándar `/api/resource` más `frappe.client.submit`, así que debería funcionar con cualquier versión de Frappe HR que conserve los nombres de doctype listados arriba.

ERPNext es obligatorio: `hrms/hooks.py` lo declara en `required_apps`, y el doctype `Employee` proviene de él.

## Recursos

- [Documentación de nodos comunitarios de n8n](https://docs.n8n.io/integrations/#community-nodes)
- [Documentación de la API REST de Frappe](https://docs.frappe.io/framework/user/en/api/rest)
- [Documentación de Frappe HR](https://docs.frappe.io/hr)
- [Código fuente de Frappe HR](https://github.com/frappe/hrms)
- [Arquitectura de la credencial compartida](docs/CREDENTIALS.md)

## Historial de versiones

### 0.1.0

Versión inicial. Nodo Frappe HRMS con los recursos Employee, Leave Application, Attendance, Expense Claim, Salary Slip, Job Opening, Job Applicant y Job Offer, el flujo Approve/Reject de vacaciones, y la credencial compartida `frappeApi`.

## Desarrollo

```bash
npm install
npm run build     # compila a dist/ y copia los iconos
npm run dev       # bucle de desarrollo contra un n8n local
npm run lint      # el mismo comando que ejecuta la CI
npm run lint:fix
```

No hay runner de tests en este repositorio. Verifica los cambios con `npm run build` y una carga real en n8n.

Consulta [AGENTS.md](AGENTS.md) para la guía completa de contribución.
