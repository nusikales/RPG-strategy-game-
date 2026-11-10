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

- Karys: sveikata, energija, lygis, jėga, darbas ir treniruotės
- Inventorius: maistas, trijų retumų šoviniai, žaliavos, gamyba, ardymas, trofėjų dėžės
- Ekipuotė: 6 retumai, ginklai nuo peilio iki naikintuvo, šalmas, liemenė, pirštinės, kelnės ir batai su atakos, gynybos, taiklumo, išsisukimo ir kritinio smūgio rėžiais bei patvarumu
- Mūšiai: raundai, taškai, žalos juosta, kovotojų smūgių sąrašai, pusių premijos
- Ekonomika: gyva rinka su užsakymų knyga, kainų grafikais, momentiniais ir limitiniais užsakymais; įmonės, gaminančios žaliavas
- Politika: prezidento rinkimai, karai, taika, mobilizacija
- Botų skydelis: agresija, aktyvumas, jėga ir elgesys kiekvienai šaliai
