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
- Inventorius: maistas, šoviniai, žaliavos, ginklai su patvarumu, gamyba, ardymas, trofėjų dėžės
- Mūšiai: raundai, taškai, žalos juosta, kovotojų smūgių sąrašai, pusių premijos
- Ekonomika: rinka su kintančiomis kainomis ir įmonės, gaminančios žaliavas
- Politika: prezidento rinkimai, karai, taika, mobilizacija
- Botų skydelis: agresija, aktyvumas, jėga ir elgesys kiekvienai šaliai
