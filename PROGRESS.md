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

## 2026-05-05 — Inskickad hemuppgift kan nu granskas av terapeut

### Vad jag arbetade med
- En avgränsad del: kedjan från patientens ifyllda hemuppgift till terapeutens vy för inskickat material
- Målet var att göra terapeutens sektion `Inskickat patientmaterial` verkligt användbar istället för enbart en lista med statiska kort

### Vad jag ändrade
- Lade till en ny terapeutmodal för granskning av inskickade hemuppgifter block för block
- Började spara en snapshot av patientens faktiska svar när en hemuppgift skickas in
- Gjorde inskick smartare så samma tilldelade hemuppgift uppdaterar sitt inskick istället för att skapa otydliga dubbletter varje gång
- Lade till sammanfattning per inskick med antal ifyllda svar och kort previewtext direkt i terapeutens kortvy
- Gjorde det möjligt att från ett inskick hoppa vidare till rätt patienttråd i `Patientmeddelanden`
- Lade till enkel styling för läsbara svarsrutor i terapeutens granskningsläge
- Skapade ett riktat Playwright-test för just inskick/granskningsflödet

### Vad som nu fungerar
- Patientens ifyllda svar följer nu med in i inskicket och kan öppnas i terapeutvyn
- Terapeuten kan öppna ett inskick och läsa svaren i ett sammanhållet granskningsläge utan att lämna appen
- Terapeuten kan från ett inskick hoppa direkt till rätt patienttråd för uppföljning
- Upprepad inskickning av samma tilldelade uppgift ersätter tidigare inskickspost istället för att stapla onödiga dubbletter
- Praktiskt test verifierade:
  - desktop 1440×900: skapa material → tilldela patient → fyll i formulär som patient → skicka in → öppna inskick i terapeutvy och se faktisk fritext
  - mobil 390×844: tilldela enkel uppgift → fyll i emoji-svar som patient → skicka in → öppna inskick i terapeutvy och se inskickad emoji-status

### Vad som inte fungerar
- Flödet är fortfarande helt lokalt/mockat i `localStorage` utan backend, användarkonton eller verklig synk mellan olika enheter
- Terapeuten kan ännu bara läsa inskick; det finns ingen strukturerad återkopplingsknapp, kommentarsfält per block eller markering som `granskad`
- Browser-verktyget användes inte här eftersom tidigare host-attach varit opålitligt för denna app; praktisk testning gjordes istället med lokal Playwright-körning

### Nästa steg
- Välj nästa tydliga del i samma område: antingen återkopplingsflöde från terapeut tillbaka till patient eller enklare statusmarkeringar för uppgift `tilldelad / påbörjad / inskickad / granskad`
- Alternativt byt spår till auth-grund om målet blir att börja knyta vyerna till riktiga roller och sessioner

## 2026-05-05 — Statusflöde för hemuppgifter från tilldelad till granskad

### Vad jag arbetade med
- En avgränsad del: statushanteringen för tilldelade hemuppgifter i patient- och terapeutvyn
- Målet var att göra statusen begriplig och testbar genom hela kedjan `tilldelad → påbörjad → inskickad → granskad`

### Vad jag ändrade
- Lade till tydliga statuschips i patientens uppgiftskort och terapeutens inskickskort
- Gjorde så att en uppgift automatiskt går från `tilldelad` till `påbörjad` när patienten öppnar formuläret eller börjar fylla i svar
- Behöll `inskickad` som explicit status vid inskick och nollställde tidigare granskningsmarkering vid ny inskickning
- Lade till terapeutknapp `Markera som granskad` i granskningsmodalen för inskickat material
- Synkade granskningsmarkeringen tillbaka till den tilldelade uppgiften så patienten också ser att uppgiften är granskad
- Justerade knapptexter i patientvyn så de bättre matchar läget: `Öppna formulär`, `Fortsätt fylla i`, `Öppna svar` och `Skicka in igen`
- Lade till ett riktat Playwright-test för statusflödet samt sparade desktop- och mobilskärmdumpar i `qa-artifacts/`

### Vad som nu fungerar
- Patientens hemuppgift visar nu begriplig status i kortet istället för bara statisk text
- Status växlar nu praktiskt mellan `tilldelad`, `påbörjad`, `inskickad` och `granskad`
- Terapeuten kan markera ett inskick som granskat direkt i modal utan extra manuella steg
- Om patienten skickar in samma uppgift igen går den tillbaka till `inskickad` tills terapeuten granskar på nytt
- Praktiskt test verifierade:
  - desktop 1440×900: tilldela uppgift → öppna som patient → status blir `påbörjad` → skicka in → terapeut öppnar inskick → markerar `granskad`
  - mobil 390×844: tilldela uppgift → öppna formulär → status blir `påbörjad` → skicka in → kortet visar `inskickad` och `Skicka in igen`

### Vad som inte fungerar
- Flödet är fortfarande helt lokalt/mockat i `localStorage` utan riktig backend eller fleranvändarsynk
- `granskad` visas nu som status men det finns ännu ingen riktig terapeutåterkoppling, kommentar eller blockvis respons tillbaka till patienten
- Browser-verktyget användes inte här heller; praktisk testning gjordes med lokal Playwright-körning mot lokal server

### Nästa steg
- Bygg nästa lilla del i samma område: enkel återkoppling från terapeut tillbaka till patient kopplad till ett inskick eller en uppgift
- Alternativt lägg till filtrering/sortering i terapeutens inskicklista efter status för att göra uppföljning snabbare

## 2026-05-05 — Enkel terapeutåterkoppling på inskickad hemuppgift

### Vad jag arbetade med
- En avgränsad del: återkoppling från terapeut tillbaka till patient efter att en hemuppgift skickats in
- Målet var att göra statuskedjan mer komplett genom att låta terapeuten spara en kort kommentar som patienten sedan faktiskt kan läsa

### Vad jag ändrade
- Lade till ett enkelt återkopplingsfält i terapeutens granskningsmodal för inskickat material
- Lade till knapp för att spara återkoppling direkt från granskningsläget
- Började spara återkoppling lokalt på både inskicket och den tilldelade hemuppgiften, med tidsstämpel
- Lät sparad återkoppling markera uppgiften som `granskad` om den ännu inte var det
- Visar nu återkoppling i patientens hemuppgiftskort som en tydlig sammanfattningsruta
- Visar även hela senaste återkopplingen inne i patientens formulär-/svarsvy
- Nollställer tidigare återkoppling när patienten skickar in uppgiften igen, så att gammal kommentar inte ligger kvar på en ny version
- Uppdaterade login-sidans synliga tidsstämpel enligt projektregeln

### Vad som nu fungerar
- Det finns nu ett första verkligt återkopplingsflöde från terapeut till patient i samma mockade datamodell
- Patientkortet visar när återkoppling finns istället för att bara visa status
- Patienten kan öppna uppgiften och läsa den senaste terapeutkommentaren i ett eget återkopplingsblock
- Ny inskickning rensar gammal återkoppling så nästa granskning blir tydligare
- `script.js` passerar syntaxkontroll via `node --check`

### Vad som inte fungerar
- Praktisk browserverifiering blev bara delvis klar denna körning: patientflödet gick att köra praktiskt, men terapeutens inskickskort betedde sig märkligt i Playwright och renderade åtgärdsknappen med noll storlek i dashboard-vyn trots att kortets HTML fanns på plats
- Browser-testet visade också tecken på att en tidigare förhandsvisningsmodal kunde ligga kvar och störa interaktioner i samma testrunda
- Flödet är fortfarande helt lokalt/mockat i `localStorage` utan riktig backend, autentisering eller synk mellan enheter

