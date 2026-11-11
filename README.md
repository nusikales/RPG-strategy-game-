# Plieno Frontas

Vieno žaidėjo karo ir ekonomikos strategija naršyklėje. Tikras pasaulio žemėlapis, 176 šalys, visas jas valdo botai.

Sukūrė [Nusikales](https://github.com/nusikales).

## Kaip paleisti

Atidaryk `index.html` naršyklėje. Serverio nereikia, progresas saugomas naršyklės `localStorage`.

Norint žaisti internete, repozitorijos nustatymuose įjunk GitHub Pages (Settings → Pages → Deploy from a branch → `main`, `/root`).

## Kaip keisti

Šaltinis yra `src/` aplanke:

- `src/head.html` – stiliai ir puslapio karkasas
- `src/script.js` – visa žaidimo logika
- `src/world.json` – šalių kontūrai (Natural Earth 110m per `world-atlas`) su lietuviškais pavadinimais
- `src/build.js` – sujungia viską į `index.html`

Po pakeitimų paleisk:

```
node src/build.js
```

## Kas yra žaidime

- Veikėjas: 50 lygių, 5 įgūdžių taškai už lygį (žala, šarvai, gyvybės, darbo našumas, darbo energija, įmonių limitas, darbuotojai), prestižas
- Misijos: dieninės, savaitinės ir mėnesinės (po 10, premija už 7), tik jos duoda XP
- Įmonės: statomos už geležį, variklis, sandėlis, darbuotojai, gamybos grandinės (geležis → plienas, žuvis → kepta žuvis, grūdai → pyragas, molis → plytos, mediena → lentos, švinas → šoviniai, nafta → degalai)
- Šalis: 10 vietų parlamentas (rinkimai, siūlymai ir balsavimai dėl karo, taikos, mokesčių, mobilizacijos, statybų ir premijų mūšiams), iždas, aljansai su kvietimais ir išdavystėmis, bunkeriai ir kareivinės regionuose
- Įmonių pelno mokestis šalies iždui, įmones galima perkelti į kitas šalis
- Nustatymai žaidime (Botai → Nustatymai): lygiai, įgūdžiai, misijos, įmonės, mūšiai, šalis
- Inventorius: maistas, trijų retumų šoviniai, žaliavos, gamyba, ardymas, trofėjų dėžės
- Ekipuotė: 6 retumai, ginklai nuo peilio iki naikintuvo, šalmas, liemenė, pirštinės, kelnės ir batai su atakos, gynybos, taiklumo, išsisukimo ir kritinio smūgio rėžiais bei patvarumu
- Mūšiai: raundai, taškai, žalos juosta, kovotojų smūgių sąrašai, pusių premijos
- Ekonomika: gyva rinka su užsakymų knyga, kainų grafikais, momentiniais ir limitiniais užsakymais; įmonės, gaminančios žaliavas
- Politika: prezidento rinkimai, karai, taika, mobilizacija
- Botų skydelis: agresija, aktyvumas, jėga ir elgesys kiekvienai šaliai
