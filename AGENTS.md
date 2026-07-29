# AGENTS.md

Guide pour les agents IA travaillant sur ce dépôt.

## Contexte du projet

Package de nœuds communautaires n8n, écrit en TypeScript, publié sous le nom
`n8n-nodes-frappe-hrms`. Il expose **un nœud**, `Frappe HRMS`, qui pilote
[Frappe HR](https://github.com/frappe/hrms) (l'app `hrms`) via l'API REST générique de
Frappe.

Ce package fait partie d'une famille : `n8n-nodes-frappe-crm` et
`n8n-nodes-frappe-helpdesk` sont livrés, un nœud LMS est prévu. Tous partagent le **même
credential** `frappeApi` et la **même couche transport**, chacun dans sa propre copie —
un import ne franchit pas la frontière d'un package npm. Voir
[docs/CREDENTIALS.md](docs/CREDENTIALS.md) — c'est le document à lire avant de toucher au
credential ou à `GenericFunctions.ts`.

Le dépôt n'est pas initialisé sous git (`git init` reste à faire si besoin).

## Structure

```
nodes/FrappeHrms/FrappeHrms.node.ts        Nœud : description + boucle execute()
nodes/FrappeHrms/GenericFunctions.ts       Transport Frappe (requête, pagination, erreurs)
nodes/FrappeHrms/types.ts                  Mapping resource n8n → doctype Frappe
nodes/FrappeHrms/descriptions/             Une description par resource + CommonDescription
credentials/FrappeApi.credentials.ts       Credential partagé (siteUrl + apiKey + apiSecret)
icons/frappe-hr.svg                        Icône du nœud
icons/frappe.svg, frappe.dark.svg          Icônes du credential (light/dark)
docs/CREDENTIALS.md                        Architecture du credential partagé
.github/workflows/ci.yml                   lint + build sur PR et push sur main
.github/workflows/publish.yml              Publication npm avec provenance sur tag *.*.*
```

`tsconfig.json` compile `credentials/**` et `nodes/**` vers `dist/`. Les chemins déclarés
dans `package.json` → `n8n.nodes` / `n8n.credentials` pointent vers `dist/`, pas vers les
sources : **toute création ou renommage de nœud doit être répercuté dans ces deux tableaux**,
sinon n8n ne charge rien et il n'y a aucune erreur explicite.

## Commandes

```bash
npm install
npm run build        # n8n-node build → dist/ (JS compilé + icônes copiées)
npm run build:watch  # tsc --watch
npm run dev          # n8n-node dev (boucle de dev avec n8n)
npm run lint         # n8n-node lint — même commande que la CI
npm run lint:fix
npm run release      # release interactive : lint, build, bump, tag, push → déclenche publish.yml
```

La CI n'exécute que `npm ci`, `npm run lint`, `npm run build`. Il n'y a **aucun test**
dans le dépôt et aucun runner de test configuré ; ne pas inventer `npm test`. Si un
changement mérite d'être vérifié, le faire via `npm run build` puis un chargement réel
dans n8n (voir README, section « Development »).

`npm run lint` sort en succès avec un warning résiduel,
`icon-prefer-themed-variants` : l'icône du nœud est un fichier unique. C'est délibéré —
le badge Frappe HR porte son propre fond vert et tient le contraste sur les deux thèmes.

## Conventions de code

- Prettier (`.prettierrc.js`) : **tabulations**, largeur 100, guillemets simples, points-virgules,
  virgules finales partout, fins de ligne LF.
- ESLint : config `@n8n/node-cli/eslint`, non personnalisée. Elle impose les règles n8n sur
  le nommage des paramètres, `displayName`, l'ordre **alphabétique** des options et des
  champs de collection, la ponctuation finale des `description` — ces erreurs de lint sont
  des vraies contraintes de la plateforme, ne pas les désactiver avec un commentaire sans
  raison. `npm run lint:fix` en corrige la majorité.
- TypeScript en `strict`, avec `noUnusedLocals` et `noImplicitReturns` : du code mort ou une
  branche sans `return` casse le build.
- Importer les types depuis `n8n-workflow` en `import type`, et les valeurs
  (`NodeConnectionTypes`, `NodeOperationError`) en import normal.
- Les commentaires expliquent **pourquoi**, pas quoi — en particulier les particularités de
  Frappe (champs `fetch_from`, `permlevel`, `docstatus`) qui ne se devinent pas à la lecture.

## Patterns n8n à respecter

- Requêtes HTTP : passer par `frappeApiRequest` / `frappeMethodRequest` de
  `GenericFunctions.ts`, jamais par `fetch`/`axios` directement.
- Boucle sur les items : itérer `this.getInputData()`, renseigner `pairedItem: { item: i }` sur
  chaque sortie, et honorer `this.continueOnFail()` avant de relancer l'erreur.
- Erreurs : `NodeApiError` pour les échecs HTTP (déjà fait par `frappeApiRequest`, qui parse
  `_server_messages`), `NodeOperationError` pour les erreurs de configuration. Ne pas laisser
  remonter une `Error` brute.
- Le nœud expose `usableAsTool: true` (utilisable par les agents IA n8n) — garder les
  `description` et `action` des opérations lisibles, elles servent de doc à l'agent.

## Spécificités Frappe à connaître

- **Doctypes** : les noms exacts sont dans `types.ts`, vérifiés contre
  `github.com/frappe/hrms`. Attention, `Employee` appartient à **ERPNext**
  (`erpnext/setup/doctype/employee`), pas à HRMS — `hrms/hooks.py` déclare
  `required_apps = ["frappe/erpnext"]` et n'ajoute que des custom fields. Vérifier l'app
  d'origine avant d'ajouter une resource : plusieurs modules RH ont migré entre ERPNext et
  HRMS selon les versions.
- **`docstatus`** : `Leave Application`, `Attendance`, `Expense Claim`, `Job Offer` et
  `Salary Slip` sont submittable. `POST /api/resource` crée un brouillon (`docstatus 0`) ;
  soumettre passe par `/api/method/frappe.client.submit`. Un document soumis n'est plus
  modifiable, sauf champs `allow_on_submit`.
- **`permlevel`** : `Leave Application.status` est en permlevel 1. L'écrire demande un rôle
  habilité côté Frappe, pas une option côté n8n.
- **`fetch_from`** : les champs read-only alimentés depuis un autre doctype (le `company` et
  le `department` d'une `Leave Application`, l'`applicant_name` d'un `Job Offer`) ne doivent
  **pas** être exposés — Frappe les écrase de toute façon.
- **Dates** : Frappe stocke des datetimes naïfs dans le fuseau du site. La conversion est
  faite par `normalizeDates()` dans le nœud, à partir des sets `DATE_FIELDS` et
  `DATETIME_FIELDS` — **tout nouveau champ date doit y être ajouté**, sinon il part au
  format ISO et Frappe le rejette ou le décale.

## Documentation

Quatre READMEs traduits (`README.md`, `.fr.md`, `.es.md`, `.de.md`). Un changement visible par
l'utilisateur (nouvelle opération, nouveau credential, prérequis) doit être répercuté dans
**les quatre**, sinon les traductions divergent silencieusement.

`docs/CREDENTIALS.md` est écrit pour toute la famille de nœuds Frappe : y ajouter un nœud
consommateur quand il arrive, et ne jamais y dupliquer le contenu du README.

## Publication

`publish.yml` se déclenche sur un tag `*.*.*` et publie sur npm avec provenance
(exigence n8n depuis mai 2026). Nécessite `@n8n/node-cli` ≥ 0.23.0. Ne pas publier
manuellement (`npm publish`) : cela produit un package sans attestation de provenance,
que n8n refusera.