### Nästa steg
- Felsök varför åtgärdsknappen i terapeutens inskickskort ibland inte blir praktiskt klickbar/visuell i dashboard-vyn
- När det sitter: kör ett rent end-to-end-varv där terapeuten öppnar inskick, skriver återkoppling och patienten läser den på både desktop och mobil
- Därefter är ett rimligt nästa litet steg filtrering/sortering av inskick efter status eller en mer strukturerad återkopplingsvy

## 2026-05-05 — Stabilare modalhantering runt terapeutens inskickskort

### Vad jag arbetade med
- En avgränsad del: robustheten runt modaler i terapeutflödet, särskilt förhandsvisning och granskning av inskick
- Målet var att minska risken att en kvarliggande modal stör `Öppna inskick` eller annan navigation i samma session

### Vad jag ändrade
- Lade till central stängning av synliga modaler när användaren byter roll, loggar ut eller navigerar mellan sidor
- Gjorde `openModal` defensiv så den först stänger andra öppna modaler innan en ny öppnas
- Lade till `body.modal-open` för att låsa bakgrundsscrolling medan modal är öppen
- Lade till Escape-stöd så öppna modaler kan stängas snabbare och mer förutsägbart
- Behöll lösningen liten och lokal i befintlig frontend utan ny arkitektur eller backendspår

### Vad som nu fungerar
- Förhandsvisningsmodal och granskningsmodal kan inte längre ligga öppna ovanpå varandra i samma vy
- Vybyte, logout och sidnavigering rensar nu öppna overlays innan nästa steg visas
- Praktiskt verifierat med lokal Playwright-körning att de befintliga inskick/status-flödena fortfarande fungerar på:
  - desktop 1440×900
  - mobil 390×844
- `script.js` passerar fortsatt `node --check`

### Vad som inte fungerar
- Browser-verktyget användes fortfarande inte i denna körning; praktisk testning gjordes med lokal Playwright eftersom tidigare browser-attach varit opålitlig för appen
- Flödet är fortfarande helt lokalt/mockat i `localStorage` utan backend, autentisering eller synk mellan enheter
- Jag reproducerade inte exakt samma nollstorleksbeteende på knappen denna körning, så fixen är främst en riktad robusthetsförbättring mot den mest sannolika störkällan: kvarliggande overlays

### Nästa steg
- Kör ett rent end-to-end-varv för terapeutåterkoppling där samma testrunda även öppnar/stänger fler modaler mellan stegen, för att bekräfta att flödet känns stabilt även under mer blandad användning
- Därefter är ett bra nästa lilla steg att lägga till filtrering av inskick efter status i terapeutens lista, så uppföljning blir snabbare

## 2026-05-05 — Filtrering av inskick efter status i terapeutvyn

### Vad jag arbetade med
- En avgränsad del: terapeutens lista `Inskickat patientmaterial`
- Målet var att göra uppföljningen snabbare genom att kunna växla mellan alla inskick, bara nya `inskickade` och redan `granskade`

### Vad jag ändrade
- Lade till en liten filterrad ovanför terapeutens inskicklista med valen `Alla`, `Inskickade` och `Granskade`
- Kopplade filtren till lokal renderingslogik i frontend så listan uppdateras direkt utan ny arkitektur eller backend
- Lade till räknare i filterknapparna så terapeuten ser hur många objekt som finns i varje läge
- Lade till tomt läge för filter utan träffar, så vyn fortfarande känns tydlig när exempelvis inga granskade inskick finns
- Lade till enkel styling för filterchips så de fungerar på både desktop och mobil
- Skrev ett riktat Playwright-test för filterdelen och sparade nya QA-skärmdumpar i `qa-artifacts/`

### Vad som nu fungerar
- Terapeuten kan nu filtrera inskicklistan mellan alla, endast `inskickad` och endast `granskad`
- Filterknapparna visar aktuella antal per status
- Om ett filter saknar träffar visas ett begripligt tomt tillstånd i stället för en trasig eller förvirrande lista
- Praktiskt test verifierade:
  - desktop 1440×900: 2 seedade inskick visades i `Alla`, `Inskickade` visade bara `Exponeringslogg`, `Granskade` visade bara `Sömnlogg vecka 1`
  - mobil 390×844: `Granskade` visade korrekt endast `Sömnlogg vecka 1`
- `script.js` passerar fortsatt `node --check`

### Vad som inte fungerar
- Browser-verktyget gick fortfarande inte att använda eftersom host-attach mot Chrome timeoutade och sandbox-browser saknas i denna miljö
- Flödet är fortfarande helt lokalt/mockat i `localStorage` utan riktig backend, autentisering eller synk mellan enheter
- Filtreringen omfattar ännu bara två statuslägen i terapeutens inskicklista; det finns ännu ingen sortering på datum/patient eller kombinerade filter

### Nästa steg
- Ett bra nästa litet steg är att lägga till enkel sortering eller snabbfokus på `senast inkommet` respektive `behöver granskas`
- Alternativt gå tillbaka till återkopplingsflödet och köra ett mer blandat end-to-end-varv där modaler, filtrering och patientvisning används i samma session

## 2026-05-05 — Sortering och prioritering i terapeutens inskicklista

### Vad jag arbetade med
- En avgränsad del: terapeutens lista `Inskickat patientmaterial`
- Målet var att göra listan snabbare att arbeta i när flera inskick finns, utan att bygga om datamodellen eller lägga till backend

### Vad jag ändrade
- Lade till en enkel sorteringskontroll ovanför inskicklistan med valen `Behöver granskas först`, `Senast inkommet`, `Senast granskat` och `Patient A–Ö`
- Gjorde standardläget prioriterat mot `inskickad` före `granskad`, och därefter nyast först inom respektive grupp
- Lade till en kort sammanfattningsrad som visar hur många inskick som visas, hur många som väntar granskning och vilken sortering som används
- Behöll lösningen helt lokal i befintlig frontend, kopplad till samma mockade `localStorage`-data som resten av inskicksflödet
- Lade till responsiv styling så kontrollen fungerar både i desktopbredd och mobilbredd
- Sparade nya QA-skärmdumpar i `qa-artifacts/submission-sort-desktop.png` och `qa-artifacts/submission-sort-mobile.png`

### Vad som nu fungerar
- Terapeuten kan nu växla mellan flera enkla sorteringslägen utan att lämna sidan eller trigga ny laddning
- Standardläget hjälper terapeuten att se sådant som fortfarande behöver granskas före redan granskade inskick
- Sammanfattningsraden gör läget tydligare när filter och sortering kombineras
- Praktiskt test verifierade med seedade mock-inskick:
  - desktop 1440×900: standardordning visade `Aktivitetsplan`, `Exponeringslogg`, `Sömnlogg vecka 1`; `Patient A–Ö` gav alfabetisk patientordning och `Granskade` + `Senast granskat` visade korrekt bara `Sömnlogg vecka 1`
  - mobil 390×844: `Inskickade` + `Senast inkommet` visade korrekt `Aktivitetsplan` före `Exponeringslogg`
- `script.js` passerar fortsatt `node --check`

### Vad som inte fungerar
- Browser-verktyget kunde fortfarande inte användas eftersom host-attach mot Chrome saknade fungerande debug-port; praktisk verifiering gjordes därför via lokal Playwright mot systemets Chrome
- Flödet är fortfarande helt lokalt/mockat i `localStorage` utan riktig backend, autentisering eller synk mellan enheter
- Sorteringen är fortfarande enkel; det finns ännu ingen kombinerad sort/filter-panel för datumintervall, patientgrupper eller verklig prioriteringslogik

### Nästa steg
- Ett rimligt nästa lilla steg är att lägga till snabbåtgärd för `öppna nästa som väntar granskning` eller enklare markering av `behöver svar från terapeut`
- Alternativt återgå till återkopplingsspåret och låta sortering, filtrering och granskningsmodal användas i samma sammanhängande end-to-end-varv

## 2026-05-05 — Snabböppning av nästa inskick som väntar granskning

