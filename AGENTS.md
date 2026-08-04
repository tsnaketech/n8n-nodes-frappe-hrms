# AGENTS.md

Guide pour les agents IA travaillant sur ce dépôt.

## Contexte du projet

Package de nœuds communautaires n8n, écrit en TypeScript, publié sous le nom
`n8n-nodes-frappe-hrms`. Il expose **un nœud**, `Frappe HRMS`, qui pilote
[Frappe HR](https://github.com/frappe/hrms) (l'app `hrms`) via l'API REST générique de
Frappe.

Ce package fait partie d'une famille de sept : le nœud générique `n8n-nodes-frappe` et les
six nœuds applicatifs `n8n-nodes-frappe-crm`, `-helpdesk`, `-hrms`, `-insights`, `-learning`
et `-lending`. Tous partagent le **même credential** `frappeApi` et la **même couche
transport**, chacun dans sa propre copie —
un import ne franchit pas la frontière d'un package npm. Voir
[docs/CREDENTIALS.md](docs/CREDENTIALS.md) — c'est le document à lire avant de toucher au
credential ou à `GenericFunctions.ts`.

Le dépôt est sous git, `origin` pointant sur
`github.com/tsnaketech/n8n-nodes-frappe-hrms`. La CI et la publication npm se déclenchent
depuis GitHub — voir `.github/workflows/`.

## Structure

```
nodes/FrappeHrms/FrappeHrms.node.ts        Nœud : description + boucle execute()
nodes/FrappeHrms/GenericFunctions.ts       Transport Frappe (requête, pagination, erreurs)
nodes/FrappeHrms/types.ts                  Mapping resource n8n → doctype Frappe
nodes/FrappeHrms/descriptions/             Une description par resource + CommonDescription
credentials/FrappeApi.credentials.ts       Credential partagé (siteUrl + apiKey + apiSecret)
icons/frappe-hrms.svg                      Icône du nœud
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

`npm run lint` sort en succès **sans warning**. Le seul qui apparaissait,
`icon-prefer-themed-variants`, est désactivé ligne à ligne dans le nœud, avec sa
justification en commentaire : l'icône est un fichier unique, et c'est délibéré — le badge
Frappe HR porte son propre fond vert (`#06b58b`) et tient le contraste sur les deux thèmes.
La règle vérifie seulement qu'`icon` n'est pas une chaîne littérale, sans jamais comparer
les deux fichiers : la forme `{ light, dark }` pointant deux fois le même chemin la
satisferait sans rien changer à l'écran. Ne pas réactiver la règle sans en discuter.

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
- **Langue.** Deux registres, à ne pas mélanger :
  - _commentaires et noms de symboles_ : **anglais**, sans exception. Le code est publié sur
    npm et lu par des contributeurs qui ne parlent pas français ;
  - _chaînes vues par l'utilisateur_ (`description` des paramètres, messages de
    `NodeOperationError`) : **français**, comme le reste des livrables du projet.

  Trois `description` échappent à cette règle parce qu'ESLint les impose mot pour mot :
  `node-param-description-boolean-without-whether` (tout booléen commence par « Whether »),
  `node-param-description-wrong-for-return-all` et `node-param-description-wrong-for-limit`.
  Ce ne sont pas des oublis de traduction : les traduire casse le lint.

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
- **Champs remplis côté client** : certains champs `reqd` ne sont alimentés que par un
  script client du Desk, jamais par le serveur. Un insert REST échoue alors sur un
  « Value missing », sans que rien ne manque dans l'appel du point de vue de l'utilisateur.
  Cas connu : `Expense Claim.exchange_rate` en v16, que le nœud force à 1 par défaut. Avant
  de conclure qu'un champ est optionnel parce que le formulaire ne le demande pas, lire le
  doctype (`frappe.client.get?doctype=DocType&name=…`) et chercher son script client.

## Versions de Frappe

Le nœud vise Frappe v15 **et** v16 avec un seul code. Les écarts à connaître :

- **Desk** : `/app` en v15, `/desk` en v16, avec l'espace de travail dans l'URL
  (`/desk/hrms`). Seul `normalizeSiteUrl()` s'en préoccupe, pour accepter l'URL que
  l'utilisateur voit dans son navigateur. Aucun appel du nœud ne dépend du Desk : l'API vit
  à la racine du site, sur `/api`, dans les deux versions.
- **`Expense Claim`** : v16 y ajoute `currency` (récupéré depuis `employee.salary_currency`)
  et `exchange_rate`, tous deux obligatoires. Les deux sont exposés dans les champs
  additionnels ; le nœud n'envoie de valeur par défaut que pour `exchange_rate`.
- L'API REST v1 (`/api/resource`, `/api/method`) reste en place en v16 et n'est pas
  dépréciée : `/api/resource` et `/api/v1/resource` pointent vers les mêmes règles de
  routage. Ne pas migrer vers `/api/v2` — non pas parce qu'elle manquerait en v15
  (`frappe/api/v2.py` y est aussi), mais parce qu'elle **n'y fait pas la même chose** : en 15
  `document_list` retraduit `limit`/`start` et délègue à `frappe.client.get_list`, en 16
  c'est une réécriture sur `frappe.qb.get_query` avec `has_next_page`. Un seul transport pour
  les deux versions impose donc la v1.

## Documentation

Quatre READMEs traduits (`README.md`, `.fr.md`, `.es.md`, `.de.md`). Un changement visible par
l'utilisateur (nouvelle opération, nouveau credential, prérequis) doit être répercuté dans
**les quatre**, sinon les traductions divergent silencieusement.

`docs/CREDENTIALS.md` est écrit pour toute la famille de nœuds Frappe : y ajouter un nœud
consommateur quand il arrive, et ne jamais y dupliquer le contenu du README.

## GitHub Actions

Les workflows GitHub Actions doivent toujours utiliser des versions existantes et stables
des actions officielles. **Ne jamais inventer ou supposer une version majeure.**

- Vérifier la dernière version disponible avant de modifier un workflow.
- Préférer un tag de version (`@v4`, `@v5`, etc.) ou, idéalement, un commit SHA lorsque la
  reproductibilité ou la sécurité est importante.
- Si la version n'est pas certaine, consulter le dépôt officiel de l'action plutôt que de
  la deviner.

## Publication

`publish.yml` se déclenche sur un tag `*.*.*` et publie sur npm avec provenance
(exigence n8n depuis mai 2026). Nécessite `@n8n/node-cli` ≥ 0.23.0. Ne pas publier
manuellement (`npm publish`) : cela produit un package sans attestation de provenance,
que n8n refusera.
