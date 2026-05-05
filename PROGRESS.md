# KBTApp — PROGRESS

## 2026-05-04 — Initiering

### Vad jag arbetade med
- Tolkat veckouppdraget
- Identifierat tekniska risker och möjlig väg framåt
- Skapat initial arbetsplan
- Förberett struktur för iterativ loggning

### Vad jag ändrade
- Skapade `WORKPLAN.md`
- Skapade `PROGRESS.md`

### Vad som nu fungerar
- Plan för veckans arbete finns dokumenterad
- Iterativ loggstruktur finns på plats
- Inga externa API-nycklar krävs för nuvarande plan

### Vad som inte fungerar ännu
- Ingen backend/autentisering ännu
- Inga nya funktionsflöden implementerade i denna initieringskörning

### Nästa steg
- Välja minsta möjliga backend-spår
- Inventera nuvarande projektstruktur för att avgöra enklaste sättet att lägga till auth/mock persistence
- Sätta första riktiga implementeringskörningen mot auth-grunden

## 2026-05-05 — Mall- och materialbibliotek, första fungerande åtgärder

### Vad jag arbetade med
- En avgränsad del: klickbara kort i mallbiblioteket och materialbiblioteket i terapeutvyn
- Målet var att få dessa kort att faktiskt göra något rimligt istället för att bara se interaktiva ut

### Vad jag ändrade
- Gjorde mallkortens primärknapp fungerande: `Importera` laddar nu in mallen i arbetsytan och växlar till sidan `Skapa patientmaterial`
- Gjorde mallkortens sekundärknapp fungerande: `Importera kopia` laddar också in innehållet i arbetsytan som en ny uppsättning block
- Gjorde materialkortens primärknapp fungerande: `Öppna` visar nu en patientvänlig förhandsvisning i modal
- Gjorde materialkortens sekundärknapp fungerande: `Duplicera` laddar nu materialet in i arbetsytan för vidare redigering
- Lade till enkel fallback så även seedade mallar/material utan sparade block kan öppnas/importeras som meningsfulla standardblock
- Utökade tidsestimeringen så den även kan användas för förhandsvisning av biblioteksobjekt

### Vad som nu fungerar
- Mallbiblioteket har ett första verkligt flöde från kort → import → arbetsyta
- Materialbiblioteket har ett första verkligt flöde från kort → öppna/förhandsvisa
- Samma importflöde fungerar i praktiken både på desktop och mobil
- Riktat test verifierade:
  - desktop: mallimport öppnar sidan `create` och laddar in 2 block
  - desktop: materialkortets `Öppna` visar förhandsvisning
  - mobil: mallimport öppnar sidan `create` och laddar in 2 block

### Vad som inte fungerar
- Browser-verktyget kunde inte användas denna körning eftersom lokal Chrome-attach timeoutade; praktisk testning gjordes därför med Playwright via lokala skript istället
- Seedade bibliotekskort använder fortfarande genererade standardblock, inte verkliga specialanpassade mallstrukturer ännu
- Bibliotekskorten saknar fortfarande mer avancerade åtgärder som redigera namn, radera eller versionshantering
- Det finns fortfarande vissa kända overflow-varningar i UI enligt befintlig QA, särskilt i mobil builder-vyn, men de låg utanför denna avgränsade del

### Nästa steg
- Fortsätt med nästa tydliga del: antingen auth-grund eller fler döda klickytor/formulär i patient-/terapeutflödena
- Om biblioteksspåret fortsätter: lägg till riktiga blockstrukturer för seedade mallar och möjlighet att importera mall → tilldela patient i ett kortare flöde

## 2026-05-05 — Meddelandeflöde mellan terapeut och patient, första fungerande version

### Vad jag arbetade med
- En avgränsad del: meddelandeytorna i terapeutens `Patientmeddelanden` och patientens `Kontakta min behandlare`
- Målet var att ersätta statiska placeholders med ett enkelt men testbart tvåvägsflöde i frontend

### Vad jag ändrade
- Bytte ut statiska meddelande-placeholdersektioner mot riktiga trådytor med rubrik, statusrad, meddelandelista och formulär
- Lade till enkel mockad trådmodell i `localStorage` för flera patienter med seedade startmeddelanden
- Gjorde terapeutens vänsterspalt klickbar så olika patienttrådar kan väljas och förhandsvisas med senaste text och aktivitet
- Gjorde det möjligt för terapeuten att skicka svar i aktiv tråd
- Gjorde det möjligt för patienten att skicka egna meddelanden i kontaktvyn
- Kopplade ihop terapeut- och patientvyn mot samma lokala meddelandedata så nya meddelanden syns i båda vyerna
- Lade till snabbsvar/chips för att göra flödet lättare att testa praktiskt
- Lade till responsiv styling för trådlista, bubblor, composer och mobilbeteende

### Vad som nu fungerar
- Terapeut kan öppna olika patienttrådar och se respektive konversation
- Terapeut kan skriva och skicka svar i vald tråd
- Patient kan skriva och skicka meddelande till behandlare i kontaktvyn
- Nya meddelanden sparas lokalt och ligger kvar vid omladdning via `localStorage`
- Trådlistan visar nu senaste meddelande och antal meddelanden istället för döda statiska rader
- Praktiskt test verifierade:
  - desktop 1440×900: öppna terapeutvyn → patientmeddelanden → välj `Erik Johansson` → skicka svar → ny text syns i trådlistan
  - mobil 390×844: öppna patientvyn → kontakt → skicka nytt meddelande → nytt bubble syns korrekt i tråden

### Vad som inte fungerar
- Browser-verktyget kunde inte användas denna körning heller: host-attach mot Chrome timeoutade och sandbox-browser var inte tillgänglig
- Meddelandeflödet är fortfarande helt lokalt/mockat utan riktig autentisering, notifieringar eller läskvitton
- Terapeutens trådlista visar enkel aktivitetsinfo men ingen verklig olästlogik ännu

### Nästa steg
- Välj nästa tydliga del som fortfarande känns statisk: antingen riktig auth-grund eller formulär-/åtgärdsflöden i meddelanden och uppgifter
- Om meddelandespåret fortsätter: lägg till enkel composer-status, tydligare oläst/nytt-markering och gärna koppling från inskickad hemuppgift till relevant tråd
