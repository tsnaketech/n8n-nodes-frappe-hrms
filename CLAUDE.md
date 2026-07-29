# CLAUDE.md

All guidance for agents working in this repository lives in [AGENTS.md](AGENTS.md).
Read it before making any change — it is the single source of truth, and this file
is only a pointer to it.

Note: `AGENTS.md` is written in French (the project's working language). Keep it that
way when updating it, and keep this file as a pointer only — do not duplicate its
content here, or the two will drift apart.

Quick orientation, in `AGENTS.md`:

- **Project state** — the package is still the unrenamed n8n starter template
  (`n8n-nodes-template`, `ExampleNode`, `ExampleApi`), not working code.
- **Structure** — where nodes, credentials and icons live, and why `package.json` →
  `n8n.nodes` / `n8n.credentials` must be updated alongside any node rename.
- **Commands** — `npm run build` / `lint` / `dev` / `release`. There are no tests
  and no test runner; do not invent `npm test`.
- **Conventions** — Prettier and ESLint setup, TypeScript strictness, and the
  tabs-vs-spaces mismatch between config and existing sources.
- **n8n patterns** — authenticated HTTP helpers, `pairedItem`, `continueOnFail`,
  `NodeOperationError`.
- **Docs and publishing** — the four translated READMEs, and tag-triggered npm
  publishing with provenance.