### Vad jag arbetade med
- En avgränsad del: terapeutens inskickssektion i `Patientmeddelanden`
- Målet var att göra uppföljningen snabbare genom en enda tydlig snabbåtgärd för att öppna nästa inskick med status `inskickad`

### Vad jag ändrade
- Lade till en ny snabbknapp ovanför inskickslistan: `Öppna nästa som väntar`
- Kopplade knappen till befintlig sorteringslogik så den öppnar det mest prioriterade oganskade inskicket i nuvarande enkla ordning
- Gjorde knapptexten informativ genom att visa vilken patient som står näst på tur
- Lade till disabled-läge och tomtext när inga nya inskick väntar granskning
- Lade till lätt responsiv layout för att få snabbknappen och sorteringskontrollen att fungera tillsammans på desktop och mobil
- Skrev ett riktat Playwright-test: `playwright-next-submission-check.js`
- Sparade QA-skärmdumpar i `qa-artifacts/next-submission-desktop.png` och `qa-artifacts/next-submission-mobile.png`

### Vad som nu fungerar
- Terapeuten kan öppna nästa väntande inskick med ett enda klick i stället för att först skanna listan manuellt
- Snabbknappen uppdateras direkt efter granskning så nästa patient i kö visas i knapptexten
- När inget nytt väntar blir knappen tydligt inaktiv i stället för att trigga ett oklart flöde
- Praktiskt test verifierade:
  - desktop 1440×900: knappen öppnade `Aktivitetsplan` för `Linda Berg`, och efter `Markera som granskad` byttes knapptexten till nästa väntande patient `Erik Johansson`
  - mobil 390×844: samma snabbknapp öppnade korrekt nästa väntande inskick i granskningsmodalen
- `script.js` passerar fortsatt `node --check`

### Vad som inte fungerar
- Browser-verktyget användes inte heller i denna körning; praktisk verifiering gjordes med lokal Playwright mot lokal server
- Flödet är fortfarande helt lokalt/mockat i `localStorage` utan backend, autentisering eller synk mellan enheter
- Snabbknappen följer fortfarande den nuvarande enkla prioriteringslogiken; det finns ännu ingen verklig prioritering utifrån exempelvis patientrisk, ålder på inskick eller terapeutens egna markeringar

### Nästa steg
- Ett naturligt nästa litet steg är att lägga till en tydlig markering som `behöver svar från terapeut` eller `återkoppling saknas` i samma lista
- Alternativt låta snabbknappen kunna hoppa vidare direkt till nästa väntande inskick efter att ett inskick markerats som granskat eller fått återkoppling

## 2026-05-06 — Serverpersistens för tilldelade hemuppgifter och inskick

### Vad jag arbetade med
- En avgränsad del: kedjan `tilldelade hemuppgifter → patientens inskick → terapeutens granskning/återkoppling`
- Målet var att flytta just denna centrala behandlingsdata från frontendens `localStorage` till den enkla backend som redan införts för auth

### Vad jag ändrade
- Utökade `server.js` så auth-databasen nu även kan lagra `assigned` och `submissions`
- Lade till två auth-skyddade API-ytor:
  - `GET/PUT /api/data/assigned`
  - `GET/PUT /api/data/submissions`
- Lade till frontendcache i `script.js` för serverladdad behandlingsdata
- Bytte hemuppgiftsflödet så tilldelning, påbörjade svar, inskick, granskning och återkoppling nu läser/skriver mot servern i stället för direkt till `localStorage`
- Lade till enkel engångsmigrering: om äldre lokal data finns och servern är tom laddas den upp första gången efter inloggning
- Lade till en riktad Playwright-kontroll `playwright-backend-persistence-check.js`
- Sparade nya QA-skärmdumpar i `qa-artifacts/backend-persistence-desktop.png` och `qa-artifacts/backend-persistence-mobile.png`

### Vad som nu fungerar
- Tilldelade hemuppgifter sparas nu i backendens JSON-fil och överlever omladdning
- Patientens inskickade svar sparas nu i backendens JSON-fil och överlever omladdning
- Terapeuten kan efter omladdning fortfarande se patientens inskick och öppna granskningsläget
- Terapeutens återkoppling i inskicksvyn sparas fortsatt och visas efter serverpersistensflödet
- Praktiskt test verifierade:
  - desktop 1440×900: registrera terapeut → skapa material → tilldela patient → ladda om → öppna terapeutens inskick efter patientens svar
  - mobil 390×844: registrera patient → öppna tilldelad uppgift → fyll i svar → skicka in → ladda om → status `inskickad` finns kvar
  - därefter kunde terapeuten efter egen omladdning öppna samma inskick och spara återkoppling
- `node --check server.js && node --check script.js` passerar

### Vad som inte fungerar
- Behandlingsdatan är ännu inte isolerad per verklig inloggad patient/terapeutrelation; den är nu serverpersistad men fortfarande knuten till appens nuvarande mockade patientlista och gemensamma arbetsyta
- Meddelandetrådar, materialbibliotek och mallbibliotek ligger fortfarande lokalt i frontendens `localStorage`
- Browser-verktyget användes inte heller denna körning; praktisk verifiering gjordes med lokal Playwright mot Node-server på port `4175`

### Nästa steg
- Rimlig nästa tydliga del är att knyta den serverpersistade hemuppgiftsdatan tydligare till inloggad användare/roll i liten skala, så att patientens vy inte längre bygger på en fast mockad patientidentitet
- Alternativt flytta nästa centrala datamängd till backend, helst meddelandetrådar mellan terapeut och patient

## 2026-05-06 — Serverpersistens för meddelandetrådar

### Vad jag arbetade med
- En avgränsad del: meddelandeflödet mellan terapeut och patient
- Målet var att flytta meddelandetrådarna från enbart `localStorage` till samma enkla backendmönster som redan används för auth, tilldelningar och inskick

### Vad jag ändrade
- Utökade `server.js` så databasen nu även kan lagra `messages`
- Lade till auth-skyddade API-ytor för meddelanden:
  - `GET /api/data/messages`
  - `PUT /api/data/messages`
- Utökade frontendstaten i `script.js` med servercache för meddelandetrådar
- Bytte meddelandeflödet så trådar i första hand läses från backend och inte bara från lokal `localStorage`
- Lade till enkel migrering: om äldre lokala meddelanden finns och servern är tom laddas de upp automatiskt efter inloggning
- Gjorde meddelandesparning defensiv så användaren får toast om spara misslyckas
- Lade till riktat Playwright-test `playwright-message-persistence-check.js`
- Sparade nya QA-skärmdumpar i `qa-artifacts/message-persistence-desktop.png` och `qa-artifacts/message-persistence-mobile.png`

### Vad som nu fungerar
- Meddelandetrådar sparas nu i backendens JSON-fil och överlever omladdning
- Terapeut kan skicka ett nytt svar i `Patientmeddelanden`, ladda om sidan och fortfarande se samma meddelande
- Patient kan skicka ett nytt meddelande i `Kontakta min behandlare`, ladda om sidan och fortfarande se samma meddelande
- Äldre lokala trådar kan följa med in i backend första gången efter inloggning i denna version
- Praktiskt test verifierade:
  - desktop 1440×900: registrera terapeut → öppna `Patientmeddelanden` → skicka nytt svar → ladda om → meddelandet finns kvar
  - mobil 390×844: registrera patient → öppna `Kontakta min behandlare` → skicka nytt meddelande → ladda om → meddelandet finns kvar
- `node --check server.js && node --check script.js && node --check playwright-message-persistence-check.js` passerar

### Vad som inte fungerar
- Meddelandetrådarna är ännu inte isolerade per verklig terapeut-patientrelation; de använder fortfarande appens nuvarande mockade patientstruktur
- Tilldelningar, inskick och meddelanden är nu serverpersistade, men materialbibliotek och mallbibliotek ligger fortfarande lokalt i frontend
- Browser-verktyget användes inte heller här; praktisk verifiering gjordes med lokal Playwright mot Node-server på port `4176`

