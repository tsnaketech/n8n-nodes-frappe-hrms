# n8n-nodes-frappe-hrms

Package de nœuds communautaires n8n pour [Frappe HR](https://frappe.io/hr) (l'application `hrms`, aussi appelée Frappe HRMS). Il permet de lire et d'écrire employés, demandes de congé, pointages, notes de frais, bulletins de paie et tout le pipeline de recrutement depuis vos workflows n8n.

[n8n](https://n8n.io/) est une plateforme d'automatisation de workflows sous [licence fair-code](https://docs.n8n.io/reference/license/).

Autres langues : [English](README.md) · [Español](README.es.md) · [Deutsch](README.de.md)

[Installation](#installation)
[Credentials](#credentials)
[Opérations](#opérations)
[Utilisation](#utilisation)
[Compatibilité](#compatibilité)
[Ressources](#ressources)
[Historique des versions](#historique-des-versions)
[Développement](#développement)

## Installation

Suivez le [guide d'installation](https://docs.n8n.io/integrations/community-nodes/installation/) de la documentation n8n sur les nœuds communautaires, avec `n8n-nodes-frappe-hrms` comme nom de package.

**Auto-hébergé, via l'interface n8n** — allez dans **Settings > Community nodes > Install**, saisissez `n8n-nodes-frappe-hrms` et validez.

**Auto-hébergé, manuellement :**

```bash
cd ~/.n8n/custom
npm install n8n-nodes-frappe-hrms
```

Redémarrez n8n, puis cherchez « Frappe HRMS » dans le panneau des nœuds.

## Credentials

Ce package utilise un seul type de credential, **Frappe API** (`frappeApi`) — le *même* type que les nœuds Frappe CRM et Frappe Helpdesk. S'il est déjà configuré, le nœud Frappe HRMS peut le sélectionner directement.

### Générer les clés API dans Frappe

1. Sur votre site Frappe, ouvrez l'utilisateur au nom duquel n8n doit agir (`/desk/user` en v16, `/app/user` jusqu'en v15).
2. Descendez jusqu'à **Settings > API Access** et cliquez sur **Generate Keys**.
3. Copiez l'**API Secret** — affiché une seule fois — et l'**API Key** visible sur la fiche utilisateur.

Le nœud agit en tant que cet utilisateur : il hérite de ses rôles et permissions. Si un appel échoue sur une erreur de permission, regardez les rôles sur le doctype avant de suspecter le credential.

### Remplir le credential

| Champ      | Exemple                         | Remarques                                                          |
| ---------- | ------------------------------- | ------------------------------------------------------------------ |
| Site URL   | `https://mon-site.frappe.cloud` | Racine du site. Un chemin d'application final (`/desk/hrms`, `/app`, `/hrms`, `/crm`…) et le `/` final sont retirés automatiquement |
| API Key    | `a1b2c3d4e5f6g7h`               |                                                                    |
| API Secret | `s1e2c3r4e5t6`                  | Stocké chiffré par n8n                                             |

Les requêtes sont authentifiées par le header `Authorization: token {apiKey}:{apiSecret}`. Le bouton **Test** valide la connexion : il appelle `/api/method/frappe.auth.get_logged_user` et échoue si le site répond en tant que `Guest`, ce que Frappe renvoie quand les clés ne sont pas reconnues.

### Un seul credential pour tous les nœuds Frappe

`frappeApi` n'a volontairement **rien** de spécifique aux RH. Frappe authentifie un *utilisateur sur un site*, pas une application : la même clé API vaut pour Frappe HR, Frappe CRM, Frappe Helpdesk et Frappe LMS, qui vivent sur le même site et partagent le même endpoint `/api`.

Créez une instance par *site* (« Frappe – prod », « Frappe – recette »), pas une par application. Voir [docs/CREDENTIALS.md](docs/CREDENTIALS.md) pour l'architecture complète, la liste des nœuds consommateurs et les rôles Frappe requis par chaque opération.

## Opérations

| Resource          | Doctype Frappe      | Opérations                                                    |
| ----------------- | ------------------- | ------------------------------------------------------------- |
| Employee          | `Employee`          | Create, Get, Get Many, Update, Delete                          |
| Leave Application | `Leave Application` | Create, Get, Get Many, Update, Delete, **Approve**, **Reject** |
| Attendance        | `Attendance`        | Create, Get, Get Many, Update, Delete                          |
| Expense Claim     | `Expense Claim`     | Create, Get, Get Many, Update, Delete                          |
| Salary Slip       | `Salary Slip`       | Get, Get Many — lecture seule                                  |
| Job Opening       | `Job Opening`       | Create, Get, Get Many, Update, Delete                          |
| Job Applicant     | `Job Applicant`     | Create, Get, Get Many, Update, Delete                          |
| Job Offer         | `Job Offer`         | Create, Get, Get Many, Update, Delete                          |

Toutes les opérations passent par l'API REST standard de Frappe sur `/api/resource/{doctype}` en `GET`, `POST`, `PUT` et `DELETE`. Seule exception : **Approve / Reject**, qui appelle en plus `/api/method/frappe.client.submit` — voir plus bas.

Les noms de doctype ont été vérifiés sur [github.com/frappe/hrms](https://github.com/frappe/hrms) (`hrms/hr/doctype/`, `hrms/payroll/doctype/`) et [github.com/frappe/erpnext](https://github.com/frappe/erpnext).

> **Pourquoi `Employee` n'est-il pas dans l'app `hrms` ?**
> Parce qu'il n'y est pas. `Employee` vit dans ERPNext (`erpnext/setup/doctype/employee`), et `hrms/hooks.py` déclare `required_apps = ["frappe/erpnext"]` — Frappe HR étend le doctype au lieu de le posséder, via un `override_doctype_class` et une série de custom fields ajoutés par `hrms/setup.py`.
>
> Conséquence pratique : `/api/resource/Employee` fonctionne sur n'importe quel site ERPNext, mais les champs **Employment Type**, **Grade**, **Default Shift**, **Leave Approver** et **Expense Approver** exposés par ce nœud n'existent qu'une fois Frappe HR installé.

> **Salary Slip est en lecture seule, volontairement.**
> Les bulletins sont produits par le run de paie (`Payroll Entry`), qui calcule chaque ligne de gain, de retenue et de taxe à partir de la structure salariale. En créer un via REST reviendrait soit à le voir écrasé au run suivant, soit à produire un document incohérent avec ses propres tables enfants. Le nœud n'expose que Get et Get Many.

### Doctypes soumettables et `docstatus`

`Leave Application`, `Attendance`, `Expense Claim`, `Job Offer` et `Salary Slip` sont **submittable** dans Frappe : ils portent un `docstatus` valant `0` (brouillon), `1` (soumis) ou `2` (annulé).

**Create laisse le document en brouillon** (`docstatus: 0`). C'est le comportement REST de Frappe, pas une limite du nœud : `POST /api/resource/{doctype}` insère, il ne soumet pas. Un pointage ne compte dans les rapports qu'une fois soumis : le brouillon est donc une étape, rarement un état final.

Pour Leave Application, les opérations **Approve** et **Reject** font la soumission pour vous. Pour les autres doctypes, soumettez depuis l'interface Frappe, ou ajoutez un second nœud appelant `frappe.client.submit` via le nœud HTTP Request.

Frappe refuse par ailleurs de modifier un document soumis : **Update** sur un enregistrement en `docstatus: 1` échoue pour tout champ non marqué `allow_on_submit`. Il faut l'annuler puis l'amender dans Frappe.

### Approuver / refuser une demande de congé

`Leave Application.status` est un champ `Select` (`Open`, `Approved`, `Rejected`, `Cancelled`) déclaré en **permlevel 1** : l'écrire demande un rôle habilité au permlevel 1, typiquement `Leave Approver` ou `HR Manager`. En plus de cela, HRMS refuse de soumettre une demande dont le statut est encore `Open`.

Le nœud fait donc, dans l'ordre :

1. `GET` du document, pour lire son `docstatus` courant ;
2. refus explicite s'il est déjà soumis ou annulé — Frappe les fige, et la sortie est Cancel + Amend, pas un échec silencieux ;
3. passage de `status` à `Approved` ou `Rejected` (et de `leave_approver`, si vous en fournissez un) ;
4. `POST /api/method/frappe.client.submit` avec le document obtenu, qui enregistre *et* soumet en un aller-retour.

L'option **Submit** (active par défaut) pilote l'étape 4. Désactivez-la pour laisser la demande en brouillon avec son nouveau statut — utile quand une étape ultérieure du workflow se charge de soumettre.

### Options de Get Many

| Option             | Correspond à                      | Remarques                                                         |
| ------------------ | --------------------------------- | ----------------------------------------------------------------- |
| Return All         | pagination auto sur `limit_start` | Récupère 100 enregistrements par requête jusqu'à la dernière page |
| Limit              | `limit_page_length`               | Utilisé quand Return All est désactivé                            |
| Offset             | `limit_start`                     | Ignoré quand Return All est actif                                 |
| Fields             | `fields`                          | Séparés par des virgules, ou tableau JSON. Vaut `["*"]` par défaut |
| Filters (JSON)     | `filters`                         | Syntaxe de filtres Frappe                                         |
| Or Filters (JSON)  | `or_filters`                      | Même syntaxe, combinée en OU                                      |
| Sort Field / Order | `order_by`                        | par ex. `modified desc`                                           |

Sans `fields`, Frappe ne renvoie que la colonne `name` : le nœud envoie donc `["*"]` par défaut pour vous rendre le document complet.

Les filtres acceptent les deux formes Frappe — un objet pour l'égalité simple, un tableau de triplets pour les opérateurs :

```json
{ "status": "Open" }
```

```json
[["from_date", ">=", "2026-01-01"], ["status", "!=", "Rejected"]]
```

### Dates

Frappe stocke des datetimes **naïfs**, interprétés dans le fuseau du site (**Settings > System Settings > Time Zone**). Le nœud convertit les valeurs porteuses d'un fuseau — ce que produit le sélecteur de date n8n, par ex. `2026-08-15T09:00:00+02:00` ou `...Z` — vers le **fuseau du workflow n8n**, et laisse intactes celles qui n'en portent pas.

Les champs `Date` sont envoyés en `YYYY-MM-DD`, les `Datetime` en `YYYY-MM-DD HH:mm:ss`. En pratique : gardez le fuseau du workflow n8n et celui du site Frappe identiques, sinon un pointage saisi à 09:00 atterrira à une autre heure.

### Gestion des erreurs

Frappe rapporte ses erreurs dans un champ `_server_messages` qui contient du JSON encodé *dans* du JSON, souvent avec du balisage HTML. Le nœud le déballe et remonte le vrai message : vous obtenez `Value missing for Employee: Date Of Joining` plutôt que `Request failed with status code 417`. Il retombe sur le champ `exception`, puis sur le statut HTTP.

Les réponses `401` et `403` sont accompagnées d'une indication pointant vers le rôle Frappe plutôt que vers le credential, parce que c'est presque toujours la cause.

## Utilisation

Chaque exemple ci-dessous est un nœud à coller dans un workflow n8n. Remplacez le bloc `credentials` par le vôtre.

### Employee — création

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

`first_name`, `gender`, `date_of_birth`, `date_of_joining` et `company` sont les cinq champs que le doctype déclare `reqd`. `employee_name` est dérivé par Frappe des composantes du nom : il n'est donc pas exposé. `Gender`, `Department`, `Designation` et `Employment Type` sont des Link : la valeur doit être le `name` d'un enregistrement existant.

### Leave Application — création

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
			"description": "Congés d'été",
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

L'enregistrement est créé en brouillon, avec le statut `Open`. `company` et `department` ne sont pas exposés : le doctype les marque read-only avec un `fetch_from` sur l'employé, Frappe les remplit lui-même.

### Leave Application — approbation

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

**Reject** est le même nœud avec `"operation": "reject"` : il passe le statut à `Rejected` et soumet à l'identique — dans HRMS, une demande refusée est un document soumis, pas un document supprimé.

La sortie est le document soumis complet, `docstatus` inclus, ce qui permet à un nœud aval de brancher dessus.

### Attendance — création

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

`in_time` et `out_time` sont des champs Datetime ; `attendance_date` est un champ Date, tronqué au jour. L'enregistrement est créé en brouillon — soumettez-le dans Frappe pour qu'il compte dans les rapports de présence.

### Expense Claim — création

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
					"description": "Train Paris–Lyon, kick-off client",
					"amount": 128.4
				},
				{
					"expense_date": "2026-07-21",
					"expense_type": "Food",
					"description": "Déjeuner avec le client",
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

Au moins une ligne est obligatoire : `expenses` est une table enfant `reqd` (`Expense Claim Detail`), et chaque ligne demande `expense_type` et `amount`. Sur **Update**, les lignes fournies *remplacent* la table existante ; laissez la collection vide pour ne pas y toucher.

### Salary Slip — get many

Tous les bulletins soumis d'une période de paie, triés par employé :

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

`docstatus = 1` écarte les brouillons, ce qui est presque toujours ce qu'on veut pour un export de paie.

### Job Opening — création

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

`description` est un champ Text Editor de Frappe : il accepte du HTML. `location` est un Link vers `Branch`, malgré son nom.

### Job Applicant — création

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

Attention à `job_title` : sur `Job Applicant`, ce champ est un **Link vers `Job Opening`**, pas du texte libre. Le nœud l'affiche sous le libellé **Job Opening** pour cette raison. Donnez-lui le `name` de l'offre (`HR-OPN-2026-0001`), pas son intitulé.

### Job Offer — création

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
			"terms": "<p>Salaire de base 62 000 € brut, entrée le 2026-10-01.</p>"
		}
	},
	"type": "n8n-nodes-frappe-hrms.frappeHrms",
	"typeVersion": 1,
	"name": "Send Job Offer",
	"position": [0, 0],
	"credentials": { "frappeApi": { "id": "1", "name": "Frappe account" } }
}
```

`applicant_name` est requis par le doctype mais porte un `fetch_from` sur le candidat : Frappe le remplit, le nœud ne le demande donc pas.

### Delete

N'importe quelle resource en écriture, à partir de son document ID :

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

Le nœud renvoie `{ "success": true, "doctype": "Job Opening", "name": "HR-OPN-2026-0001" }`. Frappe refuse de supprimer un document soumis, ainsi que tout document lié depuis un autre enregistrement — annulez-le d'abord.

## Compatibilité

Testé avec n8n 1.x et 2.x, sur Frappe Framework v15 et v16 avec Frappe HR (`hrms`) et ERPNext. Le nœud n'utilise que les endpoints REST standard `/api/resource` plus `frappe.client.submit` : il devrait fonctionner avec toute version de Frappe HR conservant les noms de doctype listés ci-dessus.

Deux différences apportées par la v16 sont prises en charge par le nœud, sans réglage de votre part :

- le Desk est passé de `/app` à `/desk`, et son URL porte désormais l'espace de travail (`/desk/hrms`) : les deux formes sont acceptées dans le champ **Site URL** ;
- `Expense Claim` a gagné les champs obligatoires `currency` et `exchange_rate`. Frappe récupère la devise depuis l'employé, et le nœud envoie un taux de 1 quand le champ est laissé vide — correct tant que la note de frais est dans la devise de la société. Pour une autre devise, renseignez **Exchange Rate**.

ERPNext est requis : `hrms/hooks.py` le déclare en `required_apps`, et le doctype `Employee` en provient.

## Ressources

- [Documentation n8n sur les nœuds communautaires](https://docs.n8n.io/integrations/#community-nodes)
- [Documentation de l'API REST Frappe](https://docs.frappe.io/framework/user/en/api/rest)
- [Documentation Frappe HR](https://docs.frappe.io/hr)
- [Sources de Frappe HR](https://github.com/frappe/hrms)
- [Architecture du credential partagé](docs/CREDENTIALS.md)

## Historique des versions

### 0.1.0

Version initiale. Nœud Frappe HRMS avec les resources Employee, Leave Application, Attendance, Expense Claim, Salary Slip, Job Opening, Job Applicant et Job Offer, le workflow Approve/Reject des congés, et le credential partagé `frappeApi`.

## Développement

```bash
npm install
npm run build     # compile vers dist/ et copie les icônes
npm run dev       # boucle de développement contre un n8n local
npm run lint      # même commande que la CI
npm run lint:fix
```

Il n'y a pas de runner de test dans ce dépôt. Vérifiez vos changements avec `npm run build` puis un chargement réel dans n8n.

Voir [AGENTS.md](AGENTS.md) pour le guide complet des contributeurs.
