# AGENTS.md

Guide pour les agents IA travaillant sur ce dépôt.

## Contexte du projet

Package de nœuds communautaires n8n, écrit en TypeScript, publié sous le nom
`n8n-nodes-frappe-hrms`. Il expose **un nœud**, `Frappe HR`, qui pilote
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
  raison. `npm run lint:fix` en corrige la majorité — lire la mise en garde plus bas
  avant de le lancer.
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

## Attention avec `npm run lint:fix`

L'autofix de `node-param-description-missing-final-period` **casse les descriptions
construites en template literal** : il a déjà remplacé, dans un package frère, une description
`` `... ${hint}` `` par une chaîne littérale tronquée, supprimant l'interpolation au passage —
le build ne le voit pas, seul `noUnusedLocals` a signalé le paramètre devenu inutilisé. Ce
dépôt en compte 14. Après un `lint:fix`, relire le diff des fichiers `descriptions/` plutôt
que de le supposer sûr.

## Sélecteurs (champs Link)

Aucun champ pointant vers un autre enregistrement Frappe n'est en texte libre. Cinq blocs
portent ce mécanisme dans `FrappeHrms.node.ts` :

| Bloc | Rôle |
| --- | --- |
| `searchIn` | recherche paginée dans un doctype, filtrage côté Frappe |
| `searchDocuments` | le champ **Document** ; résout le doctype depuis le paramètre `resource` |
| `linkSearch(doctype, titleField?)` | fabrique une recherche pour un champ Link |
| `linkOptions(doctype, { filters?, labelField? })` | fabrique une liste déroulante |
| `unwrapResourceLocators` | déballe les locators d'une collection avant l'envoi |

**Ces blocs sont identiques au caractère près dans les six packages applicatifs**, au même
titre que le transport (règle n°0) : une correction ici se reporte partout.

### À ne pas casser

- **`documentId` est un `resourceLocator`.** Le lire sans `{ extractValue: true }` renvoie
  `{ __rl, mode, value }` et Frappe reçoit `[object Object]` dans l'URL. Même chose pour tout
  champ Link exposé au premier niveau.
- **Les locators d'une collection ne sont pas déballés par n8n.**
  `getNodeParameter('additionalFields', i)` rend les objets bruts : passer par
  `unwrapResourceLocators` avant de construire le corps. n8n ne déballe que si l'on adresse le
  paramètre par son chemin exact, ce qui imposerait un appel par champ.
- **Une méthode `listSearch` ignore quel champ l'a appelée.** D'où une méthode liée par doctype
  cible, produite par la fabrique — et non une méthode générique.

### Choisir entre recherche et liste déroulante

Le critère est la **nature** du doctype, pas son nombre de lignes actuel : `Address` ou
`Project` peuvent être vides sur un site de test et sans limite en production.

- **Recherche** pour ce que l'activité alimente : personnes, documents transactionnels, et les
  listes ISO volumineuses (`Country`, 250 lignes).
- **Liste déroulante** pour ce qu'un administrateur maintient. `Currency` y entre grâce au
  filtre `enabled = 1`, qui ramène ~150 lignes à une poignée.

### Champ titre : se lire, jamais se deviner

Lire **`title_field` et `autoname`** dans `/api/resource/DocType/<nom>` avant de renseigner
`TITLE_FIELD_BY_RESOURCE` ou l'argument `titleField`. Quand l'`autoname` est `field:x` ou
`format:{####} {title}`, le `name` porte déjà le libellé et en ajouter un le répète
(« 0002 Introduction — Introduction »).

Les deux fabriques retombent sur `name` seul si Frappe refuse le champ, donc **une erreur ici
ne casse rien et ne se voit pas** : elle se contrôle sur des données réelles, pas au jugé.

### Détecter un champ Link

Se fier à ce que le doctype **déclare**, pas au libellé des descriptions du nœud. Un comptage
fondé sur la mention « Link to » avait manqué 16 champs sur le seul package HRMS. Penser aussi
aux **Custom Fields** : ils n'apparaissent pas dans `DocType.fields` et se lisent séparément
via le doctype `Custom Field`.

### `REQUIRED_ON_CREATE` a une source unique

La liste des champs exposés au premier niveau à la création est déclarée **dans le fichier de
description** de la ressource et exportée (`EMPLOYEE_REQUIRED_ON_CREATE`, etc.) ; le nœud
l'importe pour composer son `Record`. Ne pas la réécrire dans le nœud : les deux copies
existaient et avaient déjà divergé.

### `last_name` est requis par le nœud, pas par Frappe

Le doctype `Employee` ne marque pas `last_name` comme `reqd`. Le nœud l'impose quand même à la
création : `employee_name` — le libellé que montrent toutes les listes et tous les Link — est
composé des parties du nom, et un employé créé avec un prénom seul reste étiqueté ainsi, ce
qui est pénible à rattraper une fois que des documents le référencent. Ne pas « corriger » ce
`required` en croyant à une erreur. L'update le laisse optionnel.

### Contrainte ESLint sur les listes dynamiques

Un champ `type: 'options'` alimenté par `loadOptionsMethod` impose un `displayName` suffixé
« Name or ID » et une `description` strictement égale au texte « Choose from the list, or
specify an ID using an expression ». Aucune précision métier ne peut y rester : sa place est
dans le README.

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