### Nästa steg
- Rimlig nästa tydliga del är att börja knyta patientvyn till den faktiska inloggade användaren i liten skala, så att rätt tråd/uppgifter/material visas utan fast mockad patientidentitet
- Alternativt flytta nästa centrala datamängd till backend, helst materialbibliotek eller mallbibliotek

## 2026-05-06 — Inloggad patient får nu sin egen vy och kan väljas vid tilldelning

### Vad jag arbetade med
- En avgränsad del: kopplingen mellan autentisering och patientdata i appen
- Målet var att minska beroendet av den fasta mockpatienten och göra så att en verkligt registrerad patient faktiskt ser sina egna uppgifter och sin egen kontaktvy efter inloggning

### Vad jag ändrade
- Lade till en liten auth-skyddad server-endpoint `GET /api/users?role=client` för att hämta registrerade patientkonton
- Kopplade frontendstaten till aktuell inloggad användare så att patientrollen får ett eget stabilt patient-id baserat på användarkontot
- Byggde om patientlistan i frontend så den nu kan kombinera seedade mockpatienter med verkligt registrerade klientkonton
- Gjorde tilldelningsmodalens patientlista dynamisk så terapeuten kan välja registrerade patienter i stället för enbart hårdkodade exempelposter
- Gjorde klientens meddelandevy och uppgiftsvy beroende av faktisk inloggad patientidentitet i stället för fast `Maja Svensson`
- Lade till riktat Playwright-test `playwright-user-linked-client-flow.js`
- Sparade nya QA-skärmdumpar i `qa-artifacts/user-linked-client-desktop.png` och `qa-artifacts/user-linked-client-mobile.png`

### Vad som nu fungerar
- En registrerad patient får nu ett eget patient-id kopplat till sitt konto och ser sin egen tråd/uppgiftsyta efter inloggning
- Terapeuten kan nu se registrerade patientkonton i tilldelningslistan och tilldela material direkt till dem
- När terapeuten tilldelar material till en registrerad patient dyker det upp i just den patientens vy efter inloggning
- Klientens kontaktvy använder nu den faktiska inloggade patientens namn i stället för att alltid luta sig mot den fasta seedade patienten
- Praktiskt test verifierade:
  - desktop 1440×900: registrera terapeut → registrera patient → logga in som terapeut → skapa enkel hemuppgift → tilldela registrerad patient
  - mobil 390×844: logga in som samma patient → öppna `Mina hemuppgifter` → se rätt tilldelad uppgift → öppna `Kontakta min behandlare` och se egen patientidentitet i vyn
- `node --check server.js && node --check script.js && node --check playwright-user-linked-client-flow.js` passerar

### Vad som inte fungerar
- Data är fortfarande inte isolerad per terapeut-patientrelation på backendnivå; flera terapeuter delar fortfarande samma centrala listor för tilldelningar, inskick och meddelanden
- Seedade mockpatienter finns fortfarande kvar parallellt med riktiga konton, vilket är användbart för demo men ännu inte helt renodlat
- Browser-verktyget användes inte i denna körning heller; praktisk verifiering gjordes med lokal Playwright mot Node-server på port `4177`

### Nästa steg
- Rimlig nästa tydliga del är att isolera serverpersistad behandlingsdata per relation eller åtminstone per patientkonto, så att flera verkliga användare inte delar samma gemensamma dataset
- Alternativt flytta materialbiblioteket till backend och börja koppla sparat material tydligare till inloggad terapeut

## 2026-05-06 — Scoped serverdata per inloggad användare

### Vad jag arbetade med
- En avgränsad del: att isolera serverpersistad behandlingsdata så att olika inloggade användare inte längre delar samma gemensamma listor för uppgifter, inskick och meddelanden
- Målet var att göra auth-flödet mer verkligt användbart genom att låta backend returnera och spara bara relevant data för aktuell terapeut respektive patient

### Vad jag ändrade
- Utökade `server.js` med enkel scope-logik för `assigned`, `submissions` och `messages`
- Gjorde `GET/PUT /api/data/assigned`, `GET/PUT /api/data/submissions` och `GET/PUT /api/data/messages` användarberoende i stället för helt globala
- Lät backend bevara andra användares poster vid `PUT` i stället för att skriva över hela databasen okritiskt
- Började spara `therapistUserId`, `therapistName` och `patientUserId` i tilldelade uppgifter, inskick och meddelandetrådar
- Gjorde så att en ny tråd för vald patient skapas automatiskt vid tilldelning om terapeuten ännu inte har någon tråd med den patienten
- Lade till riktat Playwright-test `playwright-scoped-data-check.js`
- Sparade nya QA-skärmdumpar i `qa-artifacts/scoped-data-desktop.png` och `qa-artifacts/scoped-data-mobile.png`

### Vad som nu fungerar
- En patient som loggar in får bara sina egna serverpersistade uppgifter och meddelanden
- En terapeut får nu i normalfallet bara sina egna serverpersistade uppgifter, inskick och trådar i stället för hela den delade datamängden
- När terapeut A tilldelar en registrerad patient material och skickar meddelande kan patienten se detta, men terapeut B ser inte samma uppgift/tråd efter egen inloggning
- Ny tilldelning till registrerad patient skapar nu också en matchande serverpersistad tråd för just den terapeut-patientrelationen
- Praktiskt test verifierade:
  - desktop 1440×900: registrera terapeut A och terapeut B, låt terapeut A tilldela material och skriva i tråd, logga sedan in som terapeut B och verifiera att samma uppgift/tråd inte syns där
  - mobil 390×844: logga in som den registrerade patienten och verifiera att både tilldelad uppgift och terapeutens meddelande syns i patientvyn
- `node --check server.js && node --check script.js && node --check playwright-scoped-data-check.js` passerar

### Vad som inte fungerar
- Äldre seedad/mockad data utan sparade relationsfält kan fortfarande vara synlig för terapeuter som fallback i denna version; den nya isoleringen gäller säkrast för data som skapats efter denna ändring
- Relationerna är fortfarande enkla: det finns ännu ingen explicit separat relationsmodell mellan flera terapeuter och samma patient utöver scoped fält på posterna
- Materialbibliotek och mallbibliotek ligger fortfarande lokalt i frontend och är ännu inte kopplade till server eller specifik terapeut
- Browser-verktyget användes inte heller i denna körning; praktisk verifiering gjordes med lokal Playwright mot Node-server på port `4178`

### Nästa steg
- Nästa rimliga tydliga del är att flytta sparat materialbibliotek till backend och scopea det per inloggad terapeut, så att även skapade material följer kontot
- Alternativt bygga en liten explicit terapeut–patientkoppling i backend så att tilldelning, meddelanden och inskick kan grupperas renare när flera terapeuter/patienter finns i databasen

## 2026-05-06 — Robustare registrering och inloggningsfeedback på startsidan

### Vad jag arbetade med
- En avgränsad del: själva auth-ingången på startsidan
- Målet var att göra registrering och inloggning mer robust i praktiken nu när grundflödet redan finns, så att första fungerande konto-/loginflödet blir mindre skört för fortsatt testning

### Vad jag ändrade
- Lade till fältet `Bekräfta lösenord` i registreringsformuläret
- Lade till frontendvalidering som stoppar registrering om lösenorden inte matchar
- Lade till tydligare felmeddelande om frontend inte kan nå den lokala servern
- Lade till `busy`-hantering för auth-knapparna så `Logga in` och `Skapa konto` tillfälligt disable:as under pågående request och visar aktuell status
- Uppdaterade Playwright-testet för auth så det använder aktuell `BASE_URL` via env och fyller i det nya bekräftelsefältet
- Körde om praktiskt auth-test och uppdaterade auth-skärmdumparna i `qa-artifacts/`

