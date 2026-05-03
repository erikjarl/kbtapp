# KBTApp — HANDOFF för vidare arbete via DM med Nils

Det här dokumentet är till för att arbetet med `kbtapp` ska kunna fortsätta sömlöst via Discord-DM med Nils utan att bakgrunden behöver återförklaras varje gång.

## Repo
- GitHub: `https://github.com/erikjarl/kbtapp.git`
- Lokal workspace-sökväg: `/Users/erikjarl/.openclaw/workspace/kbtapp`

## Grundprompt / projektbrief

Behörighet. Du har fri tillgång till att ändra alla, pusha och comitta alla filer i repor kbtappen `https://github.com/erikjarl/kbtapp.git`

### Mål
Skapa en hemsida (som senare ska göras till app) vars syfte är att en KBT-terapeut ska kunna dela information, hemuppgifter och meddelanden med sina patienter. Det främsta syftet är att terapeuten enkelt ska kunna skräddarsy vissa hemuppgifter med hjälp av en flik som kallas för **”arbetsyta”** under fliken **”skapa patientmaterial”**. Terapeuten ska kunna skapa egen psykoedukation och hemuppgifter.

Hemuppgifterna ska vara interaktiva på så vis att de ska kunna skickas ut till en patientanvändare och att terapeuten kan se vad patienten senare har fyllt i och gjort.

Det ska även gå att spara sina mallar för hemuppgifter.

De hemuppgifter som skapats kommer finnas i ett **bibliotek** så att de går att återanvändas. Det ska även finnas en flik som heter **Mallar för patientmaterial**. Dessa ska kunna importeras till arbetsytan och att terapeuten kan göra egna förändringar i den.

## Sidor

### Inloggningssida
- alternativ:
  - logga in som terapeut
  - logga in som patient

### Startsida
- klientdashboard:
  - senaste aktivitet
  - nya händelser
  - nya meddelanden
  - mina målsättningar
  - senaste hemuppgiften
  - nästa bokade tid
- terapeutdashboard:
  - nya händelser
  - nya meddelanden
  - mina patienter
  - nästa bokade tider

### Flikar i menyn för klient
- Mina hemuppgifter
- Mitt material
- Kontakta min behandlare

### Flikar i menyn för terapeut
- Patientmeddelanden
- Skapa patientmaterial
- Mitt materialbibliotek
- Mallbibliotek

## Design
- Ljus, men inte helt vit, bakgrund
- Mörk text
- Elegant design
- Fina färger på loggor
- Loggor för KBT-appen
- Mobilvänlig
- Flera olika typsnitt som kompletterar varandra
- Användning av Tailwind-symboler eller liknande
- Lägg in bilder med terapitema på valda platser

## Deluppgifter
1. Skapa grundstrukturen för hela terapeutvyn avseende design m.m.
2. Vänta med funktionell backend tills senare steg

---

## Faktiska design- och implementationsbeslut som redan tagits

- Frontend först, ingen riktig backend än
- Bakgrundsfärg: `#f3f2ef`
- Textfärg: `#1f1b18`
- Typsnitt:
  - `Cormorant Garamond` för rubriker
  - `Inter` för brödtext
- Ikoner: inline SVG i Heroicons/Tailwind-lik stil
- Mobilanpassning:
  - sidonav på desktop
  - bottennav på mobil
- Startsidan använder nu direkta rollval utan lösenordsflöde
- Vyer för både terapeut och patient finns i frontend

---

## Vad som redan är byggt

### Grundstruktur
- startsida / rollval
- terapeutvy
- patientvy
- dashboard-sidor
- placeholder- och frontendstruktur för meddelanden, bibliotek och mallbibliotek

### Särskilt fokus: Skapa patientmaterial / arbetsyta
Arbetsytan har byggts ut till en interaktiv frontend-prototyp med:
- blockpanel
- arbetsyta/komponera-yta
- inställningspanel
- förhandsgranska-overlay
- spara som mall
- spara i materialbibliotek
- tilldela patient

### Blocktyper som finns
- Informationstext
- Textfält
- Skattningsbox
- Tabell
- Emoji-skala

### Skattningsblock
- skalor:
  - `0–10`
  - `1–5`
  - `1–7`
  - `SUDS 0–100`
  - `custom`
- visningstyper:
  - klickbar skala
  - horisontell slider-preview

### Tabellblock
- rader och kolumner
- rubrikrad ja/nej
- celltyp:
  - statisk/låst
  - patientfält

---

## Senaste större arbetet: vad vi försökt göra och vad som redan testats

Det här är viktigt så att samma felsökningsspår inte upprepas blint.

### Målet
Att terapeuten enkelt ska kunna ordna block i arbetsytan på ett robust sätt.

### Vad som testades först
Vi försökte under flera iterationer få intern omordning i arbetsytan att fungera med **HTML5 native drag & drop**.

