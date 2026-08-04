# CLAUDE.md

All guidance for agents working in this repository lives in [AGENTS.md](AGENTS.md).
Read it before making any change — it is the single source of truth, and this file
is only a pointer to it.

Note: `AGENTS.md` is written in French (the project's working language). Keep it that
way when updating it, and keep this file as a pointer only — do not duplicate its
content here, or the two will drift apart.

Quick orientation, in `AGENTS.md`:

- **Project state** — the package ships one node, `Frappe HRMS`, driving
  [Frappe HR](https://github.com/frappe/hrms) (the `hrms` app) over Frappe's generic REST
  API. It belongs to a family of sibling npm packages that share the same `frappeApi`
  credential and the same transport layer, each in its own copy — an import never crosses
  an npm package boundary.
- **Frappe specifics** — the section to read before touching the node: `Employee` belongs
  to **ERPNext**, not HRMS; five doctypes are submittable, so `POST /api/resource` only
  creates a draft; `Leave Application.status` sits at permlevel 1; `fetch_from` fields must
  not be exposed; every new date field has to be added to `DATE_FIELDS` / `DATETIME_FIELDS`
  or Frappe rejects it; and some `reqd` fields are only filled by a Desk client script,
  which is why `Expense Claim.exchange_rate` is forced to 1 on v16.
- **Frappe versions** — one codebase targets v15 **and** v16. The Desk moved from `/app`
  to `/desk` (with the workspace in the URL), which only `normalizeSiteUrl()` cares about;
  v16 adds a mandatory `currency` and `exchange_rate` on `Expense Claim`; and do not migrate
  to `/api/v2` — it exists on 15 too, but does not behave the same there, so one transport
  for both versions means staying on v1.
- **Structure** — where nodes, credentials and icons live, and why `package.json` →
  `n8n.nodes` / `n8n.credentials` must be updated alongside any node rename.
- **Commands** — `npm run build` / `lint` / `dev` / `release`. There are no tests
  and no test runner; do not invent `npm test`.
- **Conventions** — Prettier and ESLint setup, TypeScript strictness, and the n8n lint
  rules on alphabetical ordering and `description` punctuation, which are real platform
  constraints rather than style preferences.
- **n8n patterns** — authenticated HTTP helpers, `pairedItem`, `continueOnFail`,
  `NodeOperationError`.
- **Docs and publishing** — the four translated READMEs, and tag-triggered npm
  publishing with provenance.