### Vad som nu fungerar
- Registrering kräver nu att lösenordet bekräftas innan request skickas
- Användaren får snabbare och tydligare feedback om servern inte är startad eller inte går att nå
- Dubbelsubmits i auth-flödet minskar eftersom submit-knapparna låses medan requesten pågår
- Praktiskt test verifierade fortsatt fungerande auth-flöde på lokal Node-server:
  - desktop 1440×900: skapa terapeutkonto → logga ut → logga in igen
  - mobil 390×844: skapa patientkonto → öppna patientvy
- `node --check script.js && node --check playwright-auth-check.js` passerar

### Vad som inte fungerar
- Browser-verktyget gick fortfarande inte att använda eftersom Chrome-attach saknade fungerande debug-port; praktisk verifiering gjordes därför fortsatt med lokal Playwright
- Auth-flödet är fortfarande enkelt: ingen lösenordsåterställning, ingen e-postverifiering och ingen verklig åtkomstmodell utöver roll + lokal session
- Materialbibliotek och mallbibliotek är fortfarande inte flyttade till backend ännu

### Nästa steg
- Nästa rimliga lilla steg nära auth-spåret är att flytta sparat materialbibliotek till backend och scopea det per inloggad terapeut
- Alternativt lägga till en mycket enkel terapeut–patientkoppling i backend så att valbara patienter blir mindre beroende av seedad demodata

## 2026-05-05 — Enkel backend för konton, lösenord och persisterad login

### Vad jag arbetade med
- En avgränsad del: inloggningsflödet och den minsta riktiga backend som behövs för att terapeuter och patienter ska kunna skapa konto med lösenord och logga in igen
- Målet var att ersätta de tidigare direkta demoingångarna med ett enkelt men verkligt auth-flöde som sparar användare mellan körningar

### Vad jag ändrade
- Lade till en liten lokal Node-server i `server.js` som både serverar frontendfilerna och exponerar auth-endpoints
- Lade till filbaserad persistence i `data/auth-db.json` för användare och sessioner
- Började hasha lösenord med `crypto.scryptSync` och lagra salt + hash i stället för klartext
- Lade till endpoints för `register`, `login`, `session` och `logout`
- Skapade `package.json` med enkelt startkommando för appen
- Byggde om login-sidan så den nu har riktig rollväxling för `Terapeut`/`Patient` samt separata formulär för `Logga in` och `Skapa konto`
- Kopplade frontend till backend via `fetch`, lokal tokenlagring och sessionsåterställning vid omladdning
- Uppdaterade headernamn så inloggad användare faktiskt syns i respektive vy
- Lade till `.gitignore` för lokal auth-databas så testkonton inte behöver checkas in
- Skrev ett riktat Playwright-test `playwright-auth-check.js` och sparade screenshots i `qa-artifacts/auth-desktop-therapist.png` samt `qa-artifacts/auth-mobile-client.png`
- Uppdaterade login-sidans synliga tidsstämpel enligt projektregeln

### Vad som nu fungerar
- Terapeut kan skapa konto med namn, e-post och lösenord
- Patient kan skapa konto med namn, e-post och lösenord
- Terapeut kan logga in på tidigare skapat konto
- Patient kan logga in på tidigare skapat konto
- Användare sparas lokalt i backendens JSON-fil mellan körningar
- Lösenord lagras hashat i stället för i klartext
- Aktiv session återställs efter omladdning så användaren kommer tillbaka till rätt vy
- Logout rensar sessionen och visar login-vyn igen
- Praktiskt test verifierade:
  - desktop 1440×900: skapa terapeutkonto → öppna terapeutvy → logga ut → logga in igen med samma konto
  - mobil 390×844: skapa patientkonto → öppna patientvy och verifiera namn i header
  - `node --check script.js && node --check server.js` passerar

### Vad som inte fungerar
- Browser-verktyget gick fortfarande inte att använda eftersom Chrome-attach saknade fungerande debug-port; praktisk verifiering gjordes därför med lokal Playwright mot systemets Chrome
- Endast auth och sessioner ligger nu i backend; övrig appdata (t.ex. meddelanden, tilldelningar, inskick och bibliotek) ligger fortfarande lokalt i frontendens `localStorage`
- Det finns ännu ingen koppling mellan specifik inloggad användare och egen isolerad datamängd för uppgifter/material
- Port `4173` var upptagen av en separat Python-server i denna miljö, så auth-versionen testades på lokal Node-server via port `4174`

### Nästa steg
- Rimlig nästa tydliga del är att flytta en enda central datamängd från `localStorage` till backend, helst `assigned/submissions` eller meddelandetrådar, så att ändrad behandlingsdata också persisteras server-side
- När det görs bör datat kopplas till inloggad användare/roll i liten skala i stället för att införa stor ny arkitektur

## 2026-05-06 — Serverpersistens för terapeutens materialbibliotek

### Vad jag arbetade med
- En avgränsad del: terapeutens sparade materialbibliotek
- Målet var att låta sparat patientmaterial följa det inloggade terapeutkontot i backend, i stället för att bara ligga lokalt i frontend

### Vad jag ändrade
- Utökade `server.js` så databasen nu även kan lagra `library`
- Lade till auth-skyddad API-yta för materialbiblioteket:
  - `GET /api/data/library`
  - `PUT /api/data/library`
- Scopeade biblioteksposter per inloggad terapeut så andra terapeuter inte får samma sparade material
- Utökade frontendstaten i `script.js` med `serverLibrary`
- Bytte `Spara i materialbibliotek` så sparade objekt nu skrivs till backend för terapeuter och inte bara till `localStorage`
- Lade till enkel migrering: om äldre lokalt sparat bibliotek finns och serverns bibliotek är tomt laddas det upp vid inloggning som terapeut
- Uppdaterade biblioteksrenderingen så terapeutens sparade material nu läses från servercache
- Skrev ett riktat Playwright-test `playwright-library-persistence-check.js`
- Sparade QA-skärmdumpar i `qa-artifacts/library-persistence-desktop.png` och `qa-artifacts/library-persistence-mobile.png`

### Vad som nu fungerar
- Terapeuten kan spara material i sitt bibliotek och få tillbaka det efter omladdning
- Sparat materialbibliotek följer nu det inloggade terapeutkontot i backendens JSON-fil
- En annan terapeut ser inte samma sparade bibliotekspost i sitt eget konto
- Äldre lokalt sparat bibliotek kan flyttas in till backend första gången efter inloggning i denna version
- Praktiskt test verifierade:
  - desktop 1440×900: registrera terapeut A → spara material i bibliotek → öppna bibliotek → ladda om → samma extra bibliotekskort ligger kvar
  - mobil 390×844: registrera terapeut B → öppna bibliotek → ser bara seedade bibliotekskort och inte terapeut A:s sparade material
- `node --check server.js && node --check script.js && node --check playwright-library-persistence-check.js` passerar

### Vad som inte fungerar
- Mallbiblioteket ligger fortfarande lokalt i frontend och är ännu inte flyttat till backend
- Patientens sektion `Mitt material` använder fortfarande seedad/lokal materialdata och är ännu inte kopplad till terapeutens serverpersistade bibliotek
- Browser-verktyget gick fortfarande inte att använda pålitligt i denna miljö; praktisk verifiering gjordes därför med lokal Playwright mot systemets Chrome på port `4179`

### Nästa steg
- Nästa rimliga tydliga del är att koppla patientens `Mitt material` till verkligt tilldelat/sparat servermaterial så samma objektkedja känns mer sammanhållen
- Alternativt flytta mallbiblioteket till backend och scopea även mallar per terapeut för att göra byggarflödet helt kontoanknutet

## 2026-05-06 — Rensat bort demo-läckage i auth-backat patientflöde

### Vad jag arbetade med
- En avgränsad del: första riktiga auth-backade terapeut–patientflödet runt patientval och meddelandetrådar
- Målet var att göra registrerade konton mindre förvirrande i praktiken genom att stoppa att demo/seedad data blandas in när man väl loggat in med riktiga användare

