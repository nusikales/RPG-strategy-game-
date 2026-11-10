// Sujungia src/head.html + src/script.js + src/world.json į ../index.html (pilnas puslapis).
// `node src/build.js --fragment kelias.html` papildomai išsaugo versiją be <html> apvalkalo.
const fs=require('fs'),p=require('path'),f=n=>fs.readFileSync(p.join(__dirname,n),'utf8');
const js=f('script.js').replace('/*__WORLD__*/null',()=>f('world.json'));
const frag=f('head.html')+'<script>\n'+js+'</script>\n';
const full='<!doctype html>\n<html lang="lt">\n<head>\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">\n<style>body{margin:0}[hidden]{display:none!important}</style>\n</head>\n<body>\n'+frag+'</body>\n</html>\n';
fs.writeFileSync(p.join(__dirname,'..','index.html'),full);
const i=process.argv.indexOf('--fragment');if(i>0)fs.writeFileSync(process.argv[i+1],frag);
console.log('ok',full.length);
