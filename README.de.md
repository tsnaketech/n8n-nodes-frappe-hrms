# n8n-nodes-frappe-hrms

n8n Community-Node-Paket für [Frappe HR](https://frappe.io/hr) (die App `hrms`, auch Frappe HRMS genannt). Es ermöglicht das Lesen und Schreiben von Mitarbeitenden, Urlaubsanträgen, Anwesenheiten, Spesenabrechnungen, Gehaltsabrechnungen und dem gesamten Recruiting-Prozess aus n8n-Workflows heraus.

[n8n](https://n8n.io/) ist eine Workflow-Automatisierungsplattform unter [Fair-Code-Lizenz](https://docs.n8n.io/reference/license/).

Andere Sprachen: [English](README.md) · [Français](README.fr.md) · [Español](README.es.md)

[Installation](#installation)
[Credentials](#credentials)
[Operationen](#operationen)
[Verwendung](#verwendung)
[Kompatibilität](#kompatibilität)
[Ressourcen](#ressourcen)
[Versionsverlauf](#versionsverlauf)
[Entwicklung](#entwicklung)

## Installation

Folge der [Installationsanleitung](https://docs.n8n.io/integrations/community-nodes/installation/) in der n8n-Dokumentation zu Community-Nodes, mit `n8n-nodes-frappe-hrms` als Paketnamen.

**Self-hosted, über die n8n-Oberfläche** — gehe zu **Settings > Community nodes > Install**, gib `n8n-nodes-frappe-hrms` ein und bestätige.

**Self-hosted, manuell:**

```bash
cd ~/.n8n/custom
npm install n8n-nodes-frappe-hrms
```

Starte n8n neu und suche im Node-Panel nach „Frappe HR" — der frühere Name „HRMS" trifft weiterhin.

## Credentials

Dieses Paket verwendet einen einzigen Credential-Typ, **Frappe API** (`frappeApi`) — denselben Typ wie die Nodes Frappe CRM und Frappe Helpdesk. Ist er bereits konfiguriert, kann der Frappe-HR-Node ihn direkt auswählen.

### API-Schlüssel in Frappe erzeugen

1. Öffne auf deiner Frappe-Site den Benutzer, in dessen Namen n8n handeln soll (`/desk/user` ab v16, `/app/user` bis v15).
2. Scrolle zu **Settings > API Access** und klicke auf **Generate Keys**.
3. Kopiere das **API Secret** — es wird nur einmal angezeigt — und den **API Key** aus dem Benutzerdokument.

Der Node handelt als dieser Benutzer und erbt dessen Rollen und Berechtigungen. Schlägt ein Aufruf mit einem Berechtigungsfehler fehl, prüfe die Rollen auf dem Doctype, nicht das Credential.

### Credential ausfüllen

| Feld       | Beispiel                        | Hinweise                                                          |
| ---------- | ------------------------------- | ----------------------------------------------------------------- |
| Site URL   | `https://meine-site.frappe.cloud` | Site-Root. Ein abschließender Anwendungspfad (`/desk/hrms`, `/app`, `/hrms`, `/crm`…) sowie das abschließende `/` werden automatisch entfernt |
| API Key    | `a1b2c3d4e5f6g7h`               |                                                                   |
| API Secret | `s1e2c3r4e5t6`                  | Wird von n8n verschlüsselt gespeichert                            |

Anfragen werden über den Header `Authorization: token {apiKey}:{apiSecret}` authentifiziert. Der Button **Test** prüft die Verbindung: Er ruft `/api/method/frappe.auth.get_logged_user` auf und schlägt fehl, wenn die Site als `Guest` antwortet — genau das liefert Frappe, wenn die Schlüssel nicht erkannt werden.

### Ein Credential für alle Frappe-Nodes

`frappeApi` ist bewusst **nicht** HR-spezifisch. Frappe authentifiziert einen *Benutzer auf einer Site*, keine Anwendung: derselbe API-Schlüssel gilt für Frappe HR, Frappe CRM, Frappe Helpdesk und Frappe LMS, die alle auf derselben Site liegen und denselben `/api`-Endpunkt teilen.

Lege eine Instanz pro *Site* an („Frappe – prod", „Frappe – staging"), nicht pro Anwendung. Siehe [docs/CREDENTIALS.md](docs/CREDENTIALS.md) für die vollständige Architektur, die Liste der nutzenden Nodes und die von jeder Operation benötigten Frappe-Rollen.

## Operationen

| Ressource         | Frappe-Doctype      | Operationen                                                   |
| ----------------- | ------------------- | ------------------------------------------------------------- |
| Employee          | `Employee`          | Create, Get, Get Many, Update, Delete                          |
| Leave Application | `Leave Application` | Create, Get, Get Many, Update, Delete, **Approve**, **Reject** |
| Attendance        | `Attendance`        | Create, Get, Get Many, Update, Delete                          |
| Expense Claim     | `Expense Claim`     | Create, Get, Get Many, Update, Delete                          |
| Salary Slip       | `Salary Slip`       | Get, Get Many — nur lesend                                     |
| Job Opening       | `Job Opening`       | Create, Get, Get Many, Update, Delete                          |
| Job Applicant     | `Job Applicant`     | Create, Get, Get Many, Update, Delete                          |
| Job Offer         | `Job Offer`         | Create, Get, Get Many, Update, Delete                          |

Alle Operationen laufen über die Standard-REST-API von Frappe unter `/api/resource/{doctype}` mit `GET`, `POST`, `PUT` und `DELETE`. Einzige Ausnahme: **Approve / Reject**, das zusätzlich `/api/method/frappe.client.submit` aufruft — siehe unten.

Die Doctype-Namen wurden gegen [github.com/frappe/hrms](https://github.com/frappe/hrms) (`hrms/hr/doctype/`, `hrms/payroll/doctype/`) und [github.com/frappe/erpnext](https://github.com/frappe/erpnext) geprüft.

> **Warum liegt `Employee` nicht in der App `hrms`?**
> Weil es dort nicht liegt. `Employee` gehört zu ERPNext (`erpnext/setup/doctype/employee`), und `hrms/hooks.py` deklariert `required_apps = ["frappe/erpnext"]` — Frappe HR erweitert den Doctype, statt ihn zu besitzen, über eine `override_doctype_class` und eine Reihe von Custom Fields aus `hrms/setup.py`.
>
> Praktische Folge: `/api/resource/Employee` funktioniert auf jeder ERPNext-Site, aber die von diesem Node angebotenen Felder **Employment Type**, **Grade**, **Default Shift**, **Leave Approver** und **Expense Approver** existieren erst, wenn Frappe HR installiert ist.

> **Salary Slip ist bewusst nur lesend.**
> Gehaltsabrechnungen entstehen aus dem Payroll-Lauf (`Payroll Entry`), der jede Bezugs-, Abzugs- und Steuerzeile aus der Gehaltsstruktur berechnet. Eine per REST erzeugte Abrechnung würde entweder vom nächsten Lauf überschrieben oder wäre inkonsistent zu ihren eigenen Child-Tables. Der Node bietet nur Get und Get Many.

### Submittable Doctypes und `docstatus`

`Leave Application`, `Attendance`, `Expense Claim`, `Job Offer` und `Salary Slip` sind in Frappe **submittable**: Sie tragen einen `docstatus` mit dem Wert `0` (Entwurf), `1` (eingereicht) oder `2` (storniert).

**Create legt das Dokument als Entwurf an** (`docstatus: 0`). Das ist das REST-Verhalten von Frappe, keine Einschränkung des Nodes: `POST /api/resource/{doctype}` fügt ein, es reicht nicht ein. Ein Anwesenheitseintrag zählt erst nach dem Einreichen in Berichten — der Entwurf ist also ein Zwischenschritt, selten ein Endzustand.

Für Leave Application übernehmen die Operationen **Approve** und **Reject** das Einreichen. Für die übrigen Doctypes reiche in der Frappe-Oberfläche ein oder ergänze einen zweiten Node, der `frappe.client.submit` über den HTTP-Request-Node aufruft.

Frappe weigert sich außerdem, ein eingereichtes Dokument zu ändern: **Update** auf einem Datensatz mit `docstatus: 1` schlägt für jedes Feld fehl, das nicht `allow_on_submit` gesetzt hat. Storniere und ergänze (Amend) dann in Frappe.

### Urlaubsantrag genehmigen / ablehnen

`Leave Application.status` ist ein `Select`-Feld (`Open`, `Approved`, `Rejected`, `Cancelled`) auf **Permlevel 1**: Es zu schreiben erfordert eine Rolle mit Permlevel-1-Zugriff, typischerweise `Leave Approver` oder `HR Manager`. Zusätzlich weigert sich HRMS, einen Antrag einzureichen, dessen Status noch `Open` ist.

Der Node geht daher in dieser Reihenfolge vor:

1. `GET` des Dokuments, um den aktuellen `docstatus` zu lesen;
2. ausdrückliche Ablehnung, wenn es bereits eingereicht oder storniert ist — Frappe friert diese ein, und der Ausweg ist Cancel + Amend, kein stiller Fehlschlag;
3. `status` auf `Approved` oder `Rejected` setzen (sowie `leave_approver`, falls angegeben);
4. `POST /api/method/frappe.client.submit` mit dem resultierenden Dokument, das in einem Durchgang speichert *und* einreicht.

Die Option **Submit** (standardmäßig aktiv) steuert Schritt 4. Schalte sie aus, um den Antrag als Entwurf mit dem neuen Status zu belassen — nützlich, wenn eine spätere Stufe des Workflows das Einreichen übernimmt.

### Optionen von Get Many

| Option             | Entspricht                          | Hinweise                                                    |
| ------------------ | ----------------------------------- | ----------------------------------------------------------- |
| Return All         | Auto-Pagination über `limit_start`  | Holt 100 Datensätze pro Anfrage bis zur letzten Seite       |
| Limit              | `limit_page_length`                 | Wird genutzt, wenn Return All aus ist                        |
| Offset             | `limit_start`                       | Wird ignoriert, wenn Return All an ist                       |
| Fields             | `fields`                            | Kommagetrennt oder JSON-Array. Standard `["*"]`              |
| Filters (JSON)     | `filters`                           | Frappe-Filtersyntax                                          |
| Or Filters (JSON)  | `or_filters`                        | Gleiche Syntax, mit ODER verknüpft                           |
| Sort Field / Order | `order_by`                          | z. B. `modified desc`                                        |

Ohne `fields` liefert Frappe nur die Spalte `name` — deshalb sendet der Node standardmäßig `["*"]` und gibt dir das vollständige Dokument.

Filter akzeptieren beide Frappe-Formen — ein Objekt für einfache Gleichheit oder ein Array aus Tripeln für Operatoren:

```json
{ "status": "Open" }
```

```json
[["from_date", ">=", "2026-01-01"], ["status", "!=", "Rejected"]]
```

### Datumswerte

Frappe speichert **naive** Datetimes, interpretiert in der Zeitzone der Site (**Settings > System Settings > Time Zone**). Der Node wandelt Werte mit Zeitzone — was der n8n-Datumsauswähler erzeugt, etwa `2026-08-15T09:00:00+02:00` oder `...Z` — in die **Zeitzone des n8n-Workflows** um und lässt Werte ohne Zeitzone unverändert.

`Date`-Felder werden als `YYYY-MM-DD` gesendet, `Datetime`-Felder als `YYYY-MM-DD HH:mm:ss`. In der Praxis: Halte die Zeitzone des n8n-Workflows und die der Frappe-Site gleich, sonst landet eine um 09:00 erfasste Stempelung zu einer anderen Uhrzeit.

### Fehlerbehandlung

Frappe meldet Fehler in einem Feld `_server_messages`, das JSON *innerhalb* von JSON enthält, oft mit HTML-Markup. Der Node packt das aus und zeigt die eigentliche Meldung: Du bekommst `Value missing for Employee: Date Of Joining` statt `Request failed with status code 417`. Andernfalls greift er auf das Feld `exception` und dann auf den HTTP-Status zurück.

`401`- und `403`-Antworten enthalten einen zusätzlichen Hinweis auf die Frappe-Rolle statt auf das Credential, weil das fast immer die Ursache ist.

## Verwendung

Jedes Beispiel ist ein Node, den du in einen n8n-Workflow einfügen kannst. Ersetze den Block `credentials` durch dein eigenes Credential.

### Link-Felder

Felder, die auf einen anderen Frappe-Datensatz zeigen, sind Auswahlfelder statt Freitext. Zwei
Formen, je nachdem was das Ziel-Doctype enthält:

- **Eine durchsuchbare Liste** für alles, was im Tagesgeschäft wächst — Mitarbeitende, Benutzer,
  Projekte. Gefiltert wird auf Frappe-Seite, 50 Zeilen pro Seite, und die Liste zeigt eine lesbare
  Bezeichnung neben der Kennung: `HR-EMP-00001 — Marie Dupont`. Jedes behält einen Tab **By Name**
  für einen wörtlichen Wert oder einen Ausdruck.
- **Eine Auswahlliste** für die Konfigurations-Doctypes, die eine Administration pflegt —
  Positionen, Urlaubsarten, Währungen. n8n beschriftet sie mit `… Name or ID`.

Ein Auswahlfeld blockiert nie: Lässt sich die Liste nicht lesen, nimmt der manuelle Modus weiterhin
die Kennung an. Ein durchsuchbares Feld wird als `{ "__rl": true, "mode": …, "value": … }`
gespeichert — daher die ausgeschriebene Form in den Beispielen.


### Employee — anlegen

```json
{
	"parameters": {
		"resource": "employee",
		"operation": "create",
		"first_name": "Marie",
		"last_name": "Dupont",
		"gender": "Female",
		"date_of_birth": "1992-04-17",
		"date_of_joining": "2026-09-01",
		"company": "Acme SAS",
		"additionalFields": {
			"company_email": "marie.dupont@acme.io",
			"department": "Engineering - A",
			"designation": "Backend Developer",
			"employment_type": "Full-time",
			"holiday_list": "France 2026",
			"leave_approver": {
				"__rl": true,
				"mode": "name",
				"value": "rh@acme.io"
			},
			"reports_to": {
				"__rl": true,
				"mode": "name",
				"value": "HR-EMP-00002"
			}
		}
	},
	"type": "n8n-nodes-frappe-hrms.frappeHrms",
	"typeVersion": 1,
	"name": "Create Employee",
	"position": [0, 0],
	"credentials": { "frappeApi": { "id": "1", "name": "Frappe account" } }
}
```

`first_name`, `gender`, `date_of_birth`, `date_of_joining` und `company` sind die fünf Felder, die der Doctype als `reqd` deklariert. **Last Name** verlangt der Node ebenfalls, obwohl Frappe es nicht fordert: `employee_name` — die Bezeichnung, die jede Liste und jeder Link zeigt — wird aus den Namensteilen gebildet, sodass ein nur mit Vornamen angelegter Mitarbeitender so beschriftet bleibt, was sich später kaum noch korrigieren lässt. Beim **Update** ist es optional. `employee_name` selbst leitet Frappe ab und wird daher nicht angeboten. `Gender`, `Department`, `Designation` und `Employment Type` sind Links: Der Wert muss der `name` eines existierenden Datensatzes sein.

### Leave Application — anlegen

```json
{
	"parameters": {
		"resource": "leaveApplication",
		"operation": "create",
		"employee": {
			"__rl": true,
			"mode": "name",
			"value": "HR-EMP-00001"
		},
		"leave_type": "Casual Leave",
		"from_date": "2026-08-10",
		"to_date": "2026-08-14",
		"additionalFields": {
			"description": "Sommerurlaub",
			"leave_approver": {
				"__rl": true,
				"mode": "name",
				"value": "rh@acme.io"
			},
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

Der Datensatz entsteht als Entwurf mit Status `Open`. `company` und `department` werden nicht angeboten: Der Doctype markiert sie als read-only mit einem `fetch_from` auf die mitarbeitende Person, Frappe füllt sie selbst.

### Leave Application — genehmigen

```json
{
	"parameters": {
		"resource": "leaveApplication",
		"operation": "approve",
		"documentId": {
			"__rl": true,
			"mode": "name",
			"value": "HR-LAP-2026-00001"
		},
		"approvalOptions": {
			"leave_approver": {
				"__rl": true,
				"mode": "name",
				"value": "rh@acme.io"
			},
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

**Reject** ist derselbe Node mit `"operation": "reject"`: Er setzt den Status auf `Rejected` und reicht genauso ein — in HRMS ist ein abgelehnter Antrag ein eingereichtes Dokument, kein gelöschtes.

Die Ausgabe ist das vollständige eingereichte Dokument samt `docstatus`, sodass ein nachgelagerter Node darauf verzweigen kann.

### Attendance — anlegen

```json
{
	"parameters": {
		"resource": "attendance",
		"operation": "create",
		"employee": {
			"__rl": true,
			"mode": "name",
			"value": "HR-EMP-00001"
		},
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

`in_time` und `out_time` sind Datetime-Felder; `attendance_date` ist ein Date-Feld und wird auf den Tag gekürzt. Der Datensatz entsteht als Entwurf — reiche ihn in Frappe ein, damit er in den Anwesenheitsberichten zählt.

### Expense Claim — anlegen

```json
{
	"parameters": {
		"resource": "expenseClaim",
		"operation": "create",
		"employee": {
			"__rl": true,
			"mode": "name",
			"value": "HR-EMP-00001"
		},
		"expenses": {
			"expense": [
				{
					"expense_date": "2026-07-21",
					"expense_type": "Travel",
					"description": "Zug Paris–Lyon, Kick-off beim Kunden",
					"amount": 128.4
				},
				{
					"expense_date": "2026-07-21",
					"expense_type": "Food",
					"description": "Mittagessen mit dem Kunden",
					"amount": 46
				}
			]
		},
		"additionalFields": {
			"expense_approver": {
				"__rl": true,
				"mode": "name",
				"value": "rh@acme.io"
			},
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

Mindestens eine Zeile ist Pflicht: `expenses` ist eine `reqd`-Child-Table (`Expense Claim Detail`), und jede Zeile braucht `expense_type` und `amount`. Bei **Update** *ersetzen* die übergebenen Zeilen die bestehende Tabelle; lass die Collection leer, um sie unangetastet zu lassen.

### Salary Slip — get many

Alle eingereichten Abrechnungen einer Abrechnungsperiode, nach Person sortiert:

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

`docstatus = 1` filtert Entwürfe heraus, was beim Payroll-Export fast immer gewünscht ist.

### Job Opening — anlegen

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

`description` ist ein Frappe-Text-Editor-Feld und akzeptiert HTML. `location` ist trotz des Namens ein Link auf `Branch`.

### Job Applicant — anlegen

```json
{
	"parameters": {
		"resource": "jobApplicant",
		"operation": "create",
		"applicant_name": "Jean Martin",
		"email_id": "jean.martin@email.com",
		"additionalFields": {
			"phone_number": "+33 6 12 34 56 78",
			"job_title": {
				"__rl": true,
				"mode": "name",
				"value": "HR-OPN-2026-0001"
			},
			"designation": "Backend Developer",
			"country": {
				"__rl": true,
				"mode": "name",
				"value": "France"
			},
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

Achtung bei `job_title`: Auf `Job Applicant` ist dieses Feld ein **Link auf `Job Opening`**, kein Freitext. Deshalb beschriftet der Node es als **Job Opening** und bietet eine durchsuchbare Liste der Ausschreibungen an — gespeichert wird der `name` (`HR-OPN-2026-0001`), nicht der Titel.

### Job Offer — anlegen

```json
{
	"parameters": {
		"resource": "jobOffer",
		"operation": "create",
		"job_applicant": {
			"__rl": true,
			"mode": "name",
			"value": "HR-APP-2026-00001"
		},
		"offer_date": "2026-08-05",
		"designation": "Backend Developer",
		"company": "Acme SAS",
		"additionalFields": {
			"status": "Awaiting Response",
			"terms": "<p>Grundgehalt 62 000 € brutto, Eintritt zum 2026-10-01.</p>"
		}
	},
	"type": "n8n-nodes-frappe-hrms.frappeHrms",
	"typeVersion": 1,
	"name": "Send Job Offer",
	"position": [0, 0],
	"credentials": { "frappeApi": { "id": "1", "name": "Frappe account" } }
}
```

`applicant_name` ist im Doctype Pflicht, trägt aber ein `fetch_from` auf die Bewerbung — Frappe füllt es, der Node fragt es nicht ab.

### Delete

Jede schreibbare Ressource anhand ihrer Document ID:

```json
{
	"parameters": {
		"resource": "jobOpening",
		"operation": "delete",
		"documentId": {
			"__rl": true,
			"mode": "name",
			"value": "HR-OPN-2026-0001"
		}
	},
	"type": "n8n-nodes-frappe-hrms.frappeHrms",
	"typeVersion": 1,
	"name": "Delete Job Opening",
	"position": [0, 0],
	"credentials": { "frappeApi": { "id": "1", "name": "Frappe account" } }
}
```

Der Node gibt `{ "success": true, "doctype": "Job Opening", "name": "HR-OPN-2026-0001" }` aus. Frappe weigert sich, ein eingereichtes Dokument zu löschen — ebenso jedes Dokument, auf das ein anderer Datensatz verweist. Storniere es zuerst.

## Kompatibilität

Getestet mit n8n 1.x und 2.x, auf Frappe Framework v15 und v16 mit Frappe HR (`hrms`) und ERPNext. Der Node nutzt nur die Standard-REST-Endpunkte `/api/resource` sowie `frappe.client.submit` und sollte daher mit jeder Frappe-HR-Version funktionieren, die die oben genannten Doctype-Namen beibehält.

Zwei Neuerungen der v16 deckt der Node ohne Zutun ab:

- Der Desk ist von `/app` nach `/desk` umgezogen, und seine URL enthält jetzt den Arbeitsbereich (`/desk/hrms`): Beide Formen werden im Feld **Site URL** akzeptiert.
- `Expense Claim` hat die Pflichtfelder `currency` und `exchange_rate` bekommen. Frappe holt die Währung vom Mitarbeiter, und der Node sendet den Kurs 1, wenn das Feld leer bleibt — korrekt, solange die Abrechnung in der Unternehmenswährung erfolgt. Für jede andere Währung **Exchange Rate** setzen.

ERPNext ist erforderlich: `hrms/hooks.py` deklariert es als `required_apps`, und der Doctype `Employee` stammt daraus.

## Ressourcen

- [n8n-Dokumentation zu Community-Nodes](https://docs.n8n.io/integrations/#community-nodes)
- [Dokumentation der Frappe-REST-API](https://docs.frappe.io/framework/user/en/api/rest)
- [Frappe-HR-Dokumentation](https://docs.frappe.io/hr)
- [Frappe-HR-Quellcode](https://github.com/frappe/hrms)
- [Architektur des gemeinsamen Credentials](docs/CREDENTIALS.md)

## Versionsverlauf

### 0.1.0

Erste Version. Frappe-HR-Node mit den Ressourcen Employee, Leave Application, Attendance, Expense Claim, Salary Slip, Job Opening, Job Applicant und Job Offer, dem Approve/Reject-Urlaubsworkflow und dem gemeinsamen Credential `frappeApi`.

## Entwicklung

```bash
npm install
npm run build     # kompiliert nach dist/ und kopiert die Icons
npm run dev       # Entwicklungsschleife gegen ein lokales n8n
npm run lint      # derselbe Befehl wie in der CI
npm run lint:fix
```

In diesem Repository gibt es keinen Test-Runner. Prüfe Änderungen mit `npm run build` und einem echten Laden in n8n.

Siehe [AGENTS.md](AGENTS.md) für den vollständigen Contributor-Guide.