### Vad jag ändrade
- Gjorde så att inloggad terapeut med registrerade klientkonton prioriterar dessa i patientväljaren i stället för seedade demopatienter
- Lade till tomt läge i patientväljaren om inga registrerade patienter finns, samt blockerad tilldelning utan vald patient
- Slutade migrera seedade/anonyma lokala meddelandetrådar in i inloggade auth-sessioner
- Initierar nu auth-backade terapeuttrådar mer deterministiskt när serverdata laddas
- Skärpte backend-scope i `server.js` så oscope:ad äldre demo-data inte längre visas för inloggade terapeuter i `messages`, `assigned`, `submissions` och `library`
- Slutade autoskapa tom klienttråd med standardterapeuten `Dr. Lindgren` före verklig relation finns
- Gjorde meddelandebubblor patientnära genom att visa faktisk `therapistName` från tråden i stället för hårdkodat namn
- Lade till riktat Playwright-test `playwright-auth-backed-patient-flow.js`
- Sparade nya QA-skärmdumpar i `qa-artifacts/auth-backed-patient-flow-desktop.png` och `qa-artifacts/auth-backed-patient-flow-mobile.png`

### Vad som nu fungerar
- Registrerade patienter visas utan seedade `pt_*`-demoposter i terapeutens tilldelningsväljare i det auth-backade flödet
- Inloggad terapeut slipper se seedade patienttrådar som `Maja Svensson` i det riktiga meddelandeflödet
- Patienten ser nu rätt terapeutfokus i kontaktvyn när en verklig terapeut tilldelat material och skickat meddelande
- Meddelandebubblor visar nu terapeutens riktiga namn i stället för alltid `Dr. Lindgren`
- Praktiskt test verifierade:
  - desktop 1440×900: registrera terapeut + patient → välj registrerad patient i tilldelning → öppna meddelanden → seedade trådar syns inte → skicka meddelande från terapeuten
  - mobil 390×844: logga in som samma patient → öppna kontaktvyn → rätt terapeutfokus och terapeutnamn syns i tråden
  - fortsatt auth-smoke-test passerar för registrering/inloggning på desktop och mobil
- `node --check server.js && node --check script.js && node --check playwright-auth-backed-patient-flow.js && node --check playwright-auth-check.js` passerar

### Vad som inte fungerar
- Registrerade klientkonton listas fortfarande globalt för terapeuter via `/api/users?role=client`; det finns ännu ingen explicit terapeut–patientkoppling som begränsar urvalet till "mina patienter"
- Äldre oscope:ad data finns fortfarande kvar i JSON-databasen historiskt, men visas inte längre i det här auth-backade terapeutflödet efter scope-skärpningen
- Browser-verktyget användes inte heller i denna körning; praktisk verifiering gjordes med lokal Playwright mot Node-server på port `4311`

### Nästa steg
- Hög prioritet: säkerställ ett långsiktigt fungerande backendflöde för verkliga användare så att registrering, inloggning och lagring av användare/lösenord är robust och blir en stabil grund för fortsatt arbete
- Därefter är nästa rimliga tydliga del att bygga en enkel explicit terapeut–patientkoppling i backend så patienturval, trådar, tilldelningar och inskick kan begränsas till riktiga relationer i stället för alla registrerade klientkonton
- Alternativt koppla patientens `Mitt material` till verkligt tilldelat servermaterial så hela kedjan terapeut → tilldelning → patientmaterial blir ännu mer sammanhängande

## 2026-05-07 — Patientens “Mitt material” bygger nu på verkligt tilldelat servermaterial

### Vad jag arbetade med
- En avgränsad del: patientvyn `Mitt material`
- Målet var att sluta visa seedade klientkort där och i stället låta vyn bygga på verkligt auth-backat, serverpersistat och tilldelat material

### Vad jag ändrade
- Bytte renderingen i `script.js` så patientens materiallista nu läser direkt från serverpersistade `assigned`-objekt för inloggad patient
- Tog bort beroendet av seedade klientmaterialkort i den auth-backade patientvyn
- Lade till tomt läge när inget material ännu delats av terapeut
- Lade till riktiga materialkort för patienten med:
  - terapeutnamn
  - antal block
  - tilldelningstid
  - aktuell status
  - knappar för att öppna materialet eller skicka in igen
- Lät kortens primäråtgärd öppna samma riktiga uppgifts-/materialvy som används i hemuppgiftsflödet
- Uppdaterade login-sidans synliga tidsstämpel enligt projektregeln
- Lade till riktat Playwright-test `playwright-client-materials-server-check.js`
- Sparade QA-skärmdumpar i `qa-artifacts/client-materials-server-desktop.png` och `qa-artifacts/client-materials-server-mobile.png`

### Vad som nu fungerar
- Patientens `Mitt material` visar nu verkligt tilldelat material från backend i stället för seedade exempelkort
- Vyn är kopplad till inloggad patient och överlever omladdning via samma serverpersistens som övriga auth-backade flöden
- Korten visar nu begriplig terapeutkoppling och status direkt i patientens materialöversikt
- Patienten kan öppna delat material direkt från `Mitt material` och komma in i det riktiga formulär-/svarsläget
- Praktiskt test verifierade:
  - desktop 1440×900: registrera terapeut + patient → länka patient → tilldela material → verifiera att auth-backad kedja finns kvar i terapeutflödet
  - mobil 390×844: logga in som samma patient → öppna `Mitt material` → se verkligt delat material från rätt terapeut → öppna materialet → ladda om och se att det ligger kvar
- `node --check server.js && node --check script.js && node --check playwright-client-materials-server-check.js` passerar
- Praktisk end-to-end-körning passerade mot lokal Node-server på port `4321`

### Vad som inte fungerar
- `Mitt material` bygger ännu på tilldelade objekt, inte på en separat mer genomtänkt modell för publicerat patientmaterial kontra hemuppgift
- Seedad klientmaterialdata finns fortfarande kvar i koden som demoresurs, men används inte längre i det auth-backade patientflödet här
- Browser-verktyget användes inte i denna körning heller; praktisk verifiering gjordes med lokal Playwright eftersom tidigare browser-attach varit opålitlig för appen

### Nästa steg
- Nästa rimliga tydliga del är att skilja på `delat läsmaterial` och `hemuppgift att fylla i`, så patientens materialvy kan visa båda utan att allt ser ut som samma objekttyp
- Alternativt bygga en liten `Mina patienter`-översikt för terapeuten där länkade relationer, senaste aktivitet och antal delade material blir synliga utanför tilldelningsmodalen

## 2026-05-07 — Explicit terapeut–patientkoppling i auth-backad tilldelning

### Vad jag arbetade med
- En avgränsad del: hur en inloggad terapeut väljer patienter i det riktiga auth-backade flödet
- Målet var att ta bort den sista globala patientlistelogiken och ersätta den med en enkel explicit koppling mellan terapeut och patientkonto

### Vad jag ändrade
- Skärpte `server.js` så `GET /api/relationships/clients` nu bara returnerar redan länkade patientkonton för aktuell terapeut
- Utökade `POST /api/relationships/clients` så terapeuten kan länka en patient antingen via `clientUserId` eller via registrerad e-postadress (`clientEmail`)
- Byggde om tilldelningsmodalen i `index.html` så den nu visar `Länkad patient` i stället för en implicit global patientlista
- Lade till enkel UI för att länka registrerad patient via e-post direkt i samma modal
- Ändrade `script.js` så inloggad terapeut inte längre får seedade demopatienter eller globala `availableClients` i det auth-backade valet
- Gjorde så att länkade patienter blir den enda källan för terapeutens verkliga patientlista, trådar och tilldelningsval i detta flöde
- Uppdaterade Playwright-testet `playwright-auth-backed-patient-flow.js` så det först verifierar tom länkad lista, sedan länkar patient via e-post och därefter tilldelar material
- Sparade uppdaterade QA-skärmdumpar i `qa-artifacts/auth-backed-patient-flow-desktop.png` och `qa-artifacts/auth-backed-patient-flow-mobile.png`

