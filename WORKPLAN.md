# KBTApp — WORKPLAN (7 dagar)

## Syfte
Under en begränsad vecka färdigställa ett första fullt fungerande utkast av KBTApp där frontendens synliga funktioner faktiskt fungerar och en enkel backend finns för grundflöden.

## Huvudmål
**HUVUDMÅLET ÄR ATT JOBBA KLART MED KBTAPP.**
Du har fria händer att jobba klart med hemsidan så att den når full funktionalitet både för terapeutdelen och patientdelen samt interaktionen mellan dessa delar. Detta inkluderar att kunna skapa användare med lösenord som lagras samt att alla förändringar och data som ändras lagras.

## Principer
- Enkelhet före perfektion
- Testbar helhet före komplett produkt
- Små tydliga iterationer
- Browsertest på desktop + mobil
- Max 2–3 förbättringsvarv per del
- Undvik onödig komplexitet och tunga omtag

## Tekniska antaganden
- Nuvarande projekt är i huvudsak frontend
- En enkel lokal backend behöver sannolikt införas för att nå huvudmålet
- Acceptabel första nivå:
  - enkel Node-baserad server eller liknande lätt lokal lösning
  - lätt persistence eller fil-lagring så att användare, lösenord och ändrad data faktiskt sparas
  - mock-data där det räcker, men verklig lagring ska införas där flödet kräver det

## Veckomål
### 1. Autentisering
- [ ] Patient kan skapa konto
- [ ] Patient kan logga in
- [ ] Terapeut kan skapa konto
- [ ] Terapeut kan logga in
- [ ] Enkel rollhantering fungerar

### 2. Grundfunktioner
- [ ] Alla klickbara element gör något rimligt
- [ ] Alla formulär går att skicka
- [ ] Alla vyer kan nås utan fel
- [ ] Flöden fungerar även om viss logik är mockad

### 3. Skapa patientmaterial
- [ ] Fungerande flöde: formulär → resultat → kopiera/exportera
- [ ] Några färdiga mallar i mallbiblioteket
- [ ] Material kan skapas och sparas i enkel första version

### 4. Stabilitet / UI
- [ ] Inga uppenbara döda knappar
- [ ] Inga större overflowproblem
- [ ] Mobil/desktop fungerar på rimlig nivå

---

## Planerade iterationer per cron-körning

### Viktig styrregel för cronjobbet
Vid varje cronkörning har agenten också auktoritet att **justera själva cron-instruktionen/prompten för nästa körning** om det hjälper nästa iteration att börja rätt i planeringen. Syftet är att nästa trigger tydligare ska veta var arbetet ska fortsätta, vilka blockerare som ska undvikas och vilken del som bör prioriteras härnäst.

### Körning 1
- Projektinventering
- Skapa plan- och progressfiler
- Definiera teknisk väg för enkel backend
- Identifiera minsta möjliga auth-flöde

### Körning 2
- Lägg grund för enkel backend/server
- Struktur för konton/roller/mock persistence
- Startbar lokal körning

### Körning 3
- Registrering + login för patient
- Grundläggande sessionsflöde/mock auth-state
- Browsertest desktop + mobil

### Körning 4
- Registrering + login för terapeut
- Rollstyrd vyväxling
- Browsertest desktop + mobil

### Körning 5
- Gå igenom navigation, döda knappar och formulärflöden
- Fixa brutna övergångar

### Körning 6
- Gör “Skapa patientmaterial” mer funktionell
- Resultat/copy/export-flöde första version

### Körning 7
- Lägg in färdiga mallar i mallbiblioteket
- Testa materialflöde från mall → arbetsyta → resultat

### Körning 8
- Förbättra patient-/terapeutflöden som fortfarande känns ofärdiga
- Browsergranskning och buggrensning

### Körning 9
- Mobilpolish + overflowjakt
- Desktopgenomgång

### Körning 10+
- Kvarvarande luckor
- Konsolidering
- Dokumentation av brister

---

## Testkrav per iteration
- Desktop cirka 1440x900
- Mobil cirka 390x844
- Klicka runt i UI
- Fyll i relevanta formulär
- Verifiera navigation
- Ta screenshots när relevant

## Filer som ska hållas uppdaterade
- `WORKPLAN.md`
- `PROGRESS.md`
- ev. enkel backend README/notering om startkommando när väg valts

## Beslut att ta tidigt
- Exakt backend-minimum
- Hur auth-state lagras i första version
- Hur mock-data organiseras

## Kända risker
- Nuvarande projekt är byggt som frontend; backendspåret måste hållas litet och kontrollerat
- För mycket samtidigt riskerar att skapa rörighet
- Designändringar får inte ta över funktionsmålet