#### Det som testades i olika varianter
- dra block från bibliotek till arbetsytan
- dra om ordningen mellan block i arbetsytan
- förbättrade dropzoner
- highlight på dropzone
- förbättrade drop targets
- blå linje som visade mellan vilka block insättning skulle ske
- större träffyta
- dedikerade `drop gaps`
- högre träffsäkerhet utifrån muspekarens position
- explicita dropgap som egna målzoner
- flera iterationer för att få mittenplacering att fungera
- särskild felsökning av problem med översta blocket och tabellblocket

### Problem som kvarstod
Trots flera förbättringar var sorteringen fortfarande opålitlig:
- block hamnade inte alltid där man siktade
- särskilt svårt att flytta block till mitten
- översta blocket betedde sig inkonsekvent
- tabellblocket verkade extra problematiskt, sannolikt p.g.a. annorlunda höjd/geometri
- användaren upplevde fortsatt frustration trots synlig blå linje och förbättrad träffyta

### Ny lösning som valdes
Vi **bytte strategi helt** och ersatte intern native drag/drop-sortering med **stabila flyttkontroller per block**.

#### Nuvarande modell för omordning
Varje block har knappar för att:
- flytta till toppen
- flytta upp ett steg
- flytta ned ett steg
- flytta till botten

### Varför detta valdes
- robusthet prioriterades över “äkta” drag/drop
- användaren bad uttryckligen om att prova andra lösningar eftersom drag/drop fortfarande inte fungerade tillförlitligt
- målet är att arbetsytan ska fungera konsekvent även med block av olika höjd, särskilt tabell

---

## Viktiga commits i arbetet hittills

- `330f40e` — grundstruktur för KBTApp
- `85b468d` — demo admin login för frontendtest
- `3d27c77` — direkta länkar som kringgår demo-login
- `ec0f46d` — tog bort lösenordsdelen och lämnade två direkta rollknappar
- `ed3fad2` — lagade appskalet och byggde ut terapeut-/klientvyer
- `9d9bd32` — byggde interaktiv arbetsyta för patientmaterial
- `d75d64d` — fix för skriv-/redigeringsflöde + horisontell slider
- `d135823` — förbättrade drop-beteende och drag affordance
- `3ffc551` — höll block visuellt inom arbetsytan och kollapsade dem som bars
- `2afe691` — tightare containment och kollapsad bar-styling
- `73dd534` — förfinad liststil och drop targeting
- `8396b69` — fix för dubletter och bättre insert-indikator
- `02336ae` — drop gaps och fix för duplicate drag inserts
- `dfb2036` — förbättrad träffsäkerhet för drop gaps
- `a386f20` — explicit drop gap targeting
- `15bd914` — **stabiliserad omordning i arbetsytan** genom att byta från intern DnD till flyttkontroller per block

---

## Nuvarande rekommendation för fortsatt arbete

När arbete fortsätter via DM med Nils:

1. **Utgå från nuvarande stabila omordningsmodell** med flyttknappar
2. Gå inte tillbaka till native HTML5 DnD för intern blocksortering utan mycket god anledning
3. Fokusera i stället på:
   - UX-förfining
   - patientförhandsvisning
   - mallimport/export
   - materialbibliotekets arbetsflöde
   - tydligare blockredigering
   - bättre styling och informationshierarki
4. Om drag/drop ska återintroduceras senare bör det i så fall ske som en helt annan teknisk lösning, inte bara ytterligare små justeringar på tidigare native DnD-spår

---

## Kort DM-prompt att använda med Nils

```text
Fortsätt arbetet i repo `kbtapp`.

Läs först `kbtapp/HANDOFF.md` och utgå från den fullt ut.
Det dokumentet innehåller:
- grundprompten
- projektmålet
- designreglerna
- vad som redan byggts
- vilka commits som gjorts
- vad vi redan testat i arbetsytan
- varför vi bytt från native drag/drop till flyttknappar för omordning

Viktigt:
- frontend först
- commit och push direkt till `origin main` när du gjort ändringar
- återupprepa inte gamla misslyckade DnD-spår utan tydlig anledning
- prioritera stabilitet och tydlig UX i arbetsytan
```

---

## Arbetsregel: tidsstämpel på login-sidan

Vid varje ändring som påverkar hemsidan/frontend i `kbtapp` ska login-sidan uppdateras med en synlig tidsstämpel i formatet:

- `Uppdaterades: YYYY-MM-DD HH:MM TZ`

Syftet är att det snabbt ska gå att verifiera att senaste ändringen verkligen är med i commit/push/publicerad version.

Detta ska ses som en standardrutin för projektet vid varje relevant commit.

## Syfte med denna handoff
Målet är att Nils via Discord-DM ska kunna fortsätta arbeta direkt med `kbtapp` utan att projektbakgrunden behöver återskapas från början.