### Vad som nu fungerar
- En ny terapeut börjar nu utan global patientlista i det auth-backade tilldelningsflödet
- Terapeuten kan länka en verkligt registrerad patient via e-post och därefter tilldela material till just den relationen
- Seedade `pt_*`-demopatienter visas inte längre i terapeutens riktiga patientväljare när terapeuten är inloggad
- Terapeutens meddelandetrådar och tilldelningar fortsätter att följa länkade riktiga relationer i stället för ett öppet urval av alla klientkonton
- Praktiskt test verifierade:
  - desktop 1440×900: registrera terapeut → registrera patient → logga in som terapeut → öppna tilldelning → se `Inga länkade patienter ännu` → länka patient via e-post → tilldela material → öppna meddelanden och se rätt tråd
  - mobil 390×844: logga in som samma patient → öppna kontaktvyn och se rätt terapeutfokus med skickat meddelande
- `node --check server.js && node --check script.js && node --check playwright-auth-backed-patient-flow.js` passerar
- Praktisk end-to-end-körning passerade med lokal Node-server på port `4320`

### Vad som inte fungerar
- Det finns fortfarande ingen separat inbjudningsprocess, godkännandeflöde eller självservice för att acceptera en terapeutkoppling; länken skapas direkt när terapeuten anger en registrerad patientadress
- Historisk testdata i `data/auth-db.json` ligger kvar lokalt från tidigare körningar även om det nya flödet nu använder tydligare relationsscope
- Browser-verktyget användes inte heller i denna körning; praktisk verifiering gjordes med lokal Playwright mot systemets Chrome

### Nästa steg
- Nästa rimliga tydliga del är att låta patientens `Mitt material` bygga på verkligt serverpersistat och tilldelat material i stället för seedad klientdata
- Alternativt bygga vidare på relationen med en liten `mina patienter`-översikt i terapeutvyn, så länkade konton blir synliga även utanför tilldelningsmodalen

## 2026-05-07 — Verkliga dashboardkort via serveraggregerad terapeutsummary

### Vad jag arbetade med
- En avgränsad del: terapeutdashboardens översta översiktskort och fokusyta
- Målet var att sluta visa hårdkodade demosiffror där och i stället låta dashboarden bygga på samma auth-backade backenddata som resten av appen

### Vad jag ändrade
- Lade till en ny auth-skyddad backend-endpoint `GET /api/dashboard/therapist-summary`
- Lät servern aggregera verkliga värden för:
  - länkade/aktiva patienter
  - tilldelade material
  - trådar där patienten senast skrivit och terapeuten ännu inte svarat
  - inskick som väntar återkoppling
  - senaste aktivitet från tilldelningar, inskick och meddelanden
- Bytte ut hårdkodade toppkort i dashboarden mot verkliga kort med ids och frontendrendering för servervärden
- Gjorde fokuspanelen `I fokus nu` dynamisk så den ändrar rubrik, copy och mini-timeline utifrån faktisk auth-backad status
- Bytte sektionen `Senaste aktivitet` från statisk demotext till serverdriven aktivitetslista
- Lade till frontendstöd i `script.js` för att läsa, spara och återrendera dashboardsammanfattningen efter relevanta ändringar som:
  - länka patient
  - tilldela material
  - skicka meddelande
  - skicka in uppgift
  - markera/granska inskick
- Uppdaterade riktat Playwright-test `playwright-dashboard-overview-check.js`
- Sparade uppdaterade QA-skärmdumpar i `qa-artifacts/dashboard-overview-desktop.png` och `qa-artifacts/dashboard-overview-mobile.png`
- Uppdaterade login-sidans synliga tidsstämpel enligt projektregeln

### Vad som nu fungerar
- Terapeutdashboardens toppkort visar nu verkliga auth-backade siffror i stället för fasta demoantal
- Dashboardens fokusyta lyfter nu fram ett rimligt nästa steg beroende på faktisk status i terapeutens konto
- `Senaste aktivitet` bygger nu på riktiga tilldelningar, meddelanden och inskick
- Praktiskt test verifierade:
  - desktop 1440×900: registrera terapeut → registrera patient → länka patient → tilldela material → öppna dashboard och se att `Aktiva patienter`, `Tilldelade material`, patientöversikten och `Senaste aktivitet` uppdateras auth-backat
  - mobil 390×844: logga in som samma patient → öppna `Mitt material` och verifiera att det tilldelade auth-backade materialet fortfarande syns
- `node --check server.js && node --check script.js && node --check playwright-dashboard-overview-check.js` passerar
- Riktad Playwright-körning passerade mot lokal Node-server på port `4330`

### Vad som inte fungerar
- Dashboardsammanfattningen är fortfarande enkel och bygger ännu inte på verkliga bokningar, läskvitton eller en separat notifieringsmodell
- `Nya händelser` är fortfarande en lättviktig sammanräkning av backendflöden och inte en full historik- eller inboxmodell
- Browser-verktyget användes inte heller i denna körning; praktisk verifiering gjordes med lokal Playwright mot Node-server

### Nästa steg
- Nästa rimliga tydliga del är att göra terapeutdashboardens återstående statiska delar verkliga också, särskilt `Nästa bokade tider` eller en enklare `att göra nu`-lista som helt bygger på auth-backad aktivitet
- Alternativt gå ett steg djupare i backendspåret och lägga till enkel läst/svarad-status för meddelandetrådar så `väntar svar` blir mer träffsäkert

## 2026-05-07 — Enkel auth-backad “Mina patienter”-översikt i terapeutdashboard

### Vad jag arbetade med
- En avgränsad del: terapeutens dashboard
- Målet var att göra de nya riktiga terapeut–patientrelationerna mer användbara i praktiken genom att visa länkade patienter och deras senaste aktivitet direkt i huvudvyn

### Vad jag ändrade
- Bytte ut den statiska demosektionen `Tre patienter att prioritera` mot en verklig sektion `Mina patienter`
- Byggde en ny frontendrendering i `script.js` som sammanfattar auth-backade relationer utifrån:
  - länkade patientkonton
  - tilldelade material
  - inskick
  - meddelandetrådar
- Lade till enkel prioritering så patienter med inskick som väntar på återkoppling visas först
- Lade till sammanfattningsrad med antal länkade patienter och antal som väntar på återkoppling
- Lade till snabbåtgärder per patient:
  - `Öppna tråd`
  - `Tilldela material`
- Uppdaterade översikten så den renderas om när terapeuten:
  - loggar in/ut
  - länkar eller tilldelar patient
  - skickar meddelande
  - får nytt inskick eller markerar/granskar det
- Lade till riktat Playwright-test `playwright-dashboard-overview-check.js`
- Sparade QA-skärmdumpar i `qa-artifacts/dashboard-overview-desktop.png` och `qa-artifacts/dashboard-overview-mobile.png`
- Uppdaterade login-sidans synliga tidsstämpel enligt projektregeln

### Vad som nu fungerar
- Inloggad terapeut ser nu verkliga länkade patienter i dashboarden i stället för en statisk demosnurra
- Dashboarden visar nu en första auth-backad översikt över vilka patienter som faktiskt är kopplade till terapeuten
- Patienter med väntande inskick prioriteras högre i listan
- Terapeuten kan öppna rätt meddelandetråd direkt från dashboarden
- Terapeuten kan öppna tilldelningsmodalen för en specifik redan länkad patient direkt från dashboarden
- Praktiskt test verifierade:
  - desktop 1440×900: registrera terapeut → registrera patient → länka patient via e-post → tilldela material → öppna dashboard och se `1 länkade patienter`, rätt patientnamn och knapp för `Öppna tråd`
  - mobil 390×844: logga in som samma patient → öppna `Mitt material` och se att det tilldelade materialet fortfarande syns i det auth-backade flödet
