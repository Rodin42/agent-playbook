# Wiersholm agentkatalog

En katalog over agentene Wiersholm bruker eller vurderer å bruke — delt i to
domener: **juridisk leveranse** (arbeidet i mandatene) og **forretningsstøtte**
(det som holder firmaet i drift). Hver agent er beskrevet som en rolle, ikke som
et verktøy: hva den gjør, hva den får inn, hva den leverer, hvem som godkjenner
den, og hva den aldri gjør.

```
agents.html                  katalogen: søk, filtrering, detaljvisning og redigering
agents.data.js               datakilden — én post per agent
tools/export-markdown.mjs    validerer katalogen og skriver én .md per agent
tools/build-artifact.mjs      pakker siden for publisering som Artifact
```

## Åpne den

Katalogen er én HTML-fil uten byggesteg. Åpne `agents.html` rett fra disk, eller
legg mappen bak en hvilken som helst webserver. Den publiserte versjonen ligger
som Artifact på claude.ai, og er den de fleste bruker.

## Lage og redigere agenter

Det er to veier inn, og de peker mot hverandre:

**I katalogen.** «Ny agent» åpner et tomt skjema med de seks seksjonene en
agentbeskrivelse pleier å ha (Oppdrag, Arbeidsmåte, Prosess, Kvalitetskrav,
Vokterregler, Overlevering). Seksjoner kan legges til, fjernes og flyttes.
«Rediger» gjør det samme på en som finnes, «Dupliser» gir et utgangspunkt fra en
som ligner. Punktlister skrives med `- ` og nummererte lister med `1. `.

Hvor endringene lagres står i toppen av siden:

- **lagres for hele firmaet** — siden kjører som Artifact med delt database.
  Alle i Wiersholm som åpner katalogen ser endringen med en gang.
- **lagres i denne nettleseren** — siden kjører fra disk eller uten delt
  database. Endringene ligger lokalt. Bruk **Eksporter katalogen (JSON)** for å
  ta dem med videre.

**I repoet.** `agents.data.js` er katalogversjonen: den listen alle starter fra.
Rediger den og commit, så er den nye posten med for alle neste gang siden
publiseres. Endringer gjort i katalogen legger seg *over* denne listen — en
endret agent er merket `endret`, og «Tilbakestill mine endringer» ruller alt
tilbake til katalogversjonen.

Slik synkes endringer fra katalogen tilbake til repoet: **Eksporter katalogen
(JSON)** i menyen, og legg postene inn i `agents.data.js`.

## Feltene

| Felt | Hva det betyr |
| --- | --- |
| `domain` / `group` | Hvor agenten hører hjemme. Gyldige verdier står i `domener` øverst i datafilen. |
| `status` | `ide`, `pilot` eller `i-drift`. |
| `authority` | `raadgivende` (gir innspill), `utkast` (produserer noe et menneske må eie), `beslutning` (kan avslutte selv innenfor et avgrenset mandat). |
| `signoff` | Hvem som godkjenner før noe går ut. |
| `confidentiality` | `apen`, `intern` eller `klientdata` — hva agenten har lov å se. |
| `inputs` / `outputs` | Hva den må få, og hva som faktisk kommer ut. |
| `sections` | Fritt antall seksjoner med overskrift og brødtekst. |

Legger du til en gruppe i `domener`, dukker den opp både i navigasjonen og i
redigeringsskjemaet uten kodeendring.

## Eksport

Fra en agent: **Systemprompt** gir en ferdig prompt å lime inn i Claude,
**Markdown** gir agenten som `.md` med frontmatter — samme form som
`template/phase-1-product-development/agents/*.md` i dette repoet, slik at en
agent kan flyttes rett inn i et prosjekt.

Fra menyen: hele katalogen som JSON eller som én Markdown-fil.

På disk gjør `node wiersholm/tools/export-markdown.mjs` det samme for alle
agentene samtidig, og stopper med en feilmelding hvis en post peker på en gruppe,
status eller autoritet katalogen ikke kjenner. Kjør den etter endringer i
`agents.data.js`. Filene den skriver er avledet — de ligger ikke i git.

## Publisering

```
node wiersholm/tools/build-artifact.mjs      # skriver wiersholm/dist/
```

`dist/index.html` + `dist/agents.data.js` er det som publiseres som Artifact.
Kildefilen `agents.html` er et komplett HTML-dokument fordi den skal virke alene;
publiseringsformatet har ikke `<head>` og `<body>`, og skriptet fjerner dem.
