# n8n-nodes-frappe-hrms

This is an n8n community node package for [Frappe HR](https://frappe.io/hr) (the `hrms` app, also known as Frappe HRMS). It lets you read and write employees, leave applications, attendance records, expense claims, salary slips and the whole recruitment pipeline from your n8n workflows.

[n8n](https://n8n.io/) is a [fair-code licensed](https://docs.n8n.io/reference/license/) workflow automation platform.

Other languages: [Français](README.fr.md) · [Español](README.es.md) · [Deutsch](README.de.md)

[Installation](#installation)
[Credentials](#credentials)
[Operations](#operations)
[Usage](#usage)
[Compatibility](#compatibility)
[Resources](#resources)
[Version history](#version-history)
[Development](#development)

## Installation

Follow the [installation guide](https://docs.n8n.io/integrations/community-nodes/installation/) in the n8n community nodes documentation, using `n8n-nodes-frappe-hrms` as the package name.

**Self-hosted, via the n8n UI** — go to **Settings > Community nodes > Install**, enter `n8n-nodes-frappe-hrms` and confirm.

**Self-hosted, manually:**

```bash
cd ~/.n8n/custom
npm install n8n-nodes-frappe-hrms
```

Restart n8n, then search for "Frappe HRMS" in the node panel.

## Credentials

This package uses a single credential type, **Frappe API** (`frappeApi`) — the *same* credential type as the Frappe CRM and Frappe Helpdesk nodes. If you already have it configured, the Frappe HRMS node can select it directly.

### Generating API keys in Frappe

1. In your Frappe site, open the user you want n8n to act as (`/desk/user` on v16, `/app/user` up to v15).
2. Scroll to **Settings > API Access** and click **Generate Keys**.
3. Copy the **API Secret** — it is shown only once — and the **API Key** displayed on the user document.

The n8n node acts as that user, so it inherits that user's roles and permissions. If a call fails with a permission error, check the roles on the doctype rather than the credential.

### Filling in the credential

| Field      | Example                        | Notes                                                       |
| ---------- | ------------------------------ | ----------------------------------------------------------- |
| Site URL   | `https://my-site.frappe.cloud` | Site root. A trailing application path (`/desk/hrms`, `/app`, `/hrms`, `/crm`…) and the trailing `/` are stripped automatically |
| API Key    | `a1b2c3d4e5f6g7h`              |                                                             |
| API Secret | `s1e2c3r4e5t6`                 | Stored encrypted by n8n                                     |

Requests are authenticated with the header `Authorization: token {apiKey}:{apiSecret}`. Use **Test** to validate the connection — it calls `/api/method/frappe.auth.get_logged_user` and fails if the site answers as `Guest`, which is what Frappe returns when the keys are not recognised.

### One credential for every Frappe node

`frappeApi` is deliberately **not** HR-specific. Frappe authenticates a *user on a site*, not an application: the same API key works for Frappe HR, Frappe CRM, Frappe Helpdesk and Frappe LMS, which all live on the same site and share the same `/api` endpoint.

Create one credential per *site* (`Frappe – prod`, `Frappe – staging`), not per application. See [docs/CREDENTIALS.md](docs/CREDENTIALS.md) for the full architecture, the list of consuming nodes, and the Frappe roles each operation needs.

## Operations

| Resource          | Frappe doctype      | Operations                                                    |
| ----------------- | ------------------- | ------------------------------------------------------------- |
| Employee          | `Employee`          | Create, Get, Get Many, Update, Delete                          |
| Leave Application | `Leave Application` | Create, Get, Get Many, Update, Delete, **Approve**, **Reject** |
| Attendance        | `Attendance`        | Create, Get, Get Many, Update, Delete                          |
| Expense Claim     | `Expense Claim`     | Create, Get, Get Many, Update, Delete                          |
| Salary Slip       | `Salary Slip`       | Get, Get Many — read-only                                      |
| Job Opening       | `Job Opening`       | Create, Get, Get Many, Update, Delete                          |
| Job Applicant     | `Job Applicant`     | Create, Get, Get Many, Update, Delete                          |
| Job Offer         | `Job Offer`         | Create, Get, Get Many, Update, Delete                          |

All operations go through the standard Frappe REST API at `/api/resource/{doctype}` using `GET`, `POST`, `PUT` and `DELETE`. The only exception is **Approve / Reject**, which additionally calls `/api/method/frappe.client.submit` — see below.

Doctype names were verified against [github.com/frappe/hrms](https://github.com/frappe/hrms) (`hrms/hr/doctype/`, `hrms/payroll/doctype/`) and [github.com/frappe/erpnext](https://github.com/frappe/erpnext).

> **Why is `Employee` not in the `hrms` app?**
> It is not. `Employee` lives in ERPNext (`erpnext/setup/doctype/employee`), and `hrms/hooks.py` declares `required_apps = ["frappe/erpnext"]` — Frappe HR extends the doctype rather than owning it, through an `override_doctype_class` and a set of custom fields added by `hrms/setup.py`.
>
> Practical consequence: `/api/resource/Employee` works on any ERPNext site, but the **Employment Type**, **Grade**, **Default Shift**, **Leave Approver** and **Expense Approver** fields exposed by this node only exist once Frappe HR is installed.

> **Salary Slip is read-only, on purpose.**
> Salary slips are produced by the payroll run (`Payroll Entry`), which computes every earning, deduction and tax line from the salary structure. Creating one over REST would either be overwritten by the next run or produce a document inconsistent with its own child tables. The node exposes Get and Get Many only.

### Submittable doctypes and `docstatus`

`Leave Application`, `Attendance`, `Expense Claim`, `Job Offer` and `Salary Slip` are **submittable** in Frappe: they carry a `docstatus` of `0` (draft), `1` (submitted) or `2` (cancelled).

**Create leaves the document as a draft** (`docstatus: 0`). That is Frappe's own REST behaviour, not a limitation of the node: `POST /api/resource/{doctype}` inserts, it does not submit. An attendance record only counts towards reports once submitted, so a draft is usually a step, not an end state.

For Leave Application, the **Approve** and **Reject** operations perform the submission for you. For the other doctypes, submit from the Frappe UI, or add a second node calling `frappe.client.submit` through the HTTP Request node.

Frappe also refuses to edit a submitted document: **Update** on a `docstatus: 1` record fails for any field not flagged `allow_on_submit`. Cancel and amend in Frappe if you need to change one.

### Approve / Reject a leave application

`Leave Application.status` is a `Select` field (`Open`, `Approved`, `Rejected`, `Cancelled`) declared at **permlevel 1** — writing it requires a role with permlevel 1 access, typically `Leave Approver` or `HR Manager`. On top of that, HRMS refuses to submit an application whose status is still `Open`.

The node therefore does, in order:

1. `GET` the document, to read its current `docstatus`;
2. refuse loudly if it is already submitted or cancelled — Frappe freezes those, and the fix is Cancel + Amend, not a silent failure;
3. set `status` to `Approved` or `Rejected` (plus `leave_approver`, if you supplied one);
4. `POST /api/method/frappe.client.submit` with the resulting document, which saves *and* submits in one round trip.

The **Submit** option (on by default) controls step 4. Turn it off to leave the application as a draft carrying the new status — useful when a later stage of your workflow does the submitting.

### Get Many options

| Option             | Maps to                      | Notes                                               |
| ------------------ | ---------------------------- | --------------------------------------------------- |
| Return All         | auto-paginates `limit_start` | Fetches 100 records per request until the last page |
| Limit              | `limit_page_length`          | Used when Return All is off                         |
| Offset             | `limit_start`                | Ignored when Return All is on                       |
| Fields             | `fields`                     | Comma-separated or a JSON array. Defaults to `["*"]` |
| Filters (JSON)     | `filters`                    | Frappe filter syntax                                |
| Or Filters (JSON)  | `or_filters`                 | Same syntax, combined with OR                       |
| Sort Field / Order | `order_by`                   | e.g. `modified desc`                                |

Frappe returns only the `name` column when `fields` is not specified, so the node defaults to `["*"]` to give you the full document.

Filters accept both Frappe forms — an object for simple equality, or an array of triples for operators:

```json
{ "status": "Open" }
```

```json
[["from_date", ">=", "2026-01-01"], ["status", "!=", "Rejected"]]
```

### Dates

Frappe stores **naive** datetimes, interpreted in the site's timezone (**Settings > System Settings > Time Zone**). The node converts values that carry a timezone — what the n8n date picker produces, such as `2026-08-15T09:00:00+02:00` or `...Z` — into the **n8n workflow timezone**, and passes values that already have no timezone through unchanged.

`Date` fields are sent as `YYYY-MM-DD`, `Datetime` fields as `YYYY-MM-DD HH:mm:ss`. In practice: keep your n8n workflow timezone and your Frappe site timezone the same, or a check-in recorded at 09:00 will land at a different hour.

### Error handling

Frappe reports errors in a `_server_messages` field that contains JSON encoded *inside* JSON, often with HTML markup. The node unwraps it and surfaces the actual message — you get `Value missing for Employee: Date Of Joining` rather than `Request failed with status code 417`. It falls back to the `exception` field, then to the HTTP status.

`401` and `403` responses carry an extra hint pointing at the Frappe role rather than the credential, because that is nearly always the cause.

## Usage

Each example below is a node you can paste into an n8n workflow. Replace the `credentials` block with your own credential.

### Employee — create

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

`first_name`, `gender`, `date_of_birth`, `date_of_joining` and `company` are the five fields the doctype declares `reqd`. `employee_name` is derived by Frappe from the name parts, so it is not exposed. `Gender`, `Department`, `Designation` and `Employment Type` are Links: the value must be the `name` of an existing record.

### Leave Application — create

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

The record is created as a draft with status `Open`. `company` and `department` are not exposed: the doctype marks them read-only with a `fetch_from` on the employee, so Frappe fills them in itself.

### Leave Application — approve

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

**Reject** is the same node with `"operation": "reject"`; it sets the status to `Rejected` and submits identically — a rejected application is a submitted document in HRMS, not a deleted one.

The output is the full submitted document, `docstatus` included, so a downstream node can branch on it.

### Attendance — create

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

`in_time` and `out_time` are Datetime fields; `attendance_date` is a Date field and is truncated to the day. The record is created as a draft — submit it in Frappe for it to count in attendance reports.

### Expense Claim — create

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
					"description": "Paris–Lyon train, client kick-off",
					"amount": 128.4
				},
				{
					"expense_date": "2026-07-21",
					"expense_type": "Food",
					"description": "Lunch with the client",
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

At least one expense line is mandatory: `expenses` is a `reqd` child table (`Expense Claim Detail`), and each row needs `expense_type` and `amount`. On **Update**, the lines you provide *replace* the existing table; leave the collection empty to keep it untouched.

### Salary Slip — get many

Every submitted slip for one payroll period, newest first:

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

`docstatus = 1` filters out drafts, which is nearly always what you want when exporting payroll.

### Job Opening — create

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

`description` is a Frappe Text Editor field, so it takes HTML. `location` is a Link to `Branch`, despite its name.

### Job Applicant — create

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

Careful with `job_title`: on `Job Applicant` this field is a **Link to `Job Opening`**, not free text. The node labels it **Job Opening** for that reason. Give it the opening's `name` (`HR-OPN-2026-0001`), not its title.

### Job Offer — create

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
			"terms": "<p>Base salary 62 000 € gross, start on 2026-10-01.</p>"
		}
	},
	"type": "n8n-nodes-frappe-hrms.frappeHrms",
	"typeVersion": 1,
	"name": "Send Job Offer",
	"position": [0, 0],
	"credentials": { "frappeApi": { "id": "1", "name": "Frappe account" } }
}
```

`applicant_name` is required by the doctype but carries a `fetch_from` on the applicant, so Frappe fills it in — the node does not ask for it.

### Delete

Any writable resource, given its document ID:

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

The node outputs `{ "success": true, "doctype": "Job Opening", "name": "HR-OPN-2026-0001" }`. Frappe refuses to delete a submitted document, and any document another record links to — cancel it first.

## Compatibility

Tested against n8n 1.x and 2.x, on Frappe Framework v15 and v16 with Frappe HR (`hrms`) and ERPNext. The node only uses the standard `/api/resource` REST endpoints plus `frappe.client.submit`, so it should work with any Frappe HR version that keeps the doctype names listed above.

Two v16 changes are handled by the node, with nothing to configure on your side:

- the Desk moved from `/app` to `/desk`, and its URL now carries the workspace (`/desk/hrms`): both forms are accepted in the **Site URL** field;
- `Expense Claim` gained the mandatory `currency` and `exchange_rate` fields. Frappe fetches the currency from the employee, and the node sends a rate of 1 when the field is left empty — correct as long as the claim is in the company currency. For any other currency, set **Exchange Rate**.

ERPNext is required: `hrms/hooks.py` declares it as `required_apps`, and the `Employee` doctype comes from it.

## Resources

- [n8n community nodes documentation](https://docs.n8n.io/integrations/#community-nodes)
- [Frappe REST API documentation](https://docs.frappe.io/framework/user/en/api/rest)
- [Frappe HR documentation](https://docs.frappe.io/hr)
- [Frappe HR source](https://github.com/frappe/hrms)
- [Shared credential architecture](docs/CREDENTIALS.md)

## Version history

### 0.1.0

Initial release. Frappe HRMS node with the Employee, Leave Application, Attendance, Expense Claim, Salary Slip, Job Opening, Job Applicant and Job Offer resources, the Approve/Reject leave workflow, and the shared `frappeApi` credential.

## Development

```bash
npm install
npm run build     # compiles to dist/ and copies icons
npm run dev       # development loop against a local n8n
npm run lint      # same command the CI runs
npm run lint:fix
```

There is no test runner in this repository. Verify changes with `npm run build` followed by a real load in n8n.

See [AGENTS.md](AGENTS.md) for the full contributor guide.