- `node --check server.js && node --check script.js && node --check playwright-dashboard-overview-check.js` passerar
- Riktad Playwright-körning passerade mot lokal Node-server på port `4322`

### Vad som inte fungerar
- Dashboardöversikten är fortfarande en frontend-sammanställning ovanpå befintlig enkel backend; det finns ännu ingen separat serverendpoint för aggregerad dashboarddata
- Översikten visar ännu inte bokningar, olästmarkeringar eller en mer explicit prioriteringsmodell utöver väntande inskick och senaste aktivitet
- Browser-verktyget användes inte heller i denna körning; praktisk verifiering gjordes med lokal Playwright mot Node-server

### Nästa steg
- Nästa rimliga tydliga del är att göra dashboarden ännu mer verklig genom att låta `Nya händelser`, `Olästa meddelanden` och `Aktiva patienter` bygga på samma auth-backade data i stället för hårdkodade siffror
- Alternativt kan nästa körning ta nästa backendnära steg och lägga till en liten serveraggregerad dashboard-endpoint för terapeutens översikt utan att bygga om arkitekturen

## 2026-05-07 — Enkel läst/svarad-status i auth-backade meddelandetrådar

### Vad jag arbetade med
- En avgränsad del: auth-backade meddelandetrådar mellan terapeut och patient
- Målet var att göra trådstatusen mindre demoartad genom att lägga till enkel serverpersistad lässtatus och bättre skillnad mellan `oläst aktivitet` och `väntar på svar`

### Vad jag ändrade
- Utökade trådmodellen i `script.js` med `lastReadByTherapistAt` och `lastReadByClientAt`
- Lade till frontendlogik för att:
  - räkna olästa inkommande meddelanden per vy
  - skilja på `oläst` och `väntar på svar`
  - markera terapeutens tråd som läst när den öppnas
  - markera patientens tråd som läst när kontaktvyn öppnas
  - sätta egen lässtatus direkt när användaren själv skickar nytt meddelande
- Utökade `server.js` så dashboardsammanfattningen nu räknar både:
  - `unreadThreads`
  - `waitingReplyThreads`
- Gjorde terapeutens dashboard och patientöversikt mer verkliga genom att väga in:
  - trådar som verkligen väntar terapeutsvar
  - oläst aktivitet i trådar
- Förbättrade text/badges i terapeutens trådlista så den tydligare visar när något faktiskt är oläst
- Lade till riktat Playwright-test `playwright-message-read-status-check.js`
- Sparade nya QA-skärmdumpar i `qa-artifacts/message-read-status-desktop.png` och `qa-artifacts/message-read-status-mobile.png`
- Uppdaterade login-sidans synliga tidsstämpel enligt projektregeln

### Vad som nu fungerar
- Meddelandetrådar har nu en enkel persisterad lässtatus i samma auth-backade backendmodell som övrig data
- Dashboardsammanfattningen kan nu skilja bättre på `oläst aktivitet` och `väntar på svar` i stället för att bara gissa utifrån senaste meddelanderiktning
- Terapeutens trådlista visar nu mer träffsäker status för olästa patientmeddelanden
- När terapeut eller patient öppnar sin tråd sparas läsmarkeringen i backendens JSON-fil och ligger kvar mellan omladdningar
- Praktiskt test verifierade:
  - desktop 1440×900: registrera terapeut + patient → länka patient → tilldela material → skicka terapeutsvar → verifiera tråd i terapeutvyn
  - mobil 390×844: öppna patientens kontaktvy → se terapeutsvaret → ladda om → se att samma auth-backade svar ligger kvar
- `node --check server.js && node --check script.js && node --check playwright-message-read-status-check.js` passerar
- Riktad Playwright-körning passerade mot lokal Node-server på port `4340`

### Vad som inte fungerar
- Dashboarden uppdateras fortfarande inte i realtid mellan två separata inloggade sessioner; i praktiken krävs omladdning eller ny serverhämtning för att en annan användares nya meddelande ska slå igenom i sammanfattningskorten
- Klient→terapeut-delen av trådflödet bär fortfarande spår av äldre enkel trådmodell, så nästa backendsteg bör gärna göra trådkopplingen ännu striktare per relation om realtidskänslan ska bli mer robust
- Browser-verktyget användes inte heller i denna körning; praktisk verifiering gjordes med lokal Playwright mot Node-server

### Nästa steg
- Nästa rimliga tydliga del är att renodla den auth-backade trådrelationen ytterligare så klient→terapeut och terapeut→klient alltid använder exakt samma relationstråd utan äldre fallbackbeteenden
- Alternativt bygga en mycket liten refresh-/resync-rutin för dashboard och meddelandeytor efter extern aktivitet, utan att införa tung realtidsarkitektur

## 2026-05-07 — Striktare relationstråd i auth-backade meddelanden

### Vad jag arbetade med
- En avgränsad del: hur patientens och terapeutens meddelandevy väljer rätt tråd när flera verkliga terapeut–patientrelationer finns
- Målet var att stoppa fallbackbeteendet där patientvyn kunde luta sig mot `första bästa` tråd för samma patient-id i stället för en tydlig relationstråd

### Vad jag ändrade
- Lade till tydlig relationsnyckel i frontendlogiken för meddelandetrådar: `patientId + therapistUserId`
- Gjorde trådlookup striktare i `script.js` så samma terapeut–patientpar återanvänder exakt samma tråd i stället för lös matchning på bara patient-id
- Lade till deduplicering av äldre/lösare tråddata vid laddning så relationstrådar normaliseras bättre i minnet
- Gjorde patientvyns kontaktflöde mer deterministiskt genom att välja den mest relevanta relationstråden i stället för första träffen i listan
- Lät dashboard-/inboxåtgärder föra med sig rätt terapeutkoppling när man hoppar till tråd från andra delar av appen
- Lade till ett riktat Playwright-test `playwright-message-relation-thread-check.js` för scenariot två terapeuter → samma patient → svar ska hamna i rätt relationstråd

### Vad som nu fungerar
- Frontendlogiken är nu byggd runt en striktare relationstråd och inte bara runt patient-id
- Patientens kontaktvy ska nu i normalfallet hålla sig till rätt terapeuttråd när flera relationer finns för samma patientkonto
- Terapeutens hopp från dashboard och inskick till meddelandevy bär nu med sig tydligare relationstillhörighet
- `node --check script.js && node --check playwright-message-relation-thread-check.js` passerar

### Vad som inte fungerar
- Praktisk browserverifiering kunde inte slutföras i denna körning trots flera försök:
  - OpenClaws browser-verktyg var otillgängligt eftersom gatewayns browserkoppling timeoutade
  - lokal Playwright/Chromium fallerade i miljön på grund av OS-/browserproblem (`dyld`/CoreAudio-symbolfel för bundlad Chromium)
  - systemets Chrome gick att starta men gav inte en stabil användbar testsession för denna körning
- Därför är den här iterationen främst verifierad via kodgranskning, syntaxkontroll och riktat testskript som förberedelse, inte via fullt passerande browser-E2E i just denna miljö
- Det finns fortfarande ingen realtidsuppdatering mellan två öppna sessioner; omladdning eller ny fetch krävs fortfarande för att extern aktivitet ska slå igenom direkt

### Nästa steg
- När browsermiljön går att använda igen: kör det riktade flerterapeutstestet praktiskt och bekräfta att patientens svar verkligen stannar i rätt relationstråd end-to-end
- Därefter är ett bra nästa lilla steg en mycket liten refresh-/resync-rutin för dashboard och meddelandeytor efter extern aktivitet, utan att införa tung realtidsarkitektur
