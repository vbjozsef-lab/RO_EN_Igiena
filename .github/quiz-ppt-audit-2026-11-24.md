# 12 LP Quiz Complet – PPT-forrásellenőrzés

Dátum: 2026-11-24. Forrás: a `prezentari/content/lp*-gz.js` / `lp6b.js` állományokban megőrzött, eredeti PowerPointból kinyert diatartalom és a gyökér `index.html` kérdésbankjai.

## 1. Állapot

| LP | RO kérdések | EN kérdések | Egyedi RO / EN | Előadási forrás olvasható? |
| --- | ---: | ---: | --- | --- |
| LP1A | 20 | 20 | 20 / 20 | igen |
| LP1B | 20 | 20 | 20 / 20 | igen |
| LP2A | 20 | 20 | 20 / 20 | igen |
| LP2B | 20 | 20 | 20 / 20 | igen |
| LP3A | 18 | 18 | 18 / 12 | **nem – sérült GZIP** |
| LP3B | 20 | 20 | 20 / 20 | igen |
| LP4A | 20 | 20 | 20 / 20 | igen |
| LP4B | 20 | 20 | 20 / 20 | igen |
| LP5A | 20 | 20 | 20 / 20 | igen |
| LP5B | 20 | 20 | 20 / 20 | **nem – sérült GZIP** |
| LP6A | 16 | 16 | 16 / 12 | **nem – sérült GZIP** |
| LP6B | 20 | 20 | 20 / 20 | igen |

Minden felsorolt kérdésnek négy válaszlehetősége van; minden helyes válasz indexe 0–3 közé esik. A 20 kérdéses állapot egyelőre **a GitHubon tárolt alap-kérdésbankra** vonatkozik: az alkalmazás távoli tanári szerkesztéseket is betölthet, amelyeket nem tudtunk lekérdezni.

## 2. Dia alapján hozzáadott kérdések

A következő, újonnan létrehozott kérdések a megfelelő bemutatók kinyert szövegrészein alapulnak. A kódban `sourcePptSlide` jelöli a forrásdiaszámot.

| LP | Dia | Téma / helyes válasz |
| --- | --- | --- |
| LP1A (EN) | 11 | Six-Bellami – maximum/minimum hőmérő |
| LP1A (EN) | 14 | Falfelület és levegő közötti megengedett hőmérséklet-különbség |
| LP1B | 12 | Gravimetriás pormérés – a minta tömegének meghatározása |
| LP1B | 27 | Pettenkofer CO₂-megkötés – Ba(OH)₂ |
| LP2A | 3 | CO – karboxihemoglobin |
| LP2A | 19 | Koch-módszer – 10 perces expozíció |
| LP2A | 22 | Felületi mikrobiológia – steril tampon |
| LP2B | 7 | CL – ablakfelület / padlófelület |
| LP2B | 18 | Luxmérés – legalább öt mérési pont |
| LP3B (RO és EN) | 6 | Durham-cső – a keletkező gáz összegyűjtése |
| LP3B (RO és EN) | 6 | E. coli azonosítási hőmérséklete – 44,5 °C |
| LP3B (RO és EN) | 9 | Aktívszenes szűrés – szerves anyagok adszorpciója |
| LP3B (EN) | 4, 6, 9, 13 | További forrásdia-kötött mikrobiológiai kérdések |
| LP6B | 4 | Ajánlott tanításkezdés – 8:30 |
| LP6B | 8 | Óraközi szünet – legalább 10 perc |
| LP6B | 18 | Anti-bullying jogszabály – Legea 221/2019 |
| LP6B | 19 | HBSC-felmérés – négyévenként |
| LP6B | 20 | Kedvező iskolai napok – kedd–csütörtök |
| LP6B | 20 | II–IV. osztály napi óraszáma – 4 |

Az EN nyelvű kiegészítések a román PowerPoint-diák szakmai tartalmának fordításai. A korábbi, meglévő több száz kérdésnél a diaszöveg teljes, egyenkénti tartalmi ellenőrzése **még nem zárult le**, ezért nem szabad minden helyes válaszra „PPT által igazolt” státuszt állítani.

## 3. Függő ellenőrzések és hibás források

1. `prezentari/content/lp3a-gz.js` – Base64-karakterszám nem osztható néggyel; a szabványos GZIP-dekódoló `invalid bit length repeat` hibát ad. A tesztből 2 hiányzik; angolul 6 ismétlődő tétel van.
2. `prezentari/content/lp5b-gz.js` – szabványos GZIP-dekódoló: `invalid distance too far back`. A kérdésszámot 20/20-ra csökkentettük a korábban létező kérdések közül, **de a PPT-támogatottságot nem tudjuk igazolni**.
3. `prezentari/content/lp6a-gz.js` – ugyanez a GZIP-hiba. Négy új kérdés szükséges, angolul 4 duplikáció van.

**A három eredeti PPTX újraexportálása / hozzáférhető másolata szükséges**:
- LP3A – vízhigiénia, fizikai-kémiai vízvizsgálatok;
- LP5B – bakteriológia és parazitológia;
- LP6A – ionizáló sugárzás / radioprotekció.

Nem szabad új, forrás nélküli „helyes” válaszokkal feltölteni az LP3A / LP6A hiányzó helyeit. Az LP5B jelenlegi 20-as lista ideiglenes tartalomválasztás a meglévő kérdésbankból; utólagos PPT-ellenőrzést igényel.

## 4. Validálás

Kódszintű validálás: LP1A, LP1B, LP2A, LP2B, LP3B, LP4A, LP4B, LP5A, LP5B, LP6B: **20 egyedi kérdés RO és EN**, mindegyik 4 opciós, érvényes helyesválasz-indexszel.

A teljes böngészős tesztet, a távoli tanári kérdésfelülírásokat és minden korábbi helyes válasz diák szerinti ellenőrzését még külön el kell végezni.
