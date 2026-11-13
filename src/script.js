(function(){
'use strict';
const WORLD=/*__WORLD__*/null;
// ---------- utils ----------
const $=s=>document.querySelector(s);
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const fmt=n=>{n=Math.round(n);if(Math.abs(n)>=1e6)return(n/1e6).toFixed(1)+'M';if(Math.abs(n)>=1e4)return(n/1e3).toFixed(1)+'k';return n.toLocaleString('lt-LT');};
const R=Math.random, rr=(a,b)=>a+R()*(b-a), pick=a=>a[Math.floor(R()*a.length)];
const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const flagOf=a=>/^X/.test(a)?'🏳':String.fromCodePoint(...[...a].map(c=>0x1F1E6+c.charCodeAt(0)-65));
function hsl(h,s,l){s/=100;l/=100;const k=n=>(n+h/30)%12,a=s*Math.min(l,1-l),f=n=>Math.round(255*(l-a*Math.max(-1,Math.min(k(n)-3,Math.min(9-k(n),1)))));return[f(0),f(8),f(4)];}

// ---------- constants ----------
const LATMAX=78,LATMIN=-56,GW=1600,CS=2;
const mY=lat=>Math.log(Math.tan(Math.PI/4+lat*Math.PI/360));
const MYT=mY(LATMAX),GH=Math.round((MYT-mY(LATMIN))*GW/(2*Math.PI));
const WW=GW*CS,WH=GH*CS,NC=WORLD.length;
const FIRST=['Aras','Rimas','Vela','Toma','Linas','Ema','Kostas','Jora','Saulius','Milda','Darius','Ina','Gedas','Rūta','Vytas','Nora','Omar','Li','Ana','Ivan','Sven','Kofi','Mateo','Yuki','Amir','Lena'];
const LAST=['Varnas','Kalnius','Stonis','Merkas','Juodis','Šilė','Tauras','Gelžis','Žvirblis','Ąžuolas','Pušis','Vilkas','Okoro','Tanaka','Silva','Novak','Haddad','Berg','Moreau','Khan'];
const DIRS=['Rytai','Pietryčiai','Pietūs','Pietvakariai','Vakarai','Šiaurės vakarai','Šiaurė','Šiaurės rytai'];
const TICK_MS=4000; // 1 valanda žaidime prie 1×
const COLORS=WORLD.map((c,i)=>hsl((i*137.508)%360,36+(i%4)*7,36+(i%3)*6));
const MODES={auto:'Įprastas',peaceful:'Taikus',aggressive:'Agresyvus',frozen:'Užšaldytas'};

// ---------- settings: every balance number can be changed in the game (Botai → Nustatymai) ----------
const CFG=[
 ['Veikėjas',[['maxLvl','Aukščiausias lygis',50,5,500,1],['xpBase','XP iki kito lygio: bazė',80,10,5000,10],['xpPer','XP iki kito lygio: priedas už kiekvieną lygį',30,0,1000,5],
  ['skAtk','Įgūdis „Žala“: % už tašką',3,0,50,.5],['skDef','Įgūdis „Šarvai“: % už tašką',1,0,10,.5],['skHp','Įgūdis „Gyvybės“: gyvybių už tašką',10,1,200,1],
  ['skEff','Įgūdis „Darbo našumas“: % už tašką',10,0,100,1],['skEn','Įgūdis „Darbo energija“: energijos už tašką',10,1,200,1],
  ['costCo','Įgūdžio „Įmonių limitas“ kaina taškais',5,1,50,1],['costWk','Įgūdžio „Darbuotojai“ kaina taškais',3,1,50,1],
  ['baseCo','Įmonių limitas be įgūdžių',2,1,50,1],['baseWk','Darbuotojų limitas be įgūdžių',1,0,50,1],['respec','Taškų perskirstymo kaina ₡',200,0,100000,10],
  ['hpRegP','Gyvybių atsistatymas per valandą % nuo maksimumo',20,0,100,1],['enRegP','Energijos atsistatymas per valandą % nuo maksimumo',20,0,100,1],
  ['lvlHeal','Pakilus lygiui atstatyti pilnas gyvybes ir energiją (1 taip, 0 ne)',0,0,1,1],
  ['healBread','Pyragas atstato % gyvybių',10,1,100,1],['healFish','Kepta žuvis atstato % gyvybių',20,1,100,1]]],
 ['Mūšiai',[['baseDmg','Bazinė smūgio žala',80,1,10000,1],['hitCost','Smūgio kaina gyvybėmis',10,0,100,1],['rp','Taškai raundui laimėti',30,5,300,1],['rwin','Raundai mūšiui laimėti',2,1,5,1],
  ['botPt','Boto įgūdžių taško jėga %',.4,0,5,.1],['mobilCost','Mobilizacijos kaina ₡',500,0,100000,50],['mobilBonus','Mobilizacijos žalos priedas %',30,0,300,5],
  ['bunkerPer','Bunkeris: % mažiau priešo žalos už lygį',8,0,30,1],['barracksPer','Kareivinės: % daugiau žalos už lygį',8,0,100,1],['bldMax','Aukščiausias pastato lygis',5,1,20,1],['bldCost','Pastato lygio kaina ₡ (dauginama iš lygio)',200,0,100000,10],
  ['bountyHit','Premija už vieną smūgį ₡',3,0,1000,.5],['bountyBot','Botų žalos priedas mūšyje su premija %',25,0,300,5]]],
 ['Misijos',[['msNeed','Kiek misijų reikia premijai',7,1,10,1]].concat([['d','Dieninė'],['w','Savaitinė'],['m','Mėnesinė']].flatMap(([t,n],i)=>[
  [t+'Xp',n+' misija: XP',[15,60,200][i],0,100000,5],[t+'Cash',n+' misija: ₡',[20,80,300][i],0,100000,5],[t+'Bx',n+' premija: XP',[100,500,2000][i],0,1000000,50],
  [t+'Bc',n+' premija: ₡',[100,500,2000][i],0,1000000,50],[t+'Cr',n+' premija: dėžės',[1,3,8][i],0,100,1]]))],
 ['Įmonės',[['workEn','„Dirbti“ energijos kaina',10,0,200,1],['prodEn','„Gaminti“ energijos kaina',5,0,200,1],['workGain','„Dirbti“ duoda effort',12,1,1000,1],
  ['wage','Darbuotojo alga per dieną ₡',6,0,1000,1],['wkEff','Darbuotojo effort per valandą',1.5,0,100,.5],['capBase','Sandėlio talpa vienam lygiui',60,10,10000,10],
  ['buildBase','Statybos kaina geležimi: bazė',20,0,10000,5],['buildPow','Statybos kainos augimo laipsnis',1.6,1,4,.1],['aeBase','Variklio kaina geležimi: bazė',10,0,10000,1],['stBase','Sandėlio kaina geležimi: bazė',8,0,10000,1],
  ['hireBase','Samdymo kaina ₡: bazė',50,0,100000,5],['moveCost','Įmonės perkėlimo kaina plienu',5,0,1000,1]]],
 ['Šalis',[['seats','Vietos parlamente',10,3,30,1],['elecDays','Rinkimai kas kiek dienų',5,1,60,1],['favor','Botų palankumas tau %',35,0,100,5],['voteH','Balsavimo trukmė valandomis',6,1,72,1],
  ['presPay','Pirmininko alga per dieną ₡',40,0,10000,5],['mpPay','Deputato alga per dieną ₡',15,0,10000,5],['regInc','Regiono pajamos į iždą per valandą ₡',2,0,100,.5],['fee','Rinkos mokestis parduodant %',2,0,50,.5],
  ['allyMax','Daugiausia šalių aljanse',6,2,50,1],['allyCount','Daugiausia aljansų pasaulyje',12,0,50,1],['allyHelp','Sąjungininko pagalba mūšyje % jo jėgos',20,0,100,5],
  ['allyJoin','Tikimybė, kad sąjungininkas stos į karą %',50,0,100,5],['betray','Išdavystės tikimybė per dieną %',.5,0,20,.1],['topN','Kiek vietų rodyti topuose',50,10,500,10]]],
['Dėžės',[['crDmg','Trofėjų dėžė už kiekvieną padarytą žalą',800,10,1000000,50],['cr2Dmg','Elitinė dėžė už kiekvieną padarytą žalą',10000,10,10000000,500],
  ['crWin','Trofėjų dėžės už laimėtą mūšį (kai padarei bent 400 žalos)',1,0,100,1],['crWpn','Tikimybė, kad iš dėžės iškris ginklas, o ne apranga %',35,0,100,5],
  ['crN','Daiktų trofėjų dėžėje',1,1,20,1],['cr2N','Daiktų elitinėje dėžėje',2,1,20,1],['crPrice','Trofėjų dėžės bazinė kaina rinkoje ₡',40,1,1000000,5],['cr2Price','Elitinės dėžės bazinė kaina rinkoje ₡',250,1,1000000,10],['crSpin','Sukimosi animacijos trukmė sekundėmis',3,.5,15,.5],
  ['crW0','Trofėjų dėžė: „Paprastas“ svoris',60,0,1000,1],['crW1','Trofėjų dėžė: „Neįprastas“ svoris',25,0,1000,1],['crW2','Trofėjų dėžė: „Retas“ svoris',10,0,1000,1],['crW3','Trofėjų dėžė: „Epinis“ svoris',4,0,1000,1],['crW4','Trofėjų dėžė: „Legendinis“ svoris',1,0,1000,1],['crW5','Trofėjų dėžė: „Mitinis“ svoris',0,0,1000,1],
  ['c2W0','Elitinė dėžė: „Paprastas“ svoris',0,0,1000,1],['c2W1','Elitinė dėžė: „Neįprastas“ svoris',25,0,1000,1],['c2W2','Elitinė dėžė: „Retas“ svoris',35,0,1000,1],['c2W3','Elitinė dėžė: „Epinis“ svoris',25,0,1000,1],['c2W4','Elitinė dėžė: „Legendinis“ svoris',12,0,1000,1],['c2W5','Elitinė dėžė: „Mitinis“ svoris',3,0,1000,1]]],
 ['Sukilimai',[['revMax','Sukilimo lygis, nuo kurio prasideda mūšis',100,5,100000,5],['revHp','Sukilimo mygtuko kaina gyvybėmis',15,0,500,1],
  ['revMe','Tavo paspaudimas prideda sukilimo taškų',5,0,10000,1],['revBot','Boto veiksmas prideda sukilimo taškų',1,0,10000,.5],['revPay','Atlygis tau už paspaudimą ₡',2,0,10000,1],
  ['revFame','Šlovė už paspaudimą',3,0,1000,1],['revDecay','Sukilimo lygis mažėja per dieną %',10,0,100,1],['revKeep','Lieka sukilimo % po pralaimėto mūšio',0,0,100,5],
  ['revCd','Pertrauka po sukilimo mūšio valandomis',24,0,1000,1],['revBon','Sukilėlių žalos priedas mūšyje %',25,0,500,5],['revLim','Daugiausia sukilimo mūšių vienai šaliai vienu metu',2,1,50,1],
  ['revCash','Iždas atkurtai valstybei ₡',300,0,100000,50],['revAlly','Sukilti galima ir prieš sąjungininkę (1 taip, 0 ne)',0,0,1,1],
  ['revPop','Sukilėlių jėga: % regiono jėgos už kiekvieną okupuotą savo regioną',100,0,1000,10],['revDef','Okupanto jėga sukilimo mūšyje %',60,0,300,5]]],
 ['Botai piliečiai',[['cStart','Botų piliečių naujame žaidime vienam regionui',2,0,50,1],['cMax','Daugiausia botų pasaulyje',4000,0,50000,100],
  ['cAct','Boto veiksmo tikimybė per valandą %',30,0,100,5],['cHp','Boto gyvybės',100,10,5000,10],['cHpReg','Boto gyvybių atsistatymas per valandą',5,0,500,1],
  ['cHitHp','Boto smūgio kaina gyvybėmis',10,0,500,1],['cDmg','Boto smūgio žala',40,0,100000,5],['cLvl','Boto smūgis stiprėja kartu su šalies karių lygiu (1 taip, 0 ne)',1,0,1,1],
  ['cRev','Sukilimo prioritetas %',60,0,100,5],['cBounty','Kovos dėl premijų prioritetas %',70,0,100,5],['cFight','Kova už savo šalį be premijos %',25,0,100,5],
  ['cAllyF','Kova už sąjungininkes dėl premijų (1 taip, 0 ne)',1,0,1,1],['cFeed','Botų smūgių rodymas mūšio sraute %',35,0,100,5],
  ['cWork','Boto uždarbis už darbą ₡',3,0,10000,.5],['cTax','Boto darbo mokestis į iždą %',20,0,100,5],['cDon','Botas aukoja šaliai savo pinigų per dieną %',10,0,100,5],
  ['cLoyal','Ištikimas botas be valstybės keičia pilietybę po dienų (0 = niekada)',20,0,365,1],
  ['cOpp','Oportunistų dalis tarp naujų botų %',10,0,100,1],['cOppChk','Oportunistas svarsto keisti pilietybę per dieną %',30,0,100,5],
  ['cOppGain','Kiek % geresnė turi būti nauja šalis',25,0,1000,5],['cOppCost','Pilietybės keitimo kaina botui ₡',20,0,100000,5],
  ['cCo','Tikimybė, kad naujas botas turi įmonę %',30,0,100,5],['cCoCost','Įmonės kaina botui ₡',150,0,100000,10],['cCoMax','Daugiausia įmonių vienam botui',3,0,50,1],
  ['cCoBuild','Botas stato įmonę per dieną, kai turi pinigų %',10,0,100,5],['cCoInc','Boto įmonės pajamos per dieną ₡',4,0,10000,.5],['cXp','Boto lygio augimas per dieną (lygių)',.4,0,10,.05],
  ['cOppEco','Oportunistas vertina ekonomiką (svoris)',1,0,10,.25],['cOppWar','Oportunistas vertina premijas ir pergales (svoris)',1,0,10,.25],['cOppNear','Oportunistas renkasi tik kaimynes (1 taip, 0 ne)',0,0,1,1]]]];
const CFI={};CFG.forEach(g=>g[1].forEach(it=>CFI[it[0]]=it));
const G=k=>S&&S.cfg&&S.cfg[k]!=null?S.cfg[k]:CFI[k][2];
const BOT_DEF={aggr:1,activity:1,power:1,ally:1,peace:1,maxWars:20,xp:1,ptsMe:5,ptsBot:5,ptsPrest:5,ov:{}};

// ---------- real world map ----------
let M=null;
function genMap(){
  const N=GW*GH,cc=new Int16Array(N).fill(-1);
  const px=lon=>(lon/20+180)/360*GW, py=lat=>(MYT-mY(clamp(lat/20,-85,85)))*GW/(2*Math.PI);
  WORLD.forEach((c,ci)=>{let filled=0,fx=0,fy=0;
    c.p.forEach(poly=>{const rings=poly.map(r=>{const o=new Float32Array(r.length);let pl=r[0];for(let i=0;i<r.length;i+=2){let l=r[i];while(l-pl>3600)l-=7200;while(l-pl<-3600)l+=7200;pl=l;o[i]=px(l);o[i+1]=py(r[i+1]);}return o;});
      let y0=1e9,y1=-1e9;const o=rings[0];for(let i=1;i<o.length;i+=2){if(o[i]<y0)y0=o[i];if(o[i]>y1)y1=o[i];}
      fx=o[0];fy=o[1];
      for(let y=Math.max(0,Math.floor(y0));y<=Math.min(GH-1,Math.ceil(y1));y++){const yc=y+.5,xs=[];
        for(const r of rings){const n=r.length;for(let i=0;i<n;i+=2){const x1=r[i],ya=r[i+1],j=(i+2)%n,x2=r[j],yb=r[j+1];if((ya<=yc)!==(yb<=yc))xs.push(x1+(yc-ya)/(yb-ya)*(x2-x1));}}
        xs.sort((a,b)=>a-b);
        for(let k=0;k+1<xs.length;k+=2){for(let x=Math.ceil(xs[k]-.5);x<=Math.floor(xs[k+1]-.5);x++){cc[((x%GW)+GW)%GW+y*GW]=ci;filled++;}}}
    });
    if(!filled){const x=((Math.floor(fx)%GW)+GW)%GW,y=clamp(Math.floor(fy),0,GH-1);cc[x+y*GW]=ci;}
  });
  // cells per country
  const lists=WORLD.map(()=>[]);for(let i=0;i<N;i++)if(cc[i]>=0)lists[cc[i]].push(i);
  const cell=new Int16Array(N).fill(-1),regions=[],caps=[];
  lists.forEach((ls,ci)=>{const n=ls.length;if(!n){caps.push(-1);return;}
    let k=clamp(Math.round(Math.sqrt(n)*1200/GW/7),1,14);if(n>=50)k=Math.max(k,2);
    let sx=0,sy=0;for(const c of ls){sx+=c%GW;sy+=(c/GW)|0;}sx/=n;sy/=n;
    const md=new Float32Array(n).fill(1e12),lab=new Uint8Array(n);
    let cur=0,bd=1e12;for(let i=0;i<n;i++){const c=ls[i],d=(c%GW-sx)**2+(((c/GW)|0)-sy)**2;if(d<bd){bd=d;cur=i;}}
    const base=regions.length;
    for(let s=0;s<k;s++){const X=ls[cur]%GW,Y=(ls[cur]/GW)|0;let nx=0,nd=-1;
      for(let i=0;i<n;i++){const c=ls[i],d=(c%GW-X)**2+(((c/GW)|0)-Y)**2;if(d<md[i]){md[i]=d;lab[i]=s;}if(md[i]>nd){nd=md[i];nx=i;}}
      regions.push({home:ci,cells:0,sx:0,sy:0,x0:1e9,y0:1e9,x1:-1,y1:-1,adj:new Set()});cur=nx;}
    for(let i=0;i<n;i++){const c=ls[i],r=base+lab[i],g=regions[r],x=c%GW,y=(c/GW)|0;cell[c]=r;g.cells++;g.sx+=x;g.sy+=y;if(x<g.x0)g.x0=x;if(x>g.x1)g.x1=x;if(y<g.y0)g.y0=y;if(y>g.y1)g.y1=y;}
    caps.push(base);
    const used={};
    for(let r=base;r<regions.length;r++){const g=regions[r];g.cx=g.sx/g.cells;g.cy=g.sy/g.cells;
      if(k===1){g.short=WORLD[ci].n;g.name=WORLD[ci].n;}
      else{let d;if(r===base)d='Centras';else{const a=Math.atan2(g.cy-sy,g.cx-sx);d=DIRS[((Math.round(a/(Math.PI/4))%8)+8)%8];}
        used[d]=(used[d]||0)+1;g.short=d+(used[d]>1?' '+used[d]:'');g.name=WORLD[ci].n+' · '+g.short;}
      g.pop=Math.round(g.cells*(8+((r*37)%20)))*100;}
  });
  // label points + land adjacency + coast
  const best=new Float32Array(regions.length).fill(1e12),coast=new Uint8Array(N);
  for(let y=0;y<GH;y++)for(let x=0;x<GW;x++){const i=x+y*GW,r=cell[i];
    if(r<0){for(let dy=-1;dy<=1&&!coast[i];dy++)for(let dx=-1;dx<=1;dx++){const Y=y+dy;if(Y<0||Y>=GH)continue;if(cell[(x+dx+GW)%GW+Y*GW]>=0){coast[i]=1;break;}}continue;}
    const g=regions[r],d=(x-g.cx)**2+(y-g.cy)**2;if(d<best[r]){best[r]=d;g.lx=(x+.5)*CS;g.ly=(y+.5)*CS;}
    const q=cell[(x+1)%GW+y*GW];if(q>=0&&q!==r){g.adj.add(q);regions[q].adj.add(r);}
    if(y+1<GH){const q2=cell[i+GW];if(q2>=0&&q2!==r){g.adj.add(q2);regions[q2].adj.add(r);}}}
  // sea links across narrow water (flood from coasts)
  const wl=new Int16Array(N).fill(-1),wd=new Uint8Array(N),Q=new Int32Array(N);let qh=0,qt=0;const MAXD=Math.round(GW/170);
  const nb=(i,f)=>{const x=i%GW,y=(i/GW)|0;f((x+1)%GW+y*GW);f((x+GW-1)%GW+y*GW);if(y>0)f(i-GW);if(y<GH-1)f(i+GW);};
  for(let i=0;i<N;i++)if(cell[i]<0&&coast[i]){nb(i,j=>{if(cell[j]>=0&&wl[i]<0){wl[i]=cell[j];wd[i]=1;}});if(wl[i]>=0)Q[qt++]=i;}
  while(qh<qt){const i=Q[qh++],L=wl[i],d=wd[i];nb(i,j=>{if(cell[j]>=0)return;if(wl[j]<0){if(d<MAXD){wl[j]=L;wd[j]=d+1;Q[qt++]=j;}}else if(wl[j]!==L){regions[L].adj.add(wl[j]);regions[wl[j]].adj.add(L);}});}
  // connect remaining islands to nearest land
  const links=[];
  for(let guard=0;guard<60;guard++){const comp=new Int16Array(regions.length).fill(-1);let nc=0;const sizes=[];
    for(let s=0;s<regions.length;s++){if(comp[s]>=0)continue;let st=[s],n=0;comp[s]=nc;while(st.length){const a=st.pop();n++;regions[a].adj.forEach(b=>{if(comp[b]<0){comp[b]=nc;st.push(b);}});}sizes.push(n);nc++;}
    if(nc===1)break;const main=sizes.indexOf(Math.max(...sizes));let sm=-1;for(let c=0;c<nc;c++)if(c!==main&&(sm<0||sizes[c]<sizes[sm]))sm=c;
    let ba=-1,bb=-1,bd2=1e18;for(let a=0;a<regions.length;a++){if(comp[a]!==sm)continue;for(let b=0;b<regions.length;b++){if(comp[b]===sm)continue;let dx=Math.abs(regions[a].cx-regions[b].cx);dx=Math.min(dx,GW-dx);const d=dx*dx+(regions[a].cy-regions[b].cy)**2;if(d<bd2){bd2=d;ba=a;bb=b;}}}
    regions[ba].adj.add(bb);regions[bb].adj.add(ba);links.push([ba,bb]);}
  return {cell,regions,caps,coast,links};
}

// ---------- items ----------
const ITEMS={
  bread:{n:'Pyragas',i:'🥧',get d(){return `+${G('healBread')}% ❤`;},get heal(){return G('healBread')/100;},price:4,c:'food'},
  cfish:{n:'Kepta žuvis',i:'🍣',get d(){return `+${G('healFish')}% ❤`;},get heal(){return G('healFish')/100;},price:9,c:'food'},
  a1:{n:'Šoviniai',svg:'ammo',col:'#b9c2c6',d:'+10% žalos',price:1.2,c:'ammo'},a2:{n:'Sustiprinti šoviniai',svg:'ammo',col:'#5b9be6',d:'+20% žalos',price:3,c:'ammo'},a3:{n:'Šarvamušiai šoviniai',svg:'ammo',col:'#b07be6',d:'+35% žalos',price:7,c:'ammo'},
  crate:{n:'Trofėjų dėžė',i:'📦',d:'Ginklas ar apranga',get price(){return G('crPrice');},c:'gear'},crate2:{n:'Elitinė dėžė',i:'🎁',d:'Retesni daiktai',get price(){return G('cr2Price');},c:'gear'},
  grain:{n:'Grūdai',i:'🌾',price:1.5,c:'raw'},fish:{n:'Žuvis',i:'🐟',price:2.5,c:'raw'},
  iron:{n:'Geležis',i:'🪨',price:3,c:'raw'},clay:{n:'Molis',i:'🟤',price:2,c:'raw'},brick:{n:'Plytos',i:'🧱',price:6,c:'raw'},steel:{n:'Plienas',i:'🔩',price:11,c:'raw'},
  wood:{n:'Mediena',i:'🪵',price:4,c:'raw'},lead:{n:'Švinas',i:'🔘',price:5,c:'raw'},oil:{n:'Nafta',i:'🛢️',price:9,c:'raw'},
  plank:{n:'Lentos',i:'🪚',price:10,c:'raw'},fuel:{n:'Degalai',i:'⛽',price:22,c:'raw'}
};
const RAWS=['grain','fish','iron','wood','lead','oil','clay'];
// ---------- gear: weapons and armour with rarities ----------
const RAR=[{n:'Paprastas',c:'#9aa7ad'},{n:'Neįprastas',c:'#6dbf7b'},{n:'Retas',c:'#5b9be6'},{n:'Epinis',c:'#b07be6'},{n:'Legendinis',c:'#e6b84d'},{n:'Mitinis',c:'#e6584d'}];
const DEFR=[[2,4],[4,7],[7,10],[10,14],[14,18],[18,24]];
// every rarity has its own stat range; an item rolls its value inside that range
const SLOT={w:{n:'Ginklas',st:'Ataka',ic:'⚔',rng:[[10,25],[30,55],[60,95],[100,150],[170,250],[280,400]]},
  helm:{n:'Šalmas',st:'Gynyba',ic:'🛡',rng:DEFR},chest:{n:'Liemenė',st:'Gynyba',ic:'🛡',rng:DEFR},
  gloves:{n:'Pirštinės',st:'Taiklumas',ic:'🎯',rng:[[5,9],[9,14],[14,20],[20,27],[27,35],[35,45]]},
  pants:{n:'Kelnės',st:'Išsisukimas',ic:'💨',rng:DEFR},
  boots:{n:'Batai',st:'Kritinis',ic:'💥',rng:[[2,4],[4,6],[6,9],[9,13],[13,18],[18,25]]}};
const SLOTS=Object.keys(SLOT),ARMOR=SLOTS.slice(1);
const WN=['Peilis','Pistoletas','Automatas','Snaiperinis šautuvas','Tankas','Naikintuvas F-16'];
const WDUR=[60,50,50,40,30,25],WPRICE=[15,45,130,320,900,2400],APRICE=[12,35,100,250,700,1900];
const WCOST=[{steel:1,wood:1},{steel:3,wood:1},{steel:8,plank:2,oil:2},{steel:16,plank:3,oil:6},{steel:60,fuel:10,lead:10},{steel:150,fuel:30,lead:30}];
const ACOST={steel:4,plank:1},AODDS=[.5,.78,.91,.97,.995,1];
const AMMO={a1:.1,a2:.2,a3:.35};
const gMax=(s,r)=>s==='w'?WDUR[r]:80+r*20;
const gFull=(s,r)=>s==='w'?WN[r]:`${SLOT[s].n} · ${RAR[r].n}`;
const RECIPES=[
  {id:'a2',out:{a2:10},cost:{lead:2,steel:2,oil:1}},{id:'a3',out:{a3:10},cost:{lead:4,steel:3,fuel:2}}]
  .concat(WCOST.map((c,r)=>({id:'w'+r,gw:r,cost:c})),ARMOR.map(s=>({id:'ar_'+s,armor:s,cost:ACOST})));
const P=d=>`<svg viewBox="0 0 24 24"><path d="${d}" fill="currentColor"/></svg>`;
const SVG={ammo:'<svg viewBox="0 0 24 24"><path d="M9 19V10c0-4 3-7 3-7s3 3 3 7v9z" fill="currentColor"/><rect x="8" y="18" width="8" height="3.5" rx="1" fill="#6b5a3a"/></svg>',
  w0:P('M3 21l3-5 2 2-5 3zM8 15L19 2c2 4 1 8-2 11l-6 5z'),
  w1:P('M3 7h18v4h-9l-1 3H8l-1 6H3l2-9H3z'),
  w2:P('M1 9h13l1-2h3v2h5v2h-9l-1 2h-2l-1 6H7l1-6H5l-2 3H1z'),
  w3:P('M0 11h12v-1h12v2H14l-1 2h-3l-1 5H6l1-5H3l-1 2H0zM8 6h8v3H8z'),
  w4:P('M2 14h20l-2 5H4zM6 9h9v4H6zM15 10h8v2h-8zM4 20h16v1H4z'),
  w5:P('M12 1l2 8 8 6v2l-8-2-1 5 3 2v1H8v-1l3-2-1-5-8 2v-2l8-6z'),
  helm:P('M4 15a8 8 0 0116 0v2H4zM3 17h18v2.5H3z'),
  chest:P('M7 3l2 2h6l2-2 3 3-2 4v11H6V10L4 6z'),
  gloves:P('M7 21v-7L5 9l2-1 2 4V4h2v6h1V3h2v7h1V5h2v9l-1 7z'),
  pants:P('M6 3h12l1 18h-5l-2-11-2 11H5z'),
  boots:P('M8 3h6v10l6 3v5H6V13z')};
const ico=k=>ITEMS[k].svg?`<span style="color:${ITEMS[k].col}">${SVG[ITEMS[k].svg]}</span>`:ITEMS[k].i;
const gico=(s,r)=>`<span style="color:${RAR[r].c}">${SVG[s==='w'?'w'+r:s]}</span>`;
const costStr=c=>Object.entries(c).map(([k,v])=>`${v}× ${ITEMS[k].n}`).join(', ');

// ---------- state ----------
const SAVE='plieno-frontas-v3';
let S=null,OWN=[],OWNC=[];
function botName(){return pick(FIRST)+' '+pick(LAST);}
function freshCountries(){return WORLD.map((d,i)=>({id:i,name:d.n,short:d.n,a:d.a,cap:M.caps[i],treasury:300,alive:M.caps[i]>=0,leader:botName(),playerPres:false,mobil:0,tax:5*Math.round(rr(1,5))}));}
const freshInv=()=>({bread:5,cfish:0,a1:40,a2:0,a3:0,crate:1,crate2:0,grain:4,fish:0,iron:3,steel:2,wood:1,lead:0,oil:0,clay:0,brick:0,plank:0,fuel:0});
function newGame(name,countryId){
  S={v:3,tick:0,speed:1,owner:M.regions.map(g=>g.home),countries:freshCountries(),
    wars:[],battles:[],news:[],nextBattleId:1,nextWid:2,newsHot:true,
    election:{candidate:false},alliances:[],bld:{},bills:[],votes:[],fin:{t:{},y:{}},mig:{},cdm:{t:{},h:[]},cfg:{},bots:JSON.parse(JSON.stringify(BOT_DEF)),
    p:{name:name||'Karys',country:countryId,hp:100,maxHp:100,en:100,maxEn:100,money:120,xp:0,lvl:1,prestige:0,sk:{},
      inv:freshInv(),gear:[],eq:{},ammoSel:'a1',mult:1,fame:0,dmg:0,
      st:{hits:0,won:0,crates:0,money:0},companies:[],president:false,mp:false},
    over:false};
  addGear('w',0);addGear('w',1);msRoll();rebuildOwn();mkInit();S.countries[countryId].tax=10;ensureParl();S.countries.forEach((c,i)=>c.treasury=300+OWN[i].length*120);citInit();
  addNews(`${S.p.name} prisijungė prie šalies ${S.countries[countryId].short} kariuomenės.`,true);
  renderTerritory();save();
}
function save(){if(!S||S.__preview)return;try{localStorage.setItem(SAVE,JSON.stringify(S));}catch(e){}}
function load(){try{const t=localStorage.getItem(SAVE);if(!t)return false;const o=JSON.parse(t);if(!o||o.owner.length!==M.regions.length||o.countries.length!==NC||!o.p.inv)return false;S=o;
  S.bots=Object.assign(JSON.parse(JSON.stringify(BOT_DEF)),S.bots||{});if(!S.p.gear){const q=S.p;(S.orders||[]).forEach(o=>{const l=o.qty-o.done;if(o.side==='buy')q.money+=l*o.price;else if(q.inv[o.k]!=null)q.inv[o.k]+=l;});S.orders=[];S.mk=null;q.cost={};
    q.inv.a1=q.inv.ammo||0;delete q.inv.ammo;q.ammoSel=q.useAmmo?'a1':'';const old=q.weapons||[];q.gear=[];q.eq={};old.forEach(w=>{addGear('w',w.t).dur=Math.min(w.dur,WDUR[w.t]);});delete q.weapons;}
  if(!S.p.sk){const q=S.p;q.sk={};q.prestige=0;q.xp=0;q.lvl=Math.min(G('maxLvl'),q.lvl||1);delete q.str;
    q.companies=(q.companies||[]).map(c=>({type:COMPANY[c.type]?c.type:'mine',ae:c.lvl||0,st:0,workers:0,eff:0}));}
  if(!S.alliances){S.alliances=[];S.bld={};S.bills=[];S.votes=[];S.fin={t:{},y:{}};S.cfg={};S.p.mp=false;S.countries.forEach((c,i)=>{if(i!==S.p.country)c.tax=5*Math.round(rr(1,5));});S.battles.forEach(b=>b.bounty=[0,0]);}
  S.p.companies.forEach(c=>{if(c.reg==null)c.reg=S.countries[S.p.country].cap;});rebuildOwn();ensureParl();
  S.p.inv=Object.assign(freshInv(),S.p.inv);recalc();msRoll();if(!S.cit)citInit();S.mig=S.mig||{};S.cdm=S.cdm||{t:{},h:[]};S.cit.forEach(citFix);S.rev=S.rev||{};S.revCd=S.revCd||{};delete S['market'];if(!S.mk)mkInit();else MKEYS.forEach(k=>{if(!S.mk[k])mkOne(k);});S.orders=S.orders||[];S.p.cost=S.p.cost||{};return true;}catch(e){return false;}}
function addNews(t,hot){S.news.unshift({t,tick:S.tick,hot:!!hot});if(S.news.length>150)S.news.length=150;if(hot||S.news.length<3)$('#tick1').textContent=t;}
const C=i=>S.countries[i];
const col=i=>`rgb(${COLORS[i].join(',')})`;
const myC=()=>C(S.p.country);
function rebuildOwn(){OWN=S.countries.map(()=>[]);OWNC=new Array(NC).fill(0);S.owner.forEach((o,r)=>{OWN[o].push(r);OWNC[o]+=M.regions[r].cells;});}
const atWar=(a,b)=>S.wars.some(w=>(w.a===a&&w.b===b)||(w.a===b&&w.b===a));
function neighbors(ci){const s=new Set();OWN[ci].forEach(r=>M.regions[r].adj.forEach(a=>{const q=S.owner[a];if(q!==ci)s.add(q);}));return [...s];}
function power(ci){const c=C(ci);return 120+OWN[ci].length*28+Math.sqrt(Math.max(0,c.treasury))*3;}
const ov=ci=>S.bots.ov[ci]||{mode:'auto',pw:1};
function timeStr(t){const d=Math.floor(t/24)+1,h=t%24;return `Diena ${d}, ${String(h).padStart(2,'0')}:00`;}
const near=(a,b)=>{const me=S.p.country;return a===me||b===me;};

// ---------- market ----------
const GKEYS=[];SLOTS.forEach(s=>RAR.forEach((_,r)=>GKEYS.push(`g:${s}:${r}`)));
const MKEYS=Object.keys(ITEMS).filter(k=>ITEMS[k].price).concat(GKEYS);
const isG=k=>k[1]===':',isW=isG,gS=k=>k.split(':')[1],gR=k=>+k.split(':')[2];
const mkBase=k=>isG(k)?(gS(k)==='w'?WPRICE:APRICE)[gR(k)]:ITEMS[k].price;
const mkName=k=>isG(k)?gFull(gS(k),gR(k)):ITEMS[k].n;
const mkIcon=k=>isG(k)?`<span class="fw big">${gico(gS(k),gR(k))}</span>`:ico(k);
const mkCat=k=>isG(k)?(gS(k)==='w'?'wpn':'armor'):ITEMS[k].c;
const mkDesc=k=>{if(!isG(k))return ITEMS[k].d||'Žaliava gamybai';const s=gS(k),r=gR(k),g=SLOT[s].rng[r];return `${SLOT[s].st} +${g[0]}–${g[1]}%, patvarumas ${gMax(s,r)}`;};
const WARF={a1:1,a2:1,a3:1,fuel:.6,plank:.3,steel:.6,brick:.2,w1:.5,w2:.5,w3:.5,bread:.4,cfish:.4,iron:.4,lead:.6,oil:.5};
const liq=k=>clamp(Math.round(120/mkBase(k)),1,80);
const HIST=168,MAXORD=12;
const owned=k=>isG(k)?S.p.gear.filter(g=>g.s===gS(k)&&g.r===gR(k)).length:S.p.inv[k];
const p2=v=>v.toFixed(2);
function mkBook(k){const o=S.mk[k],L=liq(k),a=[],b=[];for(let i=0;i<6;i++){const q=()=>Math.max(1,Math.round(L*(.5+i*.35)*rr(.6,1.4)));
  a.push([o.m*(1.015+i*.02),q()]);b.push([o.m*(.985-i*.02),q()]);}o.a=a;o.b=b;}
function mkTarget(k){return mkBase(k)*S.mk[k].trend*(1+(WARF[k]||(isG(k)?.45:0))*Math.min(1,S.battles.length/40)*.5);}
function mkMove(k){const o=S.mk[k];o.m=clamp(o.m*Math.exp(.025*(R()+R()+R()-1.5)+.03*Math.log(mkTarget(k)/o.m)),mkBase(k)*.3,mkBase(k)*4);o.hist.push(+o.m.toFixed(3));if(o.hist.length>HIST)o.hist.shift();mkBook(k);}
function mkInit(){S.mk={};S.orders=S.orders||[];S.nextOid=S.nextOid||1;S.p.cost=S.p.cost||{};
  MKEYS.forEach(mkOne);}
function mkOne(k){S.mk[k]={m:mkBase(k)*rr(.85,1.15),trend:rr(.85,1.15),hist:[],vol:0};for(let i=0;i<72;i++)mkMove(k);}
function mkTick(){
  MKEYS.forEach(k=>{const o=S.mk[k];o.vol*=.9;mkMove(k);
    if(R()<.5){const sd=R()<.5+.3*Math.log(mkTarget(k)/o.m)?'buy':'sell',q=1+Math.floor(R()*liq(k)*.6);o.vol+=q;tape(k,{n:pick(FIRST),s:sd,q,p:sd==='buy'?o.a[0][0]:o.b[0][0]});}});
  // bots trade into the player's limit orders
  for(const o of S.orders){const m=S.mk[o.k],left=o.qty-o.done,gap=o.side==='buy'?(m.a[0][0]-o.price)/m.m:(o.price-m.b[0][0])/m.m;let f=0;
    if(gap<=0)f=left;else if(gap<.07)f=Math.min(left,Math.floor(liq(o.k)*rr(0,.5)*(1-gap/.07)+R()*(1-gap/.07)));
    if(f>0){fillOrder(o,f);}}
  const fin=S.orders.filter(o=>o.done>=o.qty);if(fin.length){S.orders=S.orders.filter(o=>o.done<o.qty);
    fin.forEach(o=>{addNews(`📈 Užsakymas įvykdytas: ${o.side==='buy'?'nupirkta':'parduota'} ${o.qty}× ${mkName(o.k)} po ₡${p2(o.price)}.`,true);});toast(`Užsakymas įvykdytas: ${fin.map(o=>o.qty+'× '+mkName(o.k)).join(', ')}`,3500);}
}
function mkDay(){
  MKEYS.forEach(k=>{const o=S.mk[k];o.trend=clamp(o.trend*rr(.93,1.075)+(1-o.trend)*.06,.6,1.7);});
  if(R()<.22){const k=pick(MKEYS),up=R()<.6,o=S.mk[k];o.trend=clamp(o.trend*(up?1.35:.72),.6,1.9);
    addNews(up?`📈 Rinka: išaugo prekės „${mkName(k)}“ paklausa, kainos kyla.`:`📉 Rinka: prekės „${mkName(k)}“ perteklius, kainos krenta.`,true);}
}
function give(k,q){if(isG(k)){for(let i=0;i<q;i++)addGear(gS(k),gR(k));}else S.p.inv[k]+=q;}
// selling gear hands over the weakest unequipped piece first; worn pieces pay less
function take(k,q){const p=S.p;if(!isG(k)){p.inv[k]-=q;return 1;}let f=0;
  for(let i=0;i<q;i++){const c=p.gear.filter(g=>g.s===gS(k)&&g.r===gR(k)).sort((a,b)=>(p.eq[a.s]===a.id)-(p.eq[b.s]===b.id)||a.v-b.v)[0];f+=c.dur/gMax(c.s,c.r);removeGear(c);}return f/q;}
function tape(k,e){const o=S.mk[k];e.t=S.tick;(o.tape=o.tape||[]).unshift(e);if(o.tape.length>6)o.tape.length=6;}
function addCost(k,q,total){const c=S.p.cost[k]||{q:0,v:0};c.q+=q;c.v+=total;S.p.cost[k]=c;}
function subCost(k,q){const c=S.p.cost[k];if(!c)return;const r=Math.max(0,1-q/Math.max(c.q,q));c.q=Math.max(0,c.q-q);c.v*=r;if(c.q<=0)delete S.p.cost[k];}
// walk the book: what does q units cost (buy) or return (sell) right now
function quote(k,side,q){const lv=side==='buy'?S.mk[k].a:S.mk[k].b;let left=q,total=0;for(const [pr,n] of lv){const t=Math.min(left,n);total+=t*pr;left-=t;if(!left)break;}
  const done=q-left;return {done,total,avg:done?total/done:0};}
const depth=(k,side)=>(side==='buy'?S.mk[k].a:S.mk[k].b).reduce((s,l)=>s+l[1],0);
function maxQty(k,side,market,price){const p=S.p;if(side==='sell')return market?Math.min(owned(k),depth(k,'sell')):owned(k);
  if(!market)return Math.min(9999,Math.floor(p.money/Math.max(.01,price)));
  let n=0,money=p.money;for(const [pr,q] of S.mk[k].a){const t=Math.min(q,Math.floor(money/pr));n+=t;money-=t*pr;if(t<q)break;}return n;}
function eat_book(k,side,q){const lv=side==='buy'?S.mk[k].a:S.mk[k].b;let left=q;for(const l of lv){const t=Math.min(left,l[1]);l[1]-=t;left-=t;if(!left)break;}
  const o=S.mk[k];o[side==='buy'?'a':'b']=lv.filter(l=>l[1]>0);o.vol+=q;o.m*=1+(side==='buy'?1:-1)*Math.min(.15,.02*q/liq(k));}
function tradeNow(k,side,q){const p=S.p;q=Math.floor(q);if(q<1)return toast('Įvesk kiekį.');
  if(q>maxQty(k,side,true))return toast(side==='buy'?'Nepakanka pinigų arba pasiūlos.':'Neturi tiek prekių arba nėra tiek pirkėjų.');
  const qt=quote(k,side,q);
  if(side==='buy'){p.money-=qt.total;give(k,q);addCost(k,q,qt.total);toast(`Nupirkta ${q}× ${mkName(k)} už ₡${p2(qt.total)}`);track('buy',q);}
  else{const f=take(k,q),net=qt.total*f*(1-(G('fee')/100));p.money+=net;{const fe=qt.total*f*(G('fee')/100);myC().treasury+=fe;fin(p.country,'fee',fe);}subCost(k,q);toast(`Parduota ${q}× ${mkName(k)} už ₡${p2(net)}`);track('sell',q);track('earn',net);}
  tape(k,{n:p.name,s:side,q,p:qt.avg,you:1});eat_book(k,side,q);return true;}
function placeOrder(k,side,q,price){const p=S.p;q=Math.floor(q);price=+(+price).toFixed(2);
  if(isW(k))return toast('Ekipuotei galimi tik momentiniai sandoriai.');
  if(q<1||!(price>0))return toast('Įvesk kainą ir kiekį.');if(S.orders.length>=MAXORD)return toast(`Daugiausia ${MAXORD} užsakymų vienu metu.`);
  if(side==='buy'){if(p.money<q*price)return toast('Nepakanka pinigų.');p.money-=q*price;}else{if(owned(k)<q)return toast('Neturi tiek prekių.');take(k,q);}
  S.orders.push({id:S.nextOid++,k,side,qty:q,done:0,price,tick:S.tick});toast('Užsakymas pateiktas. Jis įvykdomas, kai rinka pasiekia tavo kainą.',3200);return true;}
function fillOrder(o,f){const p=S.p,v=f*o.price;o.done+=f;S.mk[o.k].vol+=f;tape(o.k,{n:pick(FIRST),s:o.side==='buy'?'sell':'buy',q:f,p:o.price,me:1});
  if(o.side==='buy'){give(o.k,f);addCost(o.k,f,v);track('buy',f);}else{p.money+=v*(1-(G('fee')/100));myC().treasury+=v*(G('fee')/100);fin(p.country,'fee',v*(G('fee')/100));subCost(o.k,f);track('sell',f);track('earn',v*(1-(G('fee')/100)));}}
function cancelOrder(id){const o=S.orders.find(x=>x.id===id);if(!o)return;const left=o.qty-o.done;if(o.side==='buy')S.p.money+=left*o.price;else give(o.k,left);S.orders=S.orders.filter(x=>x!==o);toast('Užsakymas atšauktas, likutis grąžintas.');}
const chg=(k,n)=>{const h=S.mk[k].hist,a=h[Math.max(0,h.length-1-n)];return (h[h.length-1]/a-1)*100;};
const chgHtml=v=>`<span class="${v>=0?'up':'dn'}">${v>=0?'▲':'▼'} ${Math.abs(v).toFixed(1)}%</span>`;
function demandTag(k){const r=S.mk[k].m/mkBase(k);return r>1.25?['Didelė paklausa','hot']:r<.8?['Perteklius','cold']:['Stabili rinka','mid'];}
function spark(k,n,w,h){const d=S.mk[k].hist.slice(-n),mn=Math.min(...d),mx=Math.max(...d),r=mx-mn||1;
  return `<svg class="spark" viewBox="0 0 ${w} ${h}" preserveAspectRatio="none"><polyline fill="none" stroke="${d[d.length-1]>=d[0]?'var(--ok)':'var(--hp)'}" stroke-width="1.5" points="${d.map((v,i)=>`${(i/(d.length-1)*w).toFixed(1)},${(h-2-(v-mn)/r*(h-4)).toFixed(1)}`).join(' ')}"/></svg>`;}
function chart(k,n){const d=S.mk[k].hist.slice(-n),W=320,H=130,pl=4,pr=44,pt=8,pb=16;const lines=S.orders.filter(o=>o.k===k).map(o=>o.price);
  let mn=Math.min(...d,...lines),mx=Math.max(...d,...lines);const pad=(mx-mn||mx*.02)*.12;mn-=pad;mx+=pad;
  const x=i=>pl+i/(d.length-1)*(W-pl-pr),y=v=>pt+(mx-v)/(mx-mn)*(H-pt-pb),up=d[d.length-1]>=d[0],c=up?'var(--ok)':'var(--hp)';
  const pts=d.map((v,i)=>`${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(' ');
  const grid=[0,.5,1].map(t=>{const v=mx-(mx-mn)*t,yy=y(v);return `<line x1="${pl}" x2="${W-pr}" y1="${yy}" y2="${yy}" stroke="var(--line)" stroke-width=".6"/><text x="${W-pr+4}" y="${yy+3}" fill="var(--muted)" font-size="9">${p2(v)}</text>`;}).join('');
  const ol=S.orders.filter(o=>o.k===k).map(o=>`<line x1="${pl}" x2="${W-pr}" y1="${y(o.price)}" y2="${y(o.price)}" stroke="${o.side==='buy'?'var(--ok)':'var(--brass2)'}" stroke-width="1" stroke-dasharray="4 3"/>`).join('');
  const hrs=d.length-1,lab=hrs>=48?`prieš ${Math.round(hrs/24)} d.`:`prieš ${hrs} val.`;
  return `<svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="Kainos grafikas">${grid}<polygon points="${pl},${H-pb} ${pts} ${W-pr},${H-pb}" fill="${c}" opacity=".12"/><polyline points="${pts}" fill="none" stroke="${c}" stroke-width="1.8" stroke-linejoin="round"/>${ol}
   <circle cx="${x(d.length-1)}" cy="${y(d[d.length-1])}" r="3" fill="${c}"/><text x="${pl}" y="${H-3}" fill="var(--muted)" font-size="9">${lab}</text><text x="${W-pr}" y="${H-3}" fill="var(--muted)" font-size="9" text-anchor="end">dabar</text></svg>`;}

// ---------- simulation ----------
function declareWar(a,b,chain){if(atWar(a,b)||a===b||!C(a).alive||!C(b).alive)return;
  if(allied(a,b)){const al=alOf(a);addNews(`🗡 Išdavystė! ${C(a).short} užpuolė sąjungininkę ${C(b).short} ir paliko aljansą „${al.name}“.`,near(a,b)||alNear(al));alLeave(a,true);}
  S.wars.push({a,b,since:S.tick});addNews(`⚔ ${C(a).short} paskelbė karą šaliai ${C(b).short}!`,near(a,b));
  // allies of the attacked country may join the war
  if(!chain){const al=alOf(b);if(al)al.members.slice().forEach(m=>{if(m===b||m===a||!C(m).alive||atWar(m,a)||allied(m,a)||ov(m).mode==='frozen'||R()>=G('allyJoin')/100)return;
    if(m===S.p.country)queueBill({kind:'war',t:a},botMp());else declareWar(m,a,true);});}}
function makePeace(a,b,quiet,terms){const mine=x=>(x.att===a&&x.def===b)||(x.att===b&&x.def===a);
  S.wars=S.wars.filter(w=>!((w.a===a&&w.b===b)||(w.a===b&&w.b===a)));S.battles.filter(mine).forEach(refund);S.battles=S.battles.filter(x=>!mine(x));
  if(terms==='back'){let n=0;S.owner.forEach((o,r)=>{const h=M.regions[r].home;if(o===a&&h===b){S.owner[r]=b;n++;}else if(o===b&&h===a){S.owner[r]=a;n++;}});if(n){rebuildOwn();fixCap(a);fixCap(b);renderTerritory();}}
  if(!quiet)addNews(`🕊 ${C(a).short} ir ${C(b).short} pasirašė taiką${terms?': '+TERMS[terms]:''}.`,near(a,b));}
// battle: sides 0 = attacker, 1 = defender; first to G('rwin') rounds, a round is won at G('rp') points
const sideC=(b,s)=>s?b.def:b.att;
const bonus=(b,s)=>b.bon[s]+(C(sideC(b,s)).mobil>S.tick?G('mobilBonus')/100:0);
function startBattle(att,region,rev){
  if(S.battles.some(b=>b.region===region))return;
  const def=S.owner[region];if(def===att)return;
  let adj=0;M.regions[region].adj.forEach(a=>{if(S.owner[a]===att)adj++;});
  const b={id:S.nextBattleId++,region,att,def,rw:[0,0],pts:[0,0],dmg:[0,0],tot:[0,0],pl:[0,0],round:1,start:S.tick,bounty:[0,0],
    bon:[rev?G('revBon')/100:Math.min(.2,adj*.05),C(def).cap===region?.55:.25],feed:[[],[]],gain:null};
  if(rev){b.rev=1;rs('start');}S.battles.push(b);
  if(rev)addNews(`✊ Sukilimas! ${M.regions[region].name} gyventojai sukilo prieš ${C(def).short} už ${C(att).short}.`,near(att,def));
  else if(near(att,def))addNews(`🔥 Prasidėjo mūšis dėl ${M.regions[region].name}: ${C(att).short} puola ${C(def).short}.`,true);
}
function pushFeed(b,s,e){b.feed[s].unshift(e);if(b.feed[s].length>5)b.feed[s].length=5;}
function resolveBattle(b,win){
  const reg=M.regions[b.region],p=S.p;
  if(b.pl[0]||b.pl[1]){const mine=b.pl[win];
    if(mine>0){const reward=Math.round(15+mine/40);p.money+=reward;p.st.won++;track('win',1);p.st.money+=reward;let t=`Laimėjai mūšį dėl ${reg.name}! +₡${reward}`;
      if(mine>=400&&G('crWin')){p.inv.crate+=G('crWin');p.st.crates+=G('crWin');t+=` ir 📦×${G('crWin')}`;}toast(t);}
    else toast(`Mūšis dėl ${reg.name} pralaimėtas.`);}
  if(b.rev){rs(win===0?'won':'lost');if(win===0){delete S.rev[b.region];delete S.revCd[b.region];}else{S.rev[b.region]=G('revMax')*G('revKeep')/100;S.revCd[b.region]=S.tick+G('revCd');
      addNews(`✊ Sukilimas ${reg.name} numalšintas: ${C(b.def).short} išlaikė regioną.`,near(b.att,b.def));}}
  if(win===0&&S.owner[b.region]===b.def&&(C(b.att).alive||b.rev)){
    const old=b.def;S.owner[b.region]=b.att;
    if(!C(b.att).alive){const c=C(b.att);c.alive=true;c.cap=b.region;c.treasury=Math.max(c.treasury,G('revCash'));c.leader=botName();rs('restored');
      addNews(`🎉 ${c.name} atkurta! Sukilėliai išvadavo ${reg.name}.`,true);if(S.p.country===b.att)toast(`🎉 Tavo valstybė ${c.short} atkurta!`,4000);}
    rebuildOwn();
    addNews(b.rev?`✊ Sukilėliai išvadavo regioną „${reg.name}“: jis vėl priklauso ${C(b.att).short}.`:`🏴 ${C(b.att).short} užėmė regioną „${reg.name}“.`,near(b.att,old));
    if(C(old).cap===b.region){const rs=OWN[old];if(rs.length){C(old).cap=rs.reduce((m,r)=>M.regions[r].cells>M.regions[m].cells?r:m,rs[0]);}}
    C(b.att).treasury+=150;fin(b.att,'war',150);
    if(OWN[old].length===0){C(old).alive=false;alLeave(old);S.wars=S.wars.filter(w=>w.a!==old&&w.b!==old);S.battles=S.battles.filter(x=>x.att!==old||x.rev);
      addNews(`☠ ${C(old).name}: valstybė nustojo egzistavusi. Ją užkariavo ${C(b.att).short}. Piliečiai gali kelti sukilimus.`,true);
      if(p.country===old){p.mp=false;p.president=false;C(old).playerPres=false;S.bills=[];lastConq=b.att;showModal('defeat');}
    }
    renderTerritory();
  } else if(near(b.att,b.def))addNews(`🛡 ${C(b.def).short} apgynė ${reg.name} nuo ${C(b.att).short}.`,true);
}
const botLvl=ci=>1+(((C(ci).lvl||1)-1)*S.bots.ptsBot+(C(ci).pres||0)*S.bots.ptsPrest)*G('botPt')/100;
function botDmg(ci){return botLvl(ci)*power(ci)*rr(.6,1.4)*S.bots.power*(ci===S.p.country?S.bots.ally:1)*(ov(ci).pw||1);}
const revPw=ci=>S.owner.reduce((n,o,r)=>n+(o!==ci&&M.regions[r].home===ci?1:0),0)*28*G('revPop')/100;
function battleTick(b){
  for(let s=0;s<2;s++){const ci=sideC(b,s),al=alOf(ci);let d=botDmg(ci)*bmul(b,s);
    if(b.rev){if(s)d*=G('revDef')/100;else d+=revPw(ci)*botLvl(ci)*rr(.6,1.4)*S.bots.power*bmul(b,s);}
    if(al){let h=0;al.members.forEach(m=>{if(m!==ci&&C(m).alive)h+=botDmg(m);});d+=Math.min(d,h*G('allyHelp')/100);}
    if(pool(b,s)>0){d*=1+G('bountyBot')/100;b.bounty[s]=Math.max(0,b.bounty[s]-G('bountyHit')*2);}
    b.dmg[s]+=d;b.tot[s]+=d;dmgC(ci,d);
    const crit=R()<.15,part=d*rr(.35,.75);pushFeed(b,s,{n:pick(FIRST),w:Math.floor(R()*R()*R()*6),d:Math.round(part),c:crit});
    if(R()<.6)pushFeed(b,s,{n:pick(FIRST),w:Math.floor(R()*R()*R()*6),d:Math.round(d-part),c:false});}
  const sum=b.dmg[0]+b.dmg[1],lead=b.dmg[0]>b.dmg[1]?0:1,sh=b.dmg[lead]/(sum||1),g=sh>.8?3:sh>.62?2:1;
  b.pts[lead]+=g;b.gain={s:lead,g};
  if(b.pts[lead]>=G('rp')){b.rw[lead]++;if(b.rw[lead]>=G('rwin'))return lead;
    b.round++;b.pts=[0,0];b.dmg=[0,0];b.gain=null;
    if(near(b.att,b.def))addNews(`Raundą dėl ${M.regions[b.region].name} laimėjo ${C(sideC(b,lead)).short} (${b.rw[0]}:${b.rw[1]}).`,true);}
  return -1;
}
function step(){
  if(S.over)return;
  S.tick++;const p=S.p,B=S.bots;
  p.hp=Math.min(p.maxHp,p.hp+p.maxHp*G('hpRegP')/100);p.en=Math.min(p.maxEn,p.en+p.maxEn*G('enRegP')/100);p.companies.forEach(c=>{c.eff=Math.min(coCap(c),c.eff+coAuto(c));});
  S.countries.forEach((c,i)=>{if(c.alive){const v=OWN[i].length*G('regInc');c.treasury+=v;fin(i,'reg',v);}});
  const done=[];
  for(const b of S.battles){if(S.owner[b.region]!==b.def||(!C(b.att).alive&&!b.rev)){done.push([b,-2]);continue;}const w=battleTick(b);if(w>=0)done.push([b,w]);}
  if(done.length){const ids=new Set(done.map(d=>d[0].id));S.battles=S.battles.filter(b=>!ids.has(b.id));done.forEach(([b,w])=>{refund(b);if(w>=0)resolveBattle(b,w);});}
  if(S.tick%2===0){const byC={};S.wars.forEach(w=>{(byC[w.a]=byC[w.a]||[]).push(w.b);(byC[w.b]=byC[w.b]||[]).push(w.a);});
    const busy=new Set(S.battles.map(b=>b.region));
    for(const k in byC){const ci=+k,c=C(ci);if(!c.alive||ov(ci).mode==='frozen')continue;
      const mine=S.battles.filter(b=>b.att===ci).length,cap=1+Math.floor(OWN[ci].length/9);
      if(mine>=cap||R()>.3*B.activity)continue;
      const en=byC[k],targets=[];OWN[ci].forEach(r=>M.regions[r].adj.forEach(a=>{if(en.includes(S.owner[a])&&!busy.has(a))targets.push(a);}));
      if(targets.length){const t=pick(targets);busy.add(t);startBattle(ci,t);}}}
  citTick();resolveBills();mkTick();
  if(S.tick%24===0)newDay();
  checkVictory();
  if(S.tick%5===0)save();
  refresh();
}
function newDay(){
  const p=S.p,day=S.tick/24,B=S.bots,me=p.country;
  const wages=p.companies.reduce((a,c)=>a+c.workers,0)*G('wage');if(wages){if(p.money>=wages){p.money-=wages;p.wageOk=true;}else{p.wageOk=false;toast('Neužteko pinigų algoms. Darbuotojai šiandien nedirba.',3500);}}
  msRoll();S.fin.y=S.fin.t;S.fin.t={};{const t={};for(const k in S.cdm.t)t[k]=Math.round(S.cdm.t[k]);S.cdm.h.unshift(t);if(S.cdm.h.length>29)S.cdm.h.length=29;S.cdm.t={};}
  S.countries.forEach(c=>{if(!c.alive)return;c.bx=(c.bx||0)+B.xp*rr(.2,.6);while(c.bx>=1){c.bx--;c.lvl=(c.lvl||1)+1;if(c.lvl>G('maxLvl')){c.lvl=1;c.pres=(c.pres||0)+1;}}});
  {const pay=p.president?G('presPay'):p.mp?G('mpPay'):0;if(pay&&myC().treasury>=pay){spend(me,pay);p.money+=pay;}}
  mkDay();
  S.alliances.slice().forEach(al=>{if(al.members.length<2&&S.tick-al.t>240)alDrop(al);});
  S.countries.forEach((c,ci)=>{if(!c.alive)return;
    const m=ov(ci).mode,calm=m==='peaceful'||m==='frozen',wars=S.wars.filter(w=>w.a===ci||w.b===ci),al=alOf(ci);
    if(wars.length===0&&!calm&&S.wars.length<B.maxWars&&R()<.022*B.aggr*(m==='aggressive'?4:1)){
      const nb=neighbors(ci).filter(n=>C(n).alive&&!allied(ci,n));
      if(nb.length){nb.sort((x,y)=>power(x)-power(y));const t=R()<.7?nb[0]:pick(nb);if(power(ci)>power(t)*.8||m==='aggressive')aiAct(ci,{kind:'war',t});}}
    // betrayal: a member turns on a weaker neighbouring ally
    if(al&&!calm&&R()<G('betray')/100*B.aggr){const nb=neighbors(ci).filter(n=>C(n).alive&&allied(ci,n)&&power(n)<power(ci)*1.2);if(nb.length)aiAct(ci,{kind:'war',t:pick(nb)});}
    wars.forEach(w=>{const o=w.a===ci?w.b:w.a,age=S.tick-w.since;
      if(age>24*4&&R()<.16*B.peace*(m==='peaceful'?3:m==='aggressive'?.3:1))aiAct(ci,{kind:'peace',t:o,terms:occ(ci,o)>=occ(o,ci)?'keep':'back'});});
    if(wars.length&&c.treasury>G('mobilCost')*2.4&&R()<.4)aiAct(ci,{kind:'mobil'});
    if(wars.length&&c.treasury>700&&R()<.3){const bs=S.battles.filter(b=>(b.att===ci&&b.dmg[0]<b.dmg[1])||(b.def===ci&&b.dmg[1]<b.dmg[0]));if(bs.length)aiAct(ci,{kind:'bounty',bid:pick(bs).id,amt:200});}
    if(c.treasury>G('bldCost')*4&&R()<(wars.length?.5:.2)){let rs=OWN[ci].filter(r=>[...M.regions[r].adj].some(a=>S.owner[a]!==ci));if(!rs.length||R()<.3)rs=[c.cap];
      const r=pick(rs),bk=R()<.5?'b':'k';if(c.treasury>bldCost(r,bk)*2)aiAct(ci,{kind:'build',r,bk});}
    if(!al){if(R()<.006)aiAct(ci,{kind:'allyNew',name:alName()});}
    else if(al.leader===ci){if(al.members.length<G('allyMax')&&R()<.2){const set=new Set();al.members.forEach(x=>neighbors(x).forEach(n=>{if(C(n).alive&&!al.members.includes(n)&&!al.members.some(y=>atWar(y,n)))set.add(n);}));
      const cs=[...set];if(cs.length)aiAct(ci,{kind:'allyInv',t:pick(cs)});}}
    else if(R()<.004)aiAct(ci,{kind:'allyLeave'});
    if(R()<.02){const v=5*Math.round(rr(1,5));if(v!==c.tax)aiAct(ci,{kind:'tax',v});}
  });
  citDay();revDay();
  if(day%G('elecDays')===0&&myC().alive)election();
}
// ---------- treasury, parliament, alliances, buildings, bounties ----------
function fin(ci,k,v){if(S.fin&&ci===S.p.country)S.fin.t[k]=(S.fin.t[k]||0)+v;}
function spend(ci,v){C(ci).treasury-=v;fin(ci,'out',-v);}
const occ=(a,b)=>OWN[a].reduce((n,r)=>n+(M.regions[r].home===b?1:0),0);
function fixCap(ci){const c=C(ci),rs=OWN[ci];if(!rs.length||S.owner[c.cap]===ci)return;c.cap=rs.includes(M.caps[ci])?M.caps[ci]:rs.reduce((m,r)=>M.regions[r].cells>M.regions[m].cells?r:m,rs[0]);}
const TERMS={keep:'kiekviena šalis pasilieka užimtas žemes',back:'užimtos žemės grąžinamos'};
// ---------- revolts and bot citizens ----------
// S.rev[region] = revolt points of the region's original (home) country; at G('revMax') a revolt battle starts.
// S.cit = individual bot citizens: {n:name, c:citizenship, hp, m:money, o:1 = opportunist, x:days without a state}
let lastConq=-1,CN=10,CT='mix';
const revOk=r=>{const h=M.regions[r].home,o=S.owner[r];return o!==h&&(G('revAlly')||!allied(h,o));};
const revBusy=r=>S.battles.some(b=>b.region===r);
const revCool=r=>Math.max(0,(S.revCd[r]||0)-S.tick);
const rs=k=>{S.rstat=S.rstat||{};S.rstat[k]=(S.rstat[k]||0)+1;};
const revCount=ci=>S.battles.filter(b=>b.rev&&b.att===ci).length;
function revAdd(r,v){if(!revOk(r)||revBusy(r)||revCool(r))return false;const h=M.regions[r].home;
  S.rev[r]=Math.min(G('revMax'),(S.rev[r]||0)+v);
  if(S.rev[r]>=G('revMax')&&revCount(h)<G('revLim')){S.rev[r]=0;startBattle(h,r,true);}return true;}
// regions occupied from each country where a revolt can be raised now
function revTargets(){const t={};S.owner.forEach((o,r)=>{const h=M.regions[r].home;if(o!==h&&revOk(r)&&!revBusy(r)&&!revCool(r))(t[h]=t[h]||[]).push(r);});return t;}
function revDay(){const k=1-G('revDecay')/100;for(const r in S.rev){if(!revOk(+r)){delete S.rev[r];continue;}S.rev[r]*=k;if(S.rev[r]<.5)delete S.rev[r];}
  for(const r in S.revCd)if(S.revCd[r]<=S.tick)delete S.revCd[r];}
function newCit(ci,type){const o=type==='opp'?1:type==='loyal'?0:(R()<G('cOpp')/100?1:0);return citFix({n:botName(),c:ci,hp:G('cHp'),m:Math.round(rr(5,40)),o,x:0});}
// l = level, r = resets (prestige), d = total damage, co = companies
function citFix(z){if(z.l==null){z.l=clamp(Math.round((C(z.c).lvl||1)*rr(.5,1.3)),1,G('maxLvl'));z.r=C(z.c).pres||0;z.d=z.d||0;z.co=R()<G('cCo')/100?1:0;z.xp=0;}return z;}
function citInit(){S.cit=[];S.rev=S.rev||{};S.revCd=S.revCd||{};const per=G('cStart');if(!per)return;
  S.countries.forEach((c,ci)=>{if(!c.alive)return;for(let i=0;i<OWN[ci].length*per&&S.cit.length<G('cMax');i++)S.cit.push(newCit(ci));});}
const citBy=()=>{const n=new Array(NC).fill(0);S.cit.forEach(z=>n[z.c]++);return n;};
function citRandC(){const al=S.countries.filter(c=>c.alive);let t=0;al.forEach(c=>t+=OWN[c.id].length);let x=R()*t;for(const c of al){x-=OWN[c.id].length;if(x<0)return c.id;}return al[0].id;}
function citAdd(n,ci,type){n=Math.max(0,Math.floor(n));const room=Math.max(0,G('cMax')-S.cit.length),k=Math.min(n,room);
  for(let i=0;i<k;i++)S.cit.push(newCit(ci>=0?ci:citRandC(),type));
  toast(k<n?`Pridėta ${k} botų. Pasiektas limitas ${G('cMax')} (keičiamas nustatymuose).`:`Pridėta ${k} botų${ci>=0?' šaliai '+C(ci).short:''}.`,3000);}
function citDel(n,ci,type){n=Math.max(0,Math.floor(n));const ok=z=>(ci<0||z.c===ci)&&(type==='mix'||(type==='opp')===!!z.o);
  const idx=[];S.cit.forEach((z,i)=>{if(ok(z))idx.push(i);});for(let i=idx.length-1;i>0;i--){const j=Math.floor(R()*(i+1));[idx[i],idx[j]]=[idx[j],idx[i]];}
  const kill=new Set(idx.slice(0,n));S.cit=S.cit.filter((_,i)=>!kill.has(i));toast(`Pašalinta ${kill.size} botų${ci>=0?' iš šalies '+C(ci).short:''}.`);}
function citHit(z,b,s){const ci=sideC(b,s);let d=G('cDmg')*(G('cLvl')?botLvl(z.c):1)*rr(.6,1.4)*S.bots.power*bmul(b,s);if(ci===S.p.country)d*=S.bots.ally;
  z.hp-=G('cHitHp');b.dmg[s]+=d;b.tot[s]+=d;z.d=(z.d||0)+d;dmgC(ci,d);
  if(pool(b,s)>0){const pay=Math.min(b.bounty[s],G('bountyHit'));b.bounty[s]-=pay;z.m+=pay;}
  if(R()<G('cFeed')/100)pushFeed(b,s,{n:z.n,w:Math.floor(R()*R()*4),d:Math.round(d),c:false,bot:z.o?'o':'l'});}
function citTick(){const L=S.cit;if(!L||!L.length)return;
  const act=G('cAct')/100,hpMax=G('cHp'),reg=G('cHpReg'),cost=G('cHitHp');
  const tg=revTargets(),own={},rb={},bnt=[];
  S.battles.forEach(b=>{for(let s=0;s<2;s++){const ci=sideC(b,s);(own[ci]=own[ci]||[]).push([b,s]);if(pool(b,s)>0)bnt.push([b,s]);}if(b.rev)(rb[b.att]=rb[b.att]||[]).push(b);});
  for(const z of L){z.hp=Math.min(hpMax,z.hp+reg);if(R()>=act)continue;const ci=z.c,c=C(ci),fit=z.hp>=cost;
    // 1) revolt has priority: fight an ongoing revolt or push the revolt meter
    if(fit&&R()<G('cRev')/100){if(rb[ci]&&R()<.6){citHit(z,pick(rb[ci]),0);continue;}
      const t=tg[ci];if(t&&t.length){let r=t[0];for(let i=0;i<3;i++){const q=pick(t);if((S.rev[q]||0)>(S.rev[r]||0))r=q;}z.hp-=cost;revAdd(r,G('revBot'));if(revBusy(r))tg[ci]=t.filter(x=>x!==r);continue;}}
    // 2) fight where a bounty is paid: loyal bots for their own country (and allies), opportunists for anyone
    if(fit&&bnt.length&&R()<G('cBounty')/100){const ok=bnt.filter(([b,s])=>{const x=sideC(b,s);return z.o||x===ci||(G('cAllyF')&&allied(x,ci));});
      if(ok.length){const [b,s]=ok.reduce((m,e)=>pool(e[0],e[1])>pool(m[0],m[1])?e:m,ok[0]);citHit(z,b,s);continue;}}
    // 3) defend / attack for their own country without a bounty
    if(fit&&own[ci]&&R()<G('cFight')/100){const [b,s]=pick(own[ci]);citHit(z,b,s);continue;}
    // 4) otherwise work: the economy grows, part goes to the treasury
    const w=G('cWork'),tx=w*G('cTax')/100;z.m+=w-tx;if(c.alive){c.treasury+=tx;fin(ci,'cit',tx);}}}
function citScore(ci,n){const c=C(ci);if(!c.alive)return 0;const pop=(n[ci]||0)+5;
  const eco=(OWN[ci].length*G('regInc')*24+Math.max(0,c.treasury)*.05+G('cWork')*24)*(1-c.tax/100)/pop;
  let war=0;S.battles.forEach(b=>{if(b.att===ci)war+=pool(b,0)+b.rw[0]*20;if(b.def===ci)war+=pool(b,1)+b.rw[1]*20;});
  return eco*G('cOppEco')+war/pop*G('cOppWar')+.01;}
function citDay(){const L=S.cit;if(!L||!L.length)return;const n=citBy(),moved={},don=G('cDon')/100,loy=G('cLoyal'),me=S.p.country;
  const alive=S.countries.filter(c=>c.alive).map(c=>c.id),sc={},score=ci=>sc[ci]!=null?sc[ci]:(sc[ci]=citScore(ci,n));
  const go=(z,to,why)=>{rs(why==='o'?'opp':'loy');const k=z.c+'>'+to+'>'+why;moved[k]=(moved[k]||0)+1;n[z.c]--;n[to]++;migr(z.c,to);z.c=to;z.x=0;};
  const mx=G('maxLvl'),xp=G('cXp')*S.bots.xp,cc=G('cCoCost'),cm=G('cCoMax'),cb=G('cCoBuild')/100,ci2=G('cCoInc');
  for(const z of L){const c=C(z.c);
    z.xp=(z.xp||0)+xp*rr(.5,1.5);while(z.xp>=1){z.xp--;z.l++;if(z.l>mx){z.l=1;z.r++;}}
    if(z.co&&ci2){const v=z.co*ci2,tx=c.alive?v*c.tax/100:0;z.m+=v-tx;if(tx){c.treasury+=tx;fin(z.c,'cit',tx);}}
    if(z.co<cm&&z.m>=cc*1.5&&R()<cb){z.m-=cc;z.co++;}
    if(c.alive){z.x=0;if(z.m>20&&don>0){const v=z.m*don;z.m-=v;c.treasury+=v;fin(z.c,'cit',v);}}
    else{z.x++;if(don>0&&z.m>20){const v=z.m*don;z.m-=v;c.treasury+=v;}}
    if(z.o){if(R()<G('cOppChk')/100||!c.alive){const pool2=G('cOppNear')&&c.alive?neighbors(z.c).filter(x=>C(x).alive):alive;if(!pool2.length)continue;
        let best=z.c,bv=score(z.c);for(let i=0;i<6;i++){const t=pick(pool2);if(t!==z.c&&score(t)>bv){best=t;bv=score(t);}}
        if(best!==z.c&&(bv>score(z.c)*(1+G('cOppGain')/100)||!c.alive)&&z.m>=G('cOppCost')){z.m-=G('cOppCost');go(z,best,'o');}}}
    else if(!c.alive&&loy>0&&z.x>=loy){const t=S.owner[M.caps[z.c]];if(t!==z.c&&C(t).alive)go(z,t,'l');}}
  for(const k in moved){const [a,b,why]=k.split('>'),q=moved[k];if(+a===me||+b===me)
    addNews(why==='o'?`💼 ${q} oportunist${q===1?'as':'ai'} iš ${C(+a).short} dėl naudos tapo ${C(+b).short} piliečiais.`:`🏳 ${q} ${C(+a).short} piliečių po ${loy} d. be valstybės priėmė ${C(+b).short} pilietybę.`,true);}}
// ---------- country statistics and rankings ----------
// S.cdm.t = damage per country today, S.cdm.h = the 29 previous days; S.mig[ci] = [immigrated, emigrated]
function dmgC(ci,d){if(S.cdm)S.cdm.t[ci]=(S.cdm.t[ci]||0)+d;}
function migr(a,b){if(a===b||!S.mig)return;(S.mig[b]=S.mig[b]||[0,0])[0]++;(S.mig[a]=S.mig[a]||[0,0])[1]++;}
function dmgP(ci,days){let v=S.cdm.t[ci]||0;for(let i=0;i<days-1&&i<S.cdm.h.length;i++)v+=S.cdm.h[i][ci]||0;return v;}
// one pass over all citizens: count, money and companies for every country
function cStats(){const n=new Array(NC).fill(0),m=new Array(NC).fill(0),co=new Array(NC).fill(0),p=S.p;
  (S.cit||[]).forEach(z=>{n[z.c]++;m[z.c]+=z.m;co[z.c]+=z.co||0;});
  n[p.country]++;m[p.country]+=p.money;p.companies.forEach(c=>{const o=S.owner[c.reg!=null?c.reg:C(p.country).cap];if(o!=null)co[o]++;});
  return S.countries.map((c,i)=>({ci:i,cit:n[i],imm:(S.mig[i]||[0,0])[0],emi:(S.mig[i]||[0,0])[1],co:co[i],cash:m[i],wealth:Math.max(0,c.treasury)+m[i],d1:dmgP(i,1),d7:dmgP(i,7),d30:dmgP(i,30)}));}
const TOPC={w:['Turtas','wealth','₡'],d1:['Žala šiandien','d1','🔥'],d7:['Žala 7 d.','d7','🔥'],d30:['Žala 30 d.','d30','🔥']};
const TOPP={d:['Žala','d','🔥'],m:['Turtas','m','₡'],r:['Resetai','r','🌟'],l:['Lygis','l','⭐']};
function players(){const p=S.p;return (S.cit||[]).map(z=>({n:z.n,c:z.c,d:z.d||0,m:z.m,r:z.r||0,l:z.l||1,o:z.o})).concat([{n:p.name,c:p.country,d:p.dmg,m:p.money,r:p.prestige,l:p.lvl,me:1}]);}
function rankOf(list,key,pick){return list.slice().sort((a,b)=>b[key]-a[key]).findIndex(pick)+1;}
const cbtn=(i,extra)=>`<button class="cbtn" data-act="cinfo" data-i="${i}">${sw(i)}<span>${flagOf(C(i).a)} ${esc(C(i).short)}</span>${extra||''}<i>›</i></button>`;
function topRows(rows,val,unit,me,row){const N=G('topN');let h=rows.slice(0,N).map((x,i)=>row(x,i+1)).join('');
  const k=rows.findIndex(me);if(k>=N)h+=`<div class="trow gap">⋯</div>`+row(rows[k],k+1);return `<div class="tlist">${h||'<div class="muted">Kol kas tuščia.</div>'}</div>`;}
function renderTops(){const p=S.p;let h=`<div class="seg">${[['c','🌍 Šalys'],['p','👤 Žaidėjai']].map(([k,n])=>`<button class="${tView===k?'on buy':''}" data-act="tView" data-i="${k}">${n}</button>`).join('')}</div>`;
  const chips=(o,cur,act)=>`<div class="chips">${Object.entries(o).map(([k,v])=>`<button class="chip${cur===k?' on':''}" data-act="${act}" data-i="${k}">${v[0]}</button>`).join('')}</div>`;
  const medal=i=>i<=3?['🥇','🥈','🥉'][i-1]:i;
  if(tView==='c'){const [,key,u]=TOPC[tcKey],rows=cStats().filter(x=>C(x.ci).alive||x[key]>0).sort((a,b)=>b[key]-a[key]);
    h+=chips(TOPC,tcKey,'tcKey')+`<div class="muted">${tcKey==='w'?'Turtas = šalies iždas + visų jos piliečių pinigai.':'Visa šalies kariuomenės, botų piliečių ir tavo padaryta žala mūšiuose.'}</div>`;
    h+=topRows(rows,key,u,x=>x.ci===p.country,(x,i)=>`<button class="trow${x.ci===p.country?' me':''}" data-act="cinfo" data-i="${x.ci}"><b class="tr">${medal(i)}</b>${sw(x.ci)}<span class="tn">${flagOf(C(x.ci).a)} ${esc(C(x.ci).short)}${C(x.ci).alive?'':' ☠'}</span><span class="tv">${u} ${fmt(x[key])}</span></button>`);}
  else{const [,key,u]=TOPP[tpKey],rows=players().sort((a,b)=>b[key]-a[key]||(key==='l'?b.r-a.r:key==='r'?b.l-a.l:0));
    h+=chips(TOPP,tpKey,'tpKey')+`<div class="muted">${{d:'Visa žala mūšiuose per žaidimą.',m:'Pinigai ₡ (tavo: be daiktų ir įmonių vertės).',r:'Kiek kartų pasiektas aukščiausias lygis ir pradėta iš naujo (prestižas).',l:'Dabartinis lygis, lygūs rikiuojami pagal resetus.'}[tpKey]}</div>`;
    h+=topRows(rows,key,u,x=>x.me,(x,i)=>`<div class="trow${x.me?' me':''}"><b class="tr">${medal(i)}</b><span class="tn">${esc(x.n)}${x.me?' (tu)':''}<small>${flagOf(C(x.c).a)} ${esc(C(x.c).short)} · ⭐${x.l}${x.r?' · 🌟'+x.r:''}</small></span><span class="tv">${u} ${fmt(x[key])}</span></div>`);}
  return h;}
function renderCInfo(ci){const p=S.p,c=C(ci),st=cStats(),x=st[ci],al=alOf(ci),wars=S.wars.filter(w=>w.a===ci||w.b===ci).map(w=>w.a===ci?w.b:w.a);
  const rk=(k)=>st.slice().sort((a,b)=>b[k]-a[k]).findIndex(y=>y.ci===ci)+1;
  let h=`<div class="box"><div class="row">${sw(ci,1)}<b class="grow">${flagOf(c.a)} ${esc(c.name)}</b>${ci===p.country?'<span class="tag">Tavo šalis</span>':''}</div>
   ${c.alive?'':'<div class="muted">☠ Valstybė okupuota: neturi nė vieno regiono.</div>'}
   <div class="row"><button class="btn sm alt grow" data-act="gotoC" data-i="${ci}" ${c.alive?'':'disabled'}>⌖ Žemėlapis</button>${ci===p.country?'<button class="btn sm grow" data-act="tab" data-i="country">Valdyti šalį</button>':''}<button class="btn sm alt grow" data-act="tab" data-i="tops">🏆 Topai</button></div></div>
   <div class="statstrip"><span>👥 ${fmt(x.cit)}</span><span>🛬 ${fmt(x.imm)}</span><span>🛫 ${fmt(x.emi)}</span><span>🏭 ${fmt(x.co)}</span></div>
   <div class="box"><h4>Gyventojai ir ekonomika</h4><dl class="kv">
    <dt>Piliečiai</dt><dd>${fmt(x.cit)}</dd><dt>Imigravo</dt><dd>${fmt(x.imm)}</dd><dt>Emigravo</dt><dd>${fmt(x.emi)}</dd><dt>Įmonės</dt><dd>${fmt(x.co)}</dd>
    <dt>Iždas</dt><dd>₡${fmt(c.treasury)}</dd><dt>Piliečių pinigai</dt><dd>₡${fmt(x.cash)}</dd><dt>Turtas</dt><dd>₡${fmt(x.wealth)} <span class="muted">· ${rk('wealth')} vieta</span></dd>
    <dt>Įmonių pelno mokestis</dt><dd>${c.tax}%</dd></dl></div>
   <div class="box"><h4>Kariuomenė</h4><dl class="kv">
    <dt>Žala šiandien</dt><dd>🔥 ${fmt(x.d1)} <span class="muted">· ${rk('d1')} vieta</span></dd><dt>Žala per 7 d.</dt><dd>🔥 ${fmt(x.d7)} <span class="muted">· ${rk('d7')} vieta</span></dd><dt>Žala per 30 d.</dt><dd>🔥 ${fmt(x.d30)} <span class="muted">· ${rk('d30')} vieta</span></dd>
    <dt>Regionai</dt><dd>${OWN[ci].length}</dd><dt>Karinė galia</dt><dd>${fmt(power(ci))}</dd><dt>Karių lygis</dt><dd>${c.lvl||1}${c.pres?' · 🌟'+c.pres:''}</dd>
    <dt>Pirmininkas</dt><dd>${esc(c.leader)}${c.playerPres?' (tu)':''}</dd><dt>Aljansas</dt><dd>${al?esc(al.name):'nėra'}</dd></dl>
    ${wars.length?`<div class="muted">Kariauja su:</div><div class="cbtns">${wars.map(w=>cbtn(w)).join('')}</div>`:'<div class="muted">Šiuo metu nekariauja.</div>'}</div>`;
  const best=players().filter(z=>z.c===ci).sort((a,b)=>b.d-a.d).slice(0,5);
  if(best.length)h+=`<div class="box"><h4>Stipriausi piliečiai</h4><div class="tlist">${best.map((z,i)=>`<div class="trow${z.me?' me':''}"><b class="tr">${i+1}</b><span class="tn">${esc(z.n)}${z.me?' (tu)':''}<small>⭐${z.l}${z.r?' · 🌟'+z.r:''}</small></span><span class="tv">🔥 ${fmt(z.d)}</span></div>`).join('')}</div></div>`;
  if(ci!==p.country&&c.alive)h+=`<div class="box"><h4>Emigracija</h4><div class="muted">Tapk šios šalies piliečiu už ₡100. Vietą parlamente prarasi.</div><button class="btn sm alt" data-act="emigrateTo" data-i="${ci}">Emigruoti į ${esc(c.short)}</button></div>`;
  return h;}
// alliances
const AN1=['Šiaurės','Plieno','Aušros','Laisvės','Geležinė','Rytų','Vakarų','Pietų','Vienybės','Audros','Erelių','Vilkų'],AN2=['sąjunga','lyga','ašis','brolija','koalicija','taryba'];
const alName=()=>{for(let i=0;i<20;i++){const n=pick(AN1)+' '+pick(AN2);if(!S.alliances.some(a=>a.name===n))return n;}return 'Sąjunga '+(S.nextAl||1);};
const alById=id=>S.alliances.find(a=>a.id===id)||null;
const alOf=ci=>C(ci).al?alById(C(ci).al):null;
const allied=(a,b)=>a!==b&&!!C(a).al&&C(a).al===C(b).al;
const alNear=al=>al.members.includes(S.p.country);
function alCreate(ci,name){const al={id:S.nextAl=(S.nextAl||0)+1,name:name||alName(),leader:ci,members:[ci],t:S.tick};S.alliances.push(al);C(ci).al=al.id;addNews(`🤝 ${C(ci).short} įkūrė aljansą „${al.name}“.`,alNear(al));return al;}
function alJoin(ci,al){if(C(ci).al)alLeave(ci,true);al.members.push(ci);C(ci).al=al.id;addNews(`🤝 ${C(ci).short} įstojo į aljansą „${al.name}“.`,alNear(al));}
function alDrop(al){al.members.forEach(m=>delete C(m).al);S.alliances=S.alliances.filter(x=>x!==al);addNews(`Aljansas „${al.name}“ iširo.`,alNear(al));}
function alLeave(ci,quiet){const al=alOf(ci);if(!al)return;const hot=alNear(al);al.members=al.members.filter(m=>m!==ci);delete C(ci).al;
  if(!quiet)addNews(`${C(ci).short} paliko aljansą „${al.name}“.`,hot);
  if(!al.members.length)return alDrop(al);
  if(al.leader===ci){al.leader=al.members.slice().sort((x,y)=>power(y)-power(x))[0];addNews(`Aljansui „${al.name}“ dabar vadovauja ${C(al.leader).short}.`,hot);}}
// buildings: b = bunker (cuts enemy damage), k = barracks (adds own damage); they work in their own region and in attacks launched from it
const BLD={b:{n:'Bunkeris',ic:'🏰'},k:{n:'Kareivinės',ic:'🎖'}};
const bld=(r,k)=>(S.bld[r]||{})[k]||0;
const bldCost=(r,k)=>G('bldCost')*(bld(r,k)+1);
function bldSide(b,s,k){if(s)return bld(b.region,k);let m=0;M.regions[b.region].adj.forEach(a=>{if(S.owner[a]===b.att)m=Math.max(m,bld(a,k));});return m;}
const bmul=(b,s)=>(1+bonus(b,s)+bldSide(b,s,'k')*G('barracksPer')/100)*(1-Math.min(.75,bldSide(b,1-s,'b')*G('bunkerPer')/100));
const pm=v=>{const x=Math.round((v-1)*100);return (x<0?'−':'+')+Math.abs(x)+'%';};
const pool=(b,s)=>b.bounty?b.bounty[s]:0;
function refund(b){if(!b.bounty)return;for(let s=0;s<2;s++)if(b.bounty[s]>0&&C(sideC(b,s)).alive){C(sideC(b,s)).treasury+=b.bounty[s];fin(sideC(b,s),'out',b.bounty[s]);b.bounty[s]=0;}}
// parliament of the player's country: the bots are stored, the player is one of the seats when elected
function ensureParl(){const p=S.p;if(S.parl&&S.parl.ci===p.country)return;const keep=!S.parl&&!!p.president,n=G('seats');
  const mps=[];if(keep)mps.push({n:p.name,v:99,me:true});while(mps.length<n)mps.push({n:botName(),v:Math.round(rr(15,60))});mps.sort((a,b)=>b.v-a.v);
  S.parl={ci:p.country,mps};p.mp=keep;p.president=keep;S.bills=[];S.election.candidate=false;S.countries.forEach(c=>c.playerPres=false);C(p.country).playerPres=keep;if(!keep)C(p.country).leader=mps[0].n;}
const botMp=()=>{const b=S.parl.mps.filter(m=>!m.me);return b.length?pick(b).n:botName();};
function billTitle(b){const r=b.r!=null?M.regions[b.r].name:'';switch(b.kind){
  case 'war':return `Skelbti karą šaliai ${C(b.t).short}`;
  case 'peace':return `Siūlyti taiką šaliai ${C(b.t).short}: ${TERMS[b.terms]}`;
  case 'peaceIn':return `${C(b.from).short} siūlo taiką: ${TERMS[b.terms]}`;
  case 'tax':return `Įmonių pelno mokestis ${b.v}%`;
  case 'mobil':return `Mobilizacija (₡${G('mobilCost')} iš iždo)`;
  case 'build':return `${BLD[b.bk].n}: ${r}, ${bld(b.r,b.bk)+1} lygis (₡${bldCost(b.r,b.bk)})`;
  case 'bounty':{const x=S.battles.find(q=>q.id===b.bid);return `₡${b.amt} premija mūšiui${x?' dėl '+M.regions[x.region].name:''}`;}
  case 'allyNew':return `Įkurti aljansą „${b.name}“`;
  case 'allyInv':return `Kviesti šalį ${C(b.t).short} į aljansą`;
  case 'allyIn':{const al=alById(b.al);return `Stoti į aljansą „${al?al.name:'?'}“ (kviečia ${C(b.from).short})`;}
  case 'allyLeave':return 'Palikti aljansą';}return '';}
const billKey=b=>[b.kind,b.t,b.from,b.r,b.bk,b.bid,b.al].join('|');
// returns a reason when the bill cannot be carried out
function billCheck(ci,b){const c=C(ci),al=alOf(ci);
  if(['war','peace','allyInv'].includes(b.kind)&&!(b.t>=0&&b.t!==ci&&C(b.t)&&C(b.t).alive))return 'Pasirink šalį.';
  switch(b.kind){
  case 'war':if(atWar(ci,b.t))return 'Su šia šalimi jau kariaujama.';break;
  case 'peace':if(!atWar(ci,b.t))return 'Su šia šalimi nekariaujama.';break;
  case 'peaceIn':if(!C(b.from).alive||!atWar(ci,b.from))return 'Karas jau baigėsi.';break;
  case 'tax':if(!(b.v>=0&&b.v<=50))return 'Mokestis turi būti nuo 0 iki 50%.';break;
  case 'mobil':if(c.treasury<G('mobilCost'))return `Ižde trūksta ₡${G('mobilCost')}.`;if(c.mobil>S.tick)return 'Mobilizacija jau vyksta.';break;
  case 'build':if(!(b.r>=0)||S.owner[b.r]!==ci)return 'Statyti galima tik savo valdomame regione.';if(bld(b.r,b.bk)>=G('bldMax'))return 'Pastatas jau aukščiausio lygio.';if(c.treasury<bldCost(b.r,b.bk))return `Ižde trūksta ₡${bldCost(b.r,b.bk)}.`;break;
  case 'bounty':{const x=S.battles.find(q=>q.id===b.bid);if(!x||(x.att!==ci&&x.def!==ci))return 'Mūšis jau baigėsi.';if(!(b.amt>0)||c.treasury<b.amt)return `Ižde trūksta ₡${b.amt}.`;break;}
  case 'allyNew':if(al)return 'Šalis jau yra aljanse.';if(S.alliances.length>=G('allyCount'))return 'Pasaulyje jau per daug aljansų.';break;
  case 'allyInv':if(!al||al.leader!==ci)return 'Kviesti gali tik aljanso vado šalis.';if(al.members.includes(b.t))return 'Ši šalis jau aljanse.';if(al.members.length>=G('allyMax'))return 'Aljansas pilnas.';if(al.members.some(m=>atWar(m,b.t)))return 'Ši šalis kariauja su aljanso nare.';break;
  case 'allyIn':{const a=alById(b.al);if(!a)return 'Aljanso nebėra.';if(a.members.includes(ci))return 'Jau esate šiame aljanse.';if(a.members.length>=G('allyMax'))return 'Aljansas pilnas.';break;}
  case 'allyLeave':if(!al)return 'Šalis nėra aljanse.';break;}
  return '';}
// chance that one bot deputy of country ci votes for the bill
function billP(ci,b){const c=C(ci),pw=power(ci),nw=S.wars.filter(w=>w.a===ci||w.b===ci).length;switch(b.kind){
  case 'war':if(allied(ci,b.t))return .08;return clamp(.25+.3*pw/power(b.t)-nw*.15,.05,.9);
  case 'peace':case 'peaceIn':{const o=b.kind==='peace'?b.t:b.from,g=occ(ci,o),l=occ(o,ci),w=S.wars.find(x=>(x.a===ci&&x.b===o)||(x.a===o&&x.b===ci)),age=w?(S.tick-w.since)/24:0,good=b.terms==='keep'?g-l:l-g;
    return clamp(.4+.14*Math.sign(good)+Math.min(.3,age*.03)+(power(o)>pw?.15:0),.05,.95);}
  case 'tax':return b.v<=15?.7:b.v<=30?.45:.2;
  case 'mobil':return nw?.7:.15;
  case 'build':return c.treasury>=bldCost(b.r,b.bk)*2?.75:.35;
  case 'bounty':return c.treasury>=b.amt*3?.7:.3;
  case 'allyNew':return .6;case 'allyInv':return .7;case 'allyLeave':return .25;
  case 'allyIn':{const al=alById(b.al);if(!al||al.members.some(m=>atWar(m,ci)))return .03;return c.al?.12:clamp(.4+.1*nw+(power(al.leader)>pw?.15:0),.1,.85);}}
  return .5;}
function runBill(ci,b){const e=billCheck(ci,b);if(e)return e;const c=C(ci);switch(b.kind){
  case 'war':declareWar(ci,b.t);break;
  case 'peace':decide(b.t,{kind:'peaceIn',from:ci,terms:b.terms});break;
  case 'peaceIn':makePeace(b.from,ci,false,b.terms);break;
  case 'tax':c.tax=b.v;if(ci===S.p.country)addNews(`🏛 Įmonių pelno mokestis šalyje dabar ${b.v}%.`,true);break;
  case 'mobil':spend(ci,G('mobilCost'));c.mobil=S.tick+48;if(ci===S.p.country)addNews(`🔺 ${c.short} paskelbė mobilizaciją 2 dienoms.`,true);break;
  case 'build':{spend(ci,bldCost(b.r,b.bk));const o=S.bld[b.r]=S.bld[b.r]||{};o[b.bk]=(o[b.bk]||0)+1;if(ci===S.p.country)addNews(`${BLD[b.bk].ic} ${M.regions[b.r].name}: ${BLD[b.bk].n.toLowerCase()} pasiekė ${o[b.bk]} lygį.`,true);break;}
  case 'bounty':{const x=S.battles.find(q=>q.id===b.bid),s=x.att===ci?0:1;spend(ci,b.amt);x.bounty=x.bounty||[0,0];x.bounty[s]+=b.amt;if(near(x.att,x.def))addNews(`💰 ${c.short} skyrė ₡${b.amt} premiją mūšiui dėl ${M.regions[x.region].name}.`,true);break;}
  case 'allyNew':alCreate(ci,b.name);break;
  case 'allyInv':decide(b.t,{kind:'allyIn',al:c.al,from:ci});break;
  case 'allyIn':alJoin(ci,alById(b.al));break;
  case 'allyLeave':alLeave(ci);break;}
  return '';}
function queueBill(b,by){ensureParl();if(S.bills.length>=6)return 'Parlamentas jau svarsto 6 siūlymus. Palauk, kol baigsis balsavimai.';
  const k=billKey(b);if(S.bills.some(x=>billKey(x)===k))return 'Toks siūlymas jau svarstomas.';
  b.id=S.nextBill=(S.nextBill||0)+1;b.by=by;b.end=S.tick+G('voteH');b.vote=0;S.bills.push(b);addNews(`🏛 Parlamentas svarsto: ${billTitle(b)}. Siūlo ${by}.`,true);return '';}
const tally=(p,n)=>{let y=0;for(let i=0;i<n;i++)if(R()<p)y++;return y;};
// a bot country acts: the player's country sends it to a real vote, other countries just do it
function aiAct(ci,b){if(billCheck(ci,b))return;if(ci===S.p.country)queueBill(b,botMp());else runBill(ci,b);}
// another country asks ci to agree to something
function decide(ci,b){const me=S.p.country;if(ci===me){queueBill(b,C(b.from).short);return;}
  const n=G('seats'),y=tally(billP(ci,b),n),ok=y>n-y&&!billCheck(ci,b);
  if(b.from===me){const t=`${C(ci).short}: parlamentas ${ok?'pritarė':'nepritarė'} (${y}:${n-y}) · ${b.kind==='peaceIn'?'taikos pasiūlymas':'kvietimas į aljansą'}`;addNews('🏛 '+t,true);toast(t,3500);}
  if(ok)runBill(ci,b);}
function resolveBills(){if(!S.bills||!S.bills.length)return;const p=S.p,ci=p.country,f=G('favor')/100,n=G('seats');
  const due=S.bills.filter(b=>b.end<=S.tick);if(!due.length)return;S.bills=S.bills.filter(b=>b.end>S.tick);
  due.forEach(b=>{let pr=billP(ci,b);if(b.mine)pr+=(1-pr)*f;const v=p.mp?b.vote:0;if(v>0)pr+=(1-pr)*f;if(v<0)pr*=1-f;
    const bots=n-(p.mp?1:0),yb=tally(pr,bots),y=yb+(v>0?1:0),no=bots-yb+(v<0?1:0);let ok=y>no,why='';const title=billTitle(b);
    if(ok){why=runBill(ci,b);if(why)ok=false;}
    S.votes.unshift({t:title,y,n:no,ok,tick:S.tick,why});if(S.votes.length>12)S.votes.length=12;
    addNews(`🏛 ${ok?'Priimta':'Atmesta'} (${y}:${no}): ${title}.${why?' '+why:''}`,true);if(b.mine||v)toast(`${ok?'✔ Priimta':'✖ Atmesta'} ${y}:${no} · ${title}`,3500);});}
function voteBill(id,v){const b=S.bills.find(x=>x.id===id);if(!b||!S.p.mp)return;b.vote=v;b.end=Math.min(b.end,S.tick+1);}
const PF={war:-1,peace:-1,terms:'keep',tax:10,bb:-1,ba:250,br:-1,bk:'b',inv:-1,mv:-1};
function propose(kind){const p=S.p,ci=p.country;if(!myC().alive)return toast('Tavo valstybė okupuota. Pirmiausia ją reikia atkurti sukilimais.');if(!p.mp)return toast('Siūlyti gali tik deputatai.');const b={kind,mine:true};
  if(kind==='war')b.t=+PF.war;if(kind==='peace'){b.t=+PF.peace;b.terms=PF.terms;}if(kind==='tax')b.v=+PF.tax;
  if(kind==='bounty'){b.bid=+PF.bb;b.amt=+PF.ba;}if(kind==='build'){b.r=+PF.br;b.bk=PF.bk;}if(kind==='allyInv')b.t=+PF.inv;if(kind==='allyNew')b.name=alName();
  toast(billCheck(ci,b)||queueBill(b,p.name)||'Siūlymas pateiktas. Deputatai balsuos.',3000);}
function election(){ensureParl();const p=S.p,ci=p.country,c=C(ci),n=G('seats');
  S.countries.forEach((x,i)=>{if(x.alive&&i!==ci&&R()<.4)x.leader=botName();});
  const old=S.parl.mps.filter(m=>!m.me).map(m=>m.n),all=[];
  for(let i=0;i<n+4;i++)all.push({n:i<old.length&&R()<.7?old[i]:botName(),v:Math.round(rr(15,60))});
  if(S.election.candidate||p.mp)all.push({n:p.name,v:Math.round((25+p.lvl*4+p.fame*.5+rr(0,20))*(1+G('favor')/100)),me:true});
  all.sort((a,b)=>b.v-a.v);const mps=all.slice(0,n),was=p.mp,wasP=p.president;
  S.parl.mps=mps;p.mp=mps.some(m=>m.me);p.president=!!mps[0].me;c.playerPres=p.president;c.leader=mps[0].n;
  S.election.last=all.map((m,i)=>({n:m.n,v:m.v,me:!!m.me,ok:i<n}));S.election.candidate=false;
  addNews(`🗳 Parlamento rinkimai (${c.short}): daugiausia balsų gavo ${mps[0].n} (${mps[0].v}).${p.mp?' Tu išrinktas į parlamentą.':''}`,true);
  if(p.mp&&(!was||p.president!==wasP))showModal('elected');else if(was&&!p.mp)toast('Tavo kadencija parlamente baigėsi.',3500);}
function checkVictory(){
  if(!S.over&&OWN[S.p.country].length===S.owner.length){S.over=true;save();showModal('victory');}
}

// ---------- player actions ----------
// ---------- character: levels, skills, prestige, missions ----------
const xpNeed=l=>G('xpBase')+l*G('xpPer');
const SK={atk:{n:'Žala',ic:'⚔',pk:'skAtk',u:'% žalos mūšyje',cost:1,max:80},
  def:{n:'Šarvai',ic:'🛡',pk:'skDef',u:'% gynybos',cost:1,max:30},
  hp:{n:'Gyvybės',ic:'❤',pk:'skHp',u:' gyvybių',cost:1,max:80},
  eff:{n:'Darbo našumas',ic:'🔨',pk:'skEff',u:'% darbo effort',cost:1,max:80},
  en:{n:'Darbo energija',ic:'⚡',pk:'skEn',u:' energijos',cost:1,max:80},
  co:{n:'Įmonių limitas',ic:'🏭',u:' įmonė',ck:'costCo',max:9},
  wk:{n:'Darbuotojai įmonėje',ic:'👷',u:' darbuotojas',ck:'costWk',max:9}};
const sk=k=>S.p.sk[k]||0,skPer=k=>SK[k].pk?G(SK[k].pk):1,skCost=k=>SK[k].ck?G(SK[k].ck):1;
const ptsTotal=()=>(S.p.lvl-1)*S.bots.ptsMe+S.p.prestige*S.bots.ptsPrest;
const ptsSpent=()=>Object.keys(SK).reduce((s,k)=>s+sk(k)*skCost(k),0);
const ptsFree=()=>ptsTotal()-ptsSpent();
const maxCo=()=>G('baseCo')+sk('co'),maxWk=()=>G('baseWk')+sk('wk');
function recalc(){const p=S.p;p.maxHp=100+sk('hp')*skPer('hp');p.maxEn=100+sk('en')*skPer('en');p.hp=Math.min(p.hp,p.maxHp);p.en=Math.min(p.en,p.maxEn);}
function gainXp(n){const p=S.p;if(p.lvl>=G('maxLvl'))return;p.xp+=n*S.bots.xp;let up=0;
  while(p.lvl<G('maxLvl')&&p.xp>=xpNeed(p.lvl)){p.xp-=xpNeed(p.lvl);p.lvl++;up++;}
  if(p.lvl>=G('maxLvl'))p.xp=0;
  if(up){if(G('lvlHeal')){p.hp=p.maxHp;p.en=p.maxEn;}toast(p.lvl>=G('maxLvl')?`Pasiekei ${G('maxLvl')} lygį! Galimas prestižas.`:`Naujas lygis: ${p.lvl}! +${up*S.bots.ptsMe} įgūdžių taškai`,3500);addNews(`⭐ ${p.name} pasiekė ${p.lvl} lygį.`,true);}}
const MT={hits:[n=>`Smok mūšyje ${n} kartų`,10],dmg:[n=>`Padaryk ${fmt(n)} žalos`,1500],win:[n=>`Laimėk mūšių: ${n}`,1],
  work:[n=>`Padirbėk įmonėse ${n} kartų`,5],prod:[n=>`Pagamink įmonėse ${n} prekių`,10],sell:[n=>`Parduok rinkoje ${n} prekių`,8],
  buy:[n=>`Nupirk rinkoje ${n} prekių`,5],eat:[n=>`Suvalgyk maisto: ${n}`,2],craft:[n=>`Pagamink inventoriuje daiktų: ${n}`,1],
  earn:[n=>`Uždirbk rinkoje ₡${fmt(n)}`,60],energy:[n=>`Išnaudok ${n} darbo energijos`,60],up:[n=>`Pagerink įmones ${n} kartų`,1],crate:[n=>`Atidaryk dėžių: ${n}`,1]};
const MTIER={d:{n:'Dieninės',days:1,mul:1,skip:['crate']},
  w:{n:'Savaitinės',days:7,mul:5},
  m:{n:'Mėnesinės',days:30,mul:18}};
const mt=(t,f)=>G(t+f);
function msNew(t){const T=MTIER[t],ks=Object.keys(MT).filter(k=>!(T.skip||[]).includes(k)).map(k=>[R(),k]).sort((a,b)=>a[0]-b[0]).slice(0,10).map(x=>x[1]);
  const nice=v=>{if(v<20)return Math.max(1,Math.round(v));const m=Math.pow(10,Math.floor(Math.log10(v))-1);return Math.round(v/m)*m;};
  return {bonus:false,list:ks.map(k=>({k,goal:nice(MT[k][1]*T.mul*rr(.8,1.3)),prog:0,done:false}))};}
function msRoll(){S.ms=S.ms||{};const day=Math.floor(S.tick/24),atDay=S.tick%24===0;for(const t in MTIER)if(!S.ms[t]||(atDay&&day%MTIER[t].days===0)){S.ms[t]=msNew(t);if(atDay&&S.tick)addNews(`📋 Naujos ${MTIER[t].n.toLowerCase()} misijos.`,true);}}
function track(k,n){if(!S.ms||!(n>0))return;const p=S.p;
  for(const t in MTIER){const T=MTIER[t],g=S.ms[t];if(!g)continue;
    for(const m of g.list){if(m.k!==k||m.done)continue;m.prog+=n;
      if(m.prog>=m.goal){m.prog=m.goal;m.done=true;p.money+=mt(t,'Cash');gainXp(mt(t,'Xp'));toast(`✔ Misija: ${MT[k][0](m.goal)} · +${Math.round(mt(t,'Xp')*S.bots.xp)} XP, +₡${mt(t,'Cash')}`,3200);}}
    if(!g.bonus&&g.list.filter(m=>m.done).length>=G('msNeed')){g.bonus=true;p.money+=mt(t,'Bc');p.inv.crate+=mt(t,'Cr');p.st.crates+=mt(t,'Cr');gainXp(mt(t,'Bx'));
      toast(`🏅 ${T.n} misijos: ${G('msNeed')} iš 10! +${Math.round(mt(t,'Bx')*S.bots.xp)} XP, +₡${mt(t,'Bc')}, 📦×${mt(t,'Cr')}`,4500);addNews(`🏅 Įvykdytos ${G('msNeed')} ${T.n.toLowerCase()} misijos. Premija: ₡${mt(t,'Bc')} ir ${mt(t,'Cr')} dėž.`,true);}}}

// ---------- companies ----------
// work adds effort, effort is turned into goods; engines and workers add effort every hour
const COMPANY={mine:{name:'Akmens kasykla',out:'iron',eff:6},smelter:{name:'Plieno liejykla',out:'steel',eff:10,inp:{iron:3}},
  fishery:{name:'Žvejybos įmonė',out:'fish',eff:6},restaurant:{name:'Restoranas',out:'cfish',eff:8,inp:{fish:2}},
  farm:{name:'Grūdų ūkis',out:'grain',eff:4},bakery:{name:'Kepykla',out:'bread',eff:6,inp:{grain:2}},
  claypit:{name:'Molio karjeras',out:'clay',eff:5},brickworks:{name:'Plytinė',out:'brick',eff:8,inp:{clay:2}},
  sawmill:{name:'Lentpjūvė',out:'wood',eff:7},carpentry:{name:'Stalių dirbtuvės',out:'plank',eff:9,inp:{wood:2}},
  leadmine:{name:'Švino kasykla',out:'lead',eff:8},ammoworks:{name:'Šovinių gamykla',out:'a1',q:10,eff:9,inp:{lead:1,steel:1}},
  oilrig:{name:'Naftos gręžinys',out:'oil',eff:10},refinery:{name:'Naftos perdirbimo gamykla',out:'fuel',eff:12,inp:{oil:2}}};
const coCap=c=>G('capBase')*(1+c.st),coAuto=c=>c.ae+(S.p.wageOk===false?0:c.workers*G('wkEff'));
const coLoc=c=>S.owner[c.reg],coQ=c=>COMPANY[c.type].q||1;let lastTax=0;
const buildCost=n=>n?Math.round(G('buildBase')*Math.pow(n,G('buildPow'))):0;
const aeCost=l=>Math.round(G('aeBase')*Math.pow(l+1,1.5)),stCost=l=>Math.round(G('stBase')*Math.pow(l+1,1.5)),hireCost=n=>G('hireBase')*(n+1);
const workGain=()=>G('workGain')*(1+sk('eff')*skPer('eff')/100);
function prodCount(c){const d=COMPANY[c.type];let n=Math.floor(c.eff/d.eff);if(d.inp)for(const k in d.inp)n=Math.min(n,Math.floor(S.p.inv[k]/d.inp[k]));return n;}
function coProduce(c){const p=S.p,d=COMPANY[c.type],n=prodCount(c);if(n<1||p.en<G('prodEn'))return 0;p.en-=G('prodEn');let val=n*coQ(c)*S.mk[d.out].m;if(d.inp)for(const k in d.inp){p.inv[k]-=d.inp[k]*n;val-=d.inp[k]*n*S.mk[k].m;}p.inv[d.out]+=n*coQ(c);c.eff-=n*d.eff;
  // profit tax goes to the country that owns the region the company stands in
  const lc=coLoc(c),tax=Math.min(p.money,Math.max(0,val)*C(lc).tax/100);p.money-=tax;C(lc).treasury+=tax;fin(lc,'tax',tax);lastTax+=tax;
  track('prod',n*coQ(c));track('energy',G('prodEn'));return n*coQ(c);}
const CA={
  coBuild(type){const p=S.p,n=p.companies.length,cost=buildCost(n);if(n>=maxCo())return toast('Pasiektas įmonių limitas. Kelk įgūdį „Įmonių limitas“.');
    if(p.inv.iron<cost)return toast(`Trūksta geležies: reikia ${cost}.`);p.inv.iron-=cost;p.companies.push({type,ae:0,st:0,workers:0,eff:0,reg:myC().cap});coView=null;toast(`Pastatyta: ${COMPANY[type].name}`);},
  coWork(i){const p=S.p,c=p.companies[i];if(p.en<G('workEn'))return toast('Per mažai darbo energijos.');if(c.eff>=coCap(c))return toast('Sandėlis pilnas. Pirma pagamink prekes arba padidink sandėlį.');
    p.en-=G('workEn');c.eff=Math.min(coCap(c),c.eff+workGain());track('work',1);track('energy',G('workEn'));},
  coProd(i){const p=S.p,c=p.companies[i],d=COMPANY[c.type];if(p.en<G('prodEn'))return toast('Per mažai darbo energijos.');
    if(prodCount(c)<1)return toast(c.eff<d.eff?'Per mažai sukaupto darbo effort.':'Trūksta žaliavų: '+costStr(d.inp));lastTax=0;const n=coProduce(c);toast(`Pagaminta: ${n}× ${ITEMS[d.out].n}${lastTax>=.01?` · mokestis ₡${p2(lastTax)}`:''}`);},
  coProdAll(){const got={};lastTax=0;S.p.companies.forEach(c=>{const n=coProduce(c);if(n){const o=COMPANY[c.type].out;got[o]=(got[o]||0)+n;}});const ks=Object.keys(got);
    toast(ks.length?'Pagaminta: '+ks.map(k=>`${got[k]}× ${ITEMS[k].n}`).join(', ')+(lastTax>=.01?` · mokestis ₡${p2(lastTax)}`:''):'Nėra ką gaminti arba trūksta energijos.',3200);},
  coMove(i,ci){const p=S.p,c=p.companies[i],cost=G('moveCost');if(!(ci>=0)||!C(ci).alive)return;if(coLoc(c)===ci)return toast('Įmonė jau yra šioje šalyje.');if(p.inv.steel<cost)return toast(`Perkėlimui reikia ${cost}× ${ITEMS.steel.n}.`);
    p.inv.steel-=cost;c.reg=C(ci).cap;coView=null;toast(`Įmonė perkelta: ${M.regions[c.reg].name}. Mokestis ${C(ci).tax}%.`,3200);},
  coUp(i,w){const p=S.p,c=p.companies[i],cost=w==='ae'?aeCost(c.ae):stCost(c.st);if(p.inv.iron<cost)return toast(`Trūksta geležies: reikia ${cost}.`);p.inv.iron-=cost;c[w]++;track('up',1);},
  coHire(i){const p=S.p,c=p.companies[i],cost=hireCost(c.workers);if(c.workers>=maxWk())return toast('Daugiau darbuotojų netelpa. Kelk įgūdį „Darbuotojai įmonėje“.');
    if(p.money<cost)return toast('Nepakanka pinigų.');p.money-=cost;c.workers++;},
  coFire(i){const c=S.p.companies[i];if(c.workers>0)c.workers--;},
  skill(k){const d=SK[k];if(sk(k)>=d.max)return toast('Įgūdis jau maksimalus.');if(ptsFree()<skCost(k))return toast('Trūksta įgūdžių taškų.');S.p.sk[k]=sk(k)+1;recalc();},
  respec(){const rc=G('respec');if(S.p.money<rc)return toast(`Perskirstymas kainuoja ₡${rc}.`);S.p.money-=rc;S.p.sk={};recalc();toast('Įgūdžiai atstatyti, taškai grąžinti.');},
  prestige(){const p=S.p;if(p.lvl<G('maxLvl'))return;p.prestige++;p.lvl=1;p.xp=0;p.sk={};recalc();$('#modal').hidden=true;addNews(`🌟 ${p.name} pasiekė ${p.prestige} prestižą.`,true);toast(`Prestižas ${p.prestige}! Pradedi su ${p.prestige*S.bots.ptsPrest} papildomais taškais.`,4500);}
};
const has=c=>Object.entries(c).every(([k,v])=>S.p.inv[k]>=v);
const pay=c=>Object.entries(c).forEach(([k,v])=>S.p.inv[k]-=v);
const eqG=s=>S.p.gear.find(g=>g.id===S.p.eq[s])||null;
function addGear(s,r,v){const a=SLOT[s].rng[r],g={id:S.nextWid++,s,r,v:v||Math.round(rr(a[0],a[1])),dur:gMax(s,r)};S.p.gear.push(g);if(!eqG(s))S.p.eq[s]=g.id;return g;}
function removeGear(g){const p=S.p;p.gear=p.gear.filter(x=>x!==g);if(p.eq[g.s]===g.id){const nx=p.gear.filter(x=>x.s===g.s).sort((a,b)=>b.v-a.v)[0];if(nx)p.eq[g.s]=nx.id;else delete p.eq[g.s];}}
const crW=el=>RAR.map((_,i)=>Math.max(0,G((el?'c2W':'crW')+i)));
function crRoll(el){const w=crW(el),t=w.reduce((a,b)=>a+b,0);if(!t)return 0;let x=R()*t;for(let i=0;i<w.length;i++){x-=w[i];if(x<0)return i;}return w.length-1;}
const crSlot=()=>R()<G('crWpn')/100?'w':pick(ARMOR);
const crOdds=el=>{const w=crW(el),t=w.reduce((a,b)=>a+b,0)||1;return RAR.map((r,i)=>w[i]?`<span style="color:${r.c}">${r.n} ${+(w[i]/t*100).toFixed(1)}%</span>`:'').filter(Boolean).join(' · ');};
const rollR=()=>{const x=R();return AODDS.findIndex(o=>x<o);};
const ammoOn=()=>{const k=S.p.ammoSel;return k&&S.p.inv[k]>0?k:null;};
// everything the equipped gear adds up to
function pstats(){const v=s=>{const g=eqG(s);return g?g.v:0;},def=Math.min(80,v('helm')+v('chest')+sk('def')*skPer('def')),a=ammoOn();
  return {atk:v('w')+sk('atk')*skPer('atk'),def,prec:Math.min(100,50+v('gloves')),dodge:v('pants'),crit:5+v('boots'),ammo:a?AMMO[a]:0,cost:G('hitCost')*(1-def/100)};}
const hitBase=(b,s,ps)=>G('baseDmg')*(1+ps.atk/100)*(1+ps.ammo)*(b?bmul(b,s):1);
// average damage of one hit: precise hits do full or critical damage, the rest do half
function hitDmg(b,s){const ps=pstats(),pr=ps.prec/100;return hitBase(b,s,ps)*(pr*(1+ps.crit/100)+(1-pr)*.5);}
const fmt1=v=>(Math.round(v*10)/10).toLocaleString('lt-LT');
const A={
  eat(k){const p=S.p;if(!k)k=p.inv.bread>0?'bread':p.inv.cfish>0?'cfish':null;if(!k||p.inv[k]<1)return toast('Neturi maisto. Pasigamink arba nusipirk rinkoje.');
    if(p.hp>=p.maxHp)return toast('Sveikata pilna.');p.inv[k]--;p.hp=Math.min(p.maxHp,p.hp+Math.round(p.maxHp*ITEMS[k].heal));track('eat',1);},
  hit(id,s){const p=S.p,b=S.battles.find(x=>x.id===id);if(!b)return;if(p.hp<pstats().cost)return toast('Per mažai sveikatos. Pavalgyk.');
    let total=0,n=0,anyCrit=false,dodged=0,bnt=0;
    for(let i=0;i<p.mult;i++){const ps=pstats();if(p.hp<ps.cost)break;
      const dodge=R()<ps.dodge/100,precise=R()<ps.prec/100,crit=precise&&R()<ps.crit/100,a=ammoOn(),w=eqG('w');
      const d=Math.round(hitBase(b,s,ps)*rr(.9,1.1)*(crit?2:precise?1:.5));
      if(a)p.inv[a]--;
      if(dodge)dodged++;else{p.hp-=ps.cost;SLOTS.forEach(sl=>{const g=eqG(sl);if(g&&--g.dur<=0){removeGear(g);toast(`${gFull(g.s,g.r)} susidėvėjo.`,3000);}});}
      if(pool(b,s)>0){const pay=Math.min(b.bounty[s],G('bountyHit'));b.bounty[s]-=pay;p.money+=pay;bnt+=pay;}
      b.dmg[s]+=d;b.tot[s]+=d;b.pl[s]+=d;p.dmg+=d;dmgC(sideC(b,s),d);p.st.hits++;total+=d;n++;anyCrit=anyCrit||crit;
      pushFeed(b,s,{n:p.name,w:w?w.r:-1,d,c:crit,h:!precise,me:1});
      if(sideC(b,s)===p.country)p.fame+=d/120;}
    track('hits',n);track('dmg',total);
    let c1=0,c2=0;p.crD=(p.crD||0)+total;p.cr2D=(p.cr2D||0)+total;while(p.crD>=G('crDmg')){p.crD-=G('crDmg');c1++;}while(p.cr2D>=G('cr2Dmg')){p.cr2D-=G('cr2Dmg');c2++;}
    if(c1||c2){p.inv.crate+=c1;p.inv.crate2+=c2;p.st.crates+=c1+c2;toast(`${c1?`📦 Trofėjų dėžė${c1>1?' ×'+c1:''}! `:''}${c2?`🎁 Elitinė dėžė${c2>1?' ×'+c2:''}!`:''}`,3000);return;}
    if(n>1||dodged||bnt||!tabIsBattle())toast(`${anyCrit?'💥 ':''}${fmt(total)} žalos${dodged?` · išsisukai ${dodged}×`:''}${bnt?` · premija ₡${fmt1(bnt)}`:''}`);},
  craft(id){const r=RECIPES.find(x=>x.id===id);if(!has(r.cost))return toast('Trūksta žaliavų: '+costStr(r.cost));pay(r.cost);
    if(r.gw!=null){const g=addGear('w',r.gw);toast(`Pagaminta: ${WN[g.r]}, ataka +${g.v}%`,3000);}
    else if(r.armor){const g=addGear(r.armor,rollR());invSel='g'+g.id;toast(`Pagaminta: ${gFull(g.s,g.r)}, ${SLOT[g.s].st.toLowerCase()} +${g.v}%`,3500);}
    else{for(const k in r.out)S.p.inv[k]+=r.out[k];const k=Object.keys(r.out)[0];toast(`Pagaminta: ${r.out[k]}× ${ITEMS[k].n}`);}track('craft',1);},
  dismantle(id){const p=S.p,g=p.gear.find(x=>x.id===id);if(!g)return;const back=Math.max(1,Math.floor((g.s==='w'?WCOST[g.r].steel*.5:2+g.r*3)*g.dur/gMax(g.s,g.r)));
    removeGear(g);p.inv.steel+=back;toast(`Išardyta. +${back} ${ITEMS.steel.n}`);},
  equip(id){const g=S.p.gear.find(x=>x.id===id);if(!g)return;if(S.p.eq[g.s]===id)delete S.p.eq[g.s];else S.p.eq[g.s]=id;},
  // opens one crate and returns the gear it gave
  openCrate(k){const p=S.p;k=k==='crate2'?'crate2':'crate';if(p.inv[k]<1)return [];p.inv[k]--;track('crate',1);const el=k==='crate2',got=[];
    for(let i=0;i<G(el?'cr2N':'crN');i++)got.push(addGear(crSlot(),crRoll(el)));return got;},
  run(){if(S.p.money<50)return toast('Registracija kainuoja ₡50.');S.p.money-=50;S.election.candidate=true;toast('Užsiregistravai rinkimuose!');},
  attack(r){if(S.p.president)startBattle(S.p.country,r);},
  emigrate(ci){if(ci===S.p.country||!C(ci).alive)return;if(S.p.money<100)return toast('Emigracija kainuoja ₡100.');S.p.money-=100;migr(S.p.country,ci);S.p.country=ci;ensureParl();addNews(`${S.p.name} emigravo į šalį ${C(ci).short}.`,true);focusCountry(ci);},
  revolt(r){const p=S.p,g=M.regions[r];if(g.home!==p.country)return toast('Sukilti gali tik šio regiono šalies piliečiai.');
    if(S.owner[r]===p.country)return;if(!revOk(r))return toast('Prieš sąjungininkę sukilti negalima (keičiama nustatymuose).');
    if(revBusy(r))return toast('Čia jau vyksta mūšis. Kovok jame!');if(revCool(r))return toast(`Sukilimas ką tik numalšintas. Palauk ${revCool(r)} val.`);
    if(p.hp<G('revHp'))return toast('Per mažai gyvybių. Pavalgyk.');p.hp-=G('revHp');p.money+=G('revPay');p.fame+=G('revFame');
    revAdd(r,G('revMe'));const b=S.battles.find(x=>x.region===r&&x.rev);toast(b?`✊ Sukilimas prasidėjo! Kovok dėl ${g.name}.`:`✊ Sukilimas ${g.name}: ${Math.floor(S.rev[r]||0)}/${G('revMax')}`);},
  acceptCit(ci){if(!C(ci).alive)return;const p=S.p,old=p.country;migr(old,ci);p.country=ci;ensureParl();addNews(`${p.name} paliko ${C(old).short} ir tapo šalies ${C(ci).short} piliečiu.`,true);focusCountry(ci);},
  worldPeace(){S.wars=[];S.battles.forEach(refund);S.battles=[];addNews('🕊 Visame pasaulyje paskelbtos paliaubos.',true);},
  botsReset(){S.bots=JSON.parse(JSON.stringify(BOT_DEF));toast('Botų nustatymai atstatyti.');}
};

// ---------- territory raster ----------
const terr=document.createElement('canvas');terr.width=WW;terr.height=WH;
const pack=(r,g,b)=>(255<<24)|(clamp(b|0,0,255)<<16)|(clamp(g|0,0,255)<<8)|clamp(r|0,0,255);
const PAL=COLORS.map(c=>[pack(c[0]*.9,c[1]*.9,c[2]*.9),pack(c[0]*1.25,c[1]*1.25,c[2]*1.25),pack(c[0]*.62,c[1]*.62,c[2]*.62)]);
const BORDER=pack(10,16,20),COAST=pack(24,52,66);
function renderTerritory(){
  rebuildOwn();
  const ctx=terr.getContext('2d'),img=ctx.createImageData(WW,WH),d=new Uint32Array(img.data.buffer),cell=M.cell,own=S.owner;
  for(let y=0;y<GH;y++)for(let x=0;x<GW;x++){
    const i=x+y*GW,r=cell[i];let c;
    if(r<0){if(!M.coast[i])continue;c=COAST;}
    else{const o=own[r];let e=0,q;
      q=cell[(x+1)%GW+y*GW];if(q<0)e=1;else if(q!==r)e=own[q]!==o?3:2;
      if(e<3&&y<GH-1){q=cell[i+GW];if(q<0)e=Math.max(e,1);else if(q!==r)e=Math.max(e,own[q]!==o?3:2);}
      if(e<1&&(cell[(x+GW-1)%GW+y*GW]<0||(y>0&&cell[i-GW]<0)))e=1;
      c=e===3?BORDER:e===2?PAL[o][2]:e===1?PAL[o][1]:PAL[o][0];}
    const k=(y*CS)*WW+x*CS;d[k]=c;d[k+1]=c;d[k+WW]=c;d[k+WW+1]=c;
  }
  ctx.putImageData(img,0,0);
  S.countries.forEach((c,ci)=>{const rs=OWN[ci];if(!rs.length){c._lx=null;return;}
    const big=rs.reduce((m,r)=>M.regions[r].cells>M.regions[m].cells?r:m,rs[0]);
    const home=rs.includes(M.caps[ci])&&rs.length<=3?M.caps[ci]:big;c._lx=M.regions[home].lx;c._ly=M.regions[home].ly;});
}

// ---------- map view ----------
const cv=$('#map'),cx=cv.getContext('2d');
const V={x:0,y:0,s:1};let sel=-1,dpr=1;
function resize(){dpr=Math.min(2,window.devicePixelRatio||1);const r=cv.getBoundingClientRect();cv.width=r.width*dpr;cv.height=r.height*dpr;}
const minZoom=()=>{const r=cv.getBoundingClientRect();return Math.min(r.width/WW,r.height/WH)*.9;};
function focusCountry(ci){const c=C(ci),r=cv.getBoundingClientRect();if(c._lx==null)return;
  const size=Math.sqrt(OWNC[ci])*CS;V.s=clamp(Math.min(r.width,r.height)*.3/size,minZoom(),5);V.x=r.width/2-c._lx*V.s;V.y=r.height/2-c._ly*V.s;}
function draw(t){
  const r=cv.getBoundingClientRect(),W=r.width,H=r.height;cx.setTransform(dpr,0,0,dpr,0,0);
  const g=cx.createRadialGradient(W/2,H/2,50,W/2,H/2,Math.max(W,H));
  g.addColorStop(0,'#163447');g.addColorStop(1,'#08121a');cx.fillStyle=g;cx.fillRect(0,0,W,H);
  const k=V.s;
  cx.strokeStyle='rgba(120,170,190,.07)';cx.lineWidth=1;const st=WW/24*k; // dienovidiniai kas 15°
  for(let x=((V.x%st)+st)%st;x<W;x+=st){cx.beginPath();cx.moveTo(x,0);cx.lineTo(x,H);cx.stroke();}
  cx.save();cx.translate(V.x,V.y);cx.scale(k,k);
  cx.imageSmoothingEnabled=k<4;cx.drawImage(terr,0,0);
  if(sel>=0){const g2=M.regions[sel];cx.fillStyle='rgba(255,220,130,.38)';
    for(let y=g2.y0;y<=g2.y1;y++)for(let x=g2.x0;x<=g2.x1;x++)if(M.cell[x+y*GW]===sel)cx.fillRect(x*CS,y*CS,CS,CS);}
  cx.restore();
  const on=(X,Y)=>X>-60&&Y>-30&&X<W+60&&Y<H+30;
  // sea routes to remote islands
  cx.setLineDash([4,5]);cx.strokeStyle='rgba(200,225,235,.3)';cx.lineWidth=1.2;
  M.links.forEach(([a,b])=>{const A2=M.regions[a],B2=M.regions[b];if(Math.abs(A2.lx-B2.lx)>WW/2)return;cx.beginPath();cx.moveTo(V.x+A2.lx*k,V.y+A2.ly*k);cx.lineTo(V.x+B2.lx*k,V.y+B2.ly*k);cx.stroke();});
  cx.setLineDash([]);
  cx.textAlign='center';
  if(k>2.4){cx.font=`500 ${clamp(4.2*k,10,14)}px Barlow,sans-serif`;cx.fillStyle='rgba(255,255,255,.6)';
    M.regions.forEach((g2,ri)=>{const X=V.x+g2.lx*k,Y=V.y+g2.ly*k;if(!on(X,Y)||g2.cells*k*k<700)return;const o=S.owner[ri];
      cx.fillText(o!==g2.home?g2.name:g2.short,X,Y+16);});}
  const me=S.p.country;
  S.countries.forEach((c,ci)=>{if(!c.alive||c._lx==null)return;const X=V.x+c._lx*k,Y=V.y+c._ly*k;if(!on(X,Y))return;
    const size=Math.sqrt(OWNC[ci])*CS*k;
    if(k>1.1||ci===me){const cp=M.regions[c.cap];star(V.x+cp.lx*k,V.y+cp.ly*k,ci===me?6:4,ci===me?'#f0c46a':'#e9eeea');}
    if(size<46&&ci!==me)return;
    cx.font=`700 ${clamp(size/7,10,22)}px "Chakra Petch",sans-serif`;cx.lineWidth=3.5;cx.strokeStyle='rgba(8,14,18,.85)';
    const tx=c.short.toUpperCase();cx.strokeText(tx,X,Y-9);cx.fillStyle=ci===me?'#f6d58a':'#f2f5f2';cx.fillText(tx,X,Y-9);});
  const pulse=(Math.sin(t/220)+1)/2,br=clamp(5+k*5,6,12);
  if(S.rev&&k>.9){const rm=G('revMax');cx.lineWidth=3;for(const ri in S.rev){const v=S.rev[ri];if(v<1)continue;const g2=M.regions[ri],X=V.x+g2.lx*k,Y=V.y+g2.ly*k;if(!on(X,Y))continue;
    const mine=g2.home===me;cx.beginPath();cx.arc(X,Y,7,0,7);cx.fillStyle='rgba(20,14,8,.75)';cx.fill();
    cx.beginPath();cx.arc(X,Y,7,-Math.PI/2,-Math.PI/2+Math.PI*2*Math.min(1,v/rm));cx.strokeStyle=mine?'#ff8a3d':'#c9a25a';cx.stroke();}}
  S.battles.forEach(b=>{const g2=M.regions[b.region];const X=V.x+g2.lx*k,Y=V.y+g2.ly*k;if(!on(X,Y))return;const mine=b.att===me||b.def===me;
    cx.beginPath();cx.arc(X,Y,br+2+pulse*4,0,7);cx.fillStyle=mine?'rgba(230,80,70,.4)':'rgba(240,196,106,.25)';cx.fill();
    cx.beginPath();cx.arc(X,Y,br,0,7);cx.fillStyle=mine?'#b3382f':'#5a4a24';cx.fill();cx.lineWidth=2;cx.strokeStyle=col(b.att);cx.stroke();
    if(br>=9){cx.font='12px sans-serif';cx.fillStyle='#fff';cx.textBaseline='middle';cx.fillText('⚔',X,Y+1);cx.textBaseline='alphabetic';}});
  requestAnimationFrame(draw);
}
function star(x,y,r,c){cx.beginPath();for(let i=0;i<10;i++){const a=-Math.PI/2+i*Math.PI/5,rad=i%2?r*.45:r;cx.lineTo(x+Math.cos(a)*rad,y+Math.sin(a)*rad);}cx.closePath();cx.fillStyle=c;cx.fill();cx.lineWidth=1.2;cx.strokeStyle='#1a1206';cx.stroke();}
const ptrs=new Map();let moved=0,pinch0=null;
cv.addEventListener('pointerdown',e=>{cv.setPointerCapture(e.pointerId);ptrs.set(e.pointerId,{x:e.clientX,y:e.clientY});moved=0;if(ptrs.size===2){const [a,b]=[...ptrs.values()];pinch0={d:Math.hypot(a.x-b.x,a.y-b.y),s:V.s};}});
cv.addEventListener('pointermove',e=>{const p=ptrs.get(e.pointerId);if(!p)return;const dx=e.clientX-p.x,dy=e.clientY-p.y;
  if(ptrs.size===1){V.x+=dx;V.y+=dy;moved+=Math.abs(dx)+Math.abs(dy);}
  p.x=e.clientX;p.y=e.clientY;
  if(ptrs.size===2&&pinch0){const [a,b]=[...ptrs.values()];const d=Math.hypot(a.x-b.x,a.y-b.y);const r=cv.getBoundingClientRect();zoomAt((a.x+b.x)/2-r.left,(a.y+b.y)/2-r.top,pinch0.s*d/pinch0.d/V.s);moved=99;}});
const up=e=>{const had=ptrs.has(e.pointerId);ptrs.delete(e.pointerId);if(ptrs.size<2)pinch0=null;
  if(had&&moved<8&&e.type==='pointerup'){const r=cv.getBoundingClientRect();tapAt(e.clientX-r.left,e.clientY-r.top);}};
cv.addEventListener('pointerup',up);cv.addEventListener('pointercancel',up);
cv.addEventListener('wheel',e=>{e.preventDefault();const r=cv.getBoundingClientRect();zoomAt(e.clientX-r.left,e.clientY-r.top,e.deltaY<0?1.15:1/1.15);},{passive:false});
function zoomAt(sx,sy,f){const ns=clamp(V.s*f,minZoom(),8);f=ns/V.s;V.x=sx-(sx-V.x)*f;V.y=sy-(sy-V.y)*f;V.s=ns;}
function tapAt(sx,sy){
  if(!S||S.__preview)return;
  const k=V.s;for(const b of S.battles){const g=M.regions[b.region];if(Math.hypot(V.x+g.lx*k-sx,V.y+g.ly*k-sy)<14){sel=b.region;showRegion(b.region);return;}}
  const x=Math.floor((sx-V.x)/k/CS),y=Math.floor((sy-V.y)/k/CS);
  if(x<0||y<0||x>=GW||y>=GH||M.cell[x+y*GW]<0){sel=-1;$('#rcard').hidden=true;return;}
  sel=M.cell[x+y*GW];showRegion(sel);}
$('#zin').onclick=()=>{const r=cv.getBoundingClientRect();zoomAt(r.width/2,r.height/2,1.5);};
$('#zout').onclick=()=>{const r=cv.getBoundingClientRect();zoomAt(r.width/2,r.height/2,1/1.5);};
$('#zhome').onclick=()=>focusCountry(S.p.country);
$('#ztop').onclick=()=>{if(S&&!S.__preview)openSheet('tops');};

// ---------- UI ----------
let coView=null,cView='ms',kView='c',bView='b',cfgG=0;
let tab=null,cinfoId=0,tView='c',tcKey='w',tpKey='d',botSel=-1,battleId=0,invView='main',invSel=null,bFilter='all',mFilter='all';
const T={k:'bread',side:'buy',market:true,price:1,qty:0,range:24};
function openTrade(k,side){T.k=k;T.side=side||'buy';T.market=true;T.qty=0;T.price=S.mk[k].m;openSheet('trade');}
const tMax=()=>maxQty(T.k,T.side,T.market,T.price);
// live part of the trade window: redrawn every hour without touching the form
function tradeLive(){const el=$('#tLive');if(!el)return;const k=T.k,o=S.mk[k],d=demandTag(k),c=S.p.cost[k],p=S.p;
  if(T.market){T.price=T.side==='buy'?o.a[0][0]:o.b[0][0];const pi=$('#tPrice');if(pi)pi.value=p2(T.price);}
  const bk=(lv,cls)=>lv.slice(0,5).map(l=>`<button class="lv ${cls}" data-act="tPick" data-i="${l[0]}"><span>₡${p2(l[0])}</span><span>${l[1]}</span></button>`).join('');
  el.innerHTML=`<div class="thead"><span class="ti">${mkIcon(k)}</span><div class="grow"><div class="tprice">₡${p2(o.m)} <small>${chgHtml(chg(k,T.range))}</small></div><div class="muted">${mkDesc(k)} · <i class="dm ${d[1]}">${d[0]}</i></div></div><div class="town">Turi<b>${fmt(owned(k))}</b>${c&&c.q>0?`<small class="muted">vid. ₡${p2(c.v/c.q)}</small>`:''}</div></div>
   ${chart(k,T.range)}
   <div class="chips">${[[24,'24 val.'],[72,'3 d.'],[168,'7 d.']].map(([n,t])=>`<button class="chip${T.range===n?' on':''}" data-act="tRange" data-i="${n}">${t}</button>`).join('')}<span class="grow"></span><span class="muted">Apyvarta ${fmt(o.vol)}</span></div>
   <div class="book"><div><small class="muted">Parduoda (kaina · kiekis)</small>${bk(o.a,'ask')}</div><div><small class="muted">Perka (kaina · kiekis)</small>${bk(o.b,'bid')}</div></div>
   <div class="tape"><small class="muted">Paskutiniai sandoriai</small>${(o.tape||[]).map(e=>`<div class="${e.me||e.you?'me':''}"><span>${e.you?'Tu':esc(e.n)} <b class="${e.s==='buy'?'up':'dn'}">${e.s==='buy'?'nupirko':'pardavė'}</b>${e.me?(e.s==='buy'?' iš tavęs':' tau'):''} ${e.q}×</span><span>₡${p2(e.p)}</span><span class="muted">${S.tick-e.t?'prieš '+(S.tick-e.t)+' val.':'dabar'}</span></div>`).join('')||'<div class="muted">Dar nebuvo.</div>'}</div>`;
  tradeSum();}
function tradeSum(){const el=$('#tSum');if(!el)return;const k=T.k,p=S.p,mx=tMax(),sl=$('#tSlide'),go=$('#tGo');
  sl.max=Math.max(1,mx);sl.value=Math.min(T.qty,mx);sl.disabled=mx<1;
  let total,avg,warn='';const q=T.qty;
  if(T.market){const qt=quote(k,T.side,Math.min(q,depth(k,T.side)));total=qt.total;avg=qt.avg||T.price;}else{total=q*T.price;avg=T.price;}
  const fee=T.side==='sell'?total*(G('fee')/100):0,after=T.side==='buy'?p.money-total:p.money+total-fee;
  if(q>mx)warn=T.side==='buy'?'Tiek nupirkti negali: trūksta pinigų arba pasiūlos.':'Tiek parduoti negali.';
  else if(!T.market&&q>0){const g=T.side==='buy'?T.price>=S.mk[k].a[0][0]:T.price<=S.mk[k].b[0][0];warn=g?'Kaina siekia rinką, užsakymas bus įvykdytas artimiausią valandą.':'Užsakymas lauks, kol rinka pasieks šią kainą.';}
  el.innerHTML=`<dl class="kv"><dt>Vidutinė kaina</dt><dd>₡${p2(avg)}</dd><dt>${T.side==='buy'?'Sumokėsi':'Gausi'}</dt><dd><b>₡${p2(total-fee)}</b></dd>${fee?`<dt>Mokestis ${G('fee')}%</dt><dd>₡${p2(fee)}</dd>`:''}<dt>Likutis po sandorio</dt><dd>₡${p2(after)}</dd><dt>Daugiausia galima</dt><dd>${fmt(mx)}</dd></dl>${warn?`<div class="muted">${warn}</div>`:''}`;
  go.textContent=`${T.market?'':'Pateikti užsakymą: '}${T.side==='buy'?'Pirkti':'Parduoti'} ${q}× už ₡${p2(total-fee)}`;go.className='btn big '+(T.side==='buy'?'buy':'sell');go.disabled=q<1||q>mx;}
function tSetQty(q){T.qty=clamp(Math.floor(q)||0,0,99999);const i=$('#tQty');if(i&&+i.value!==T.qty)i.value=T.qty;tradeSum();}
const tabIsBattle=()=>tab==='battle';
const sw=(i,big)=>`<span class="sw" style="background:${col(i)}${big?';width:22px;height:16px':''}"></span>`;
const flagBox=i=>`<span class="flagbox" style="border-color:${col(i)}">${flagOf(C(i).a)}</span>`;
const cname=i=>`${flagOf(C(i).a)} ${esc(C(i).short)}`;
const optList=(selv,skip)=>S.countries.filter(c=>c.alive&&c.id!==skip).map(c=>`<option value="${c.id}" ${c.id===selv?'selected':''}>${esc(c.short)}</option>`).join('');
const pct=(a,b)=>(a+b>0?a/(a+b)*100:50);
function showRegion(r){
  const g=M.regions[r],oi=S.owner[r],o=C(oi),b=S.battles.find(x=>x.region===r),p=S.p;
  const el=$('#rcard');el.hidden=false;closeSheet();
  let h=`<button class="x" data-act="closeR" aria-label="Uždaryti">✕</button><h3>${sw(oi)}${esc(g.name)}${o.cap===r?' ★':''}</h3>
   ${cbtn(oi,oi!==g.home?'<small>okupuota</small>':'')}<div class="muted">gyventojų ${fmt(g.pop)} · lyderis ${esc(o.leader)}${o.playerPres?' (tu)':''}${o.al?' · 🤝 '+esc(alOf(oi).name):''}</div>
   <div class="muted">🏰 Bunkeris ${bld(r,'b')} · 🎖 Kareivinės ${bld(r,'k')} · įmonių pelno mokestis ${o.tax}%</div>`;
  if(oi===p.country&&p.mp)h+=`<div class="row">${Object.entries(BLD).map(([k,d])=>`<button class="btn sm alt grow" data-act="propB" data-r="${r}" data-i="${k}" ${bld(r,k)>=G('bldMax')?'disabled':''}>${d.ic} Siūlyti ${bld(r,k)+1} lyg. (₡${bldCost(r,k)})</button>`).join('')}</div>`;
  if(oi!==g.home)h+=revBox(r);
  if(b)h+=battleCard(b,true);
  else if(oi!==p.country&&atWar(p.country,oi)){
    if(p.president&&[...g.adj].some(a=>S.owner[a]===p.country))h+=`<button class="btn red" data-act="attack" data-r="${r}">Pulti regioną</button>`;
    else h+=`<div class="muted">Tavo šalis kariauja su šia šalimi.</div>`;}
  el.innerHTML=h;el.dataset.r=r;
}
function revBox(r){const g=M.regions[r],p=S.p,v=S.rev[r]||0,mx=G('revMax'),cd=revCool(r),mine=g.home===p.country,b=S.battles.find(x=>x.region===r&&x.rev);
  return `<div class="rev"><div class="row"><span class="grow">✊ Sukilimas už ${cname(g.home)}${C(g.home).alive?'':' <small class="muted">(valstybė okupuota)</small>'}</span><b>${Math.floor(v)}/${mx}</b></div>
   <div class="ebar rv"><i style="width:${Math.min(100,v/mx*100)}%"></i></div>
   ${b?`<div class="muted">Vyksta sukilimo mūšis.</div>`:cd?`<div class="muted">Sukilimas numalšintas, naujas galimas po ${cd} val.</div>`:!revOk(r)?`<div class="muted">Šalys sąjungininkės: sukilimas negalimas.</div>`:
   mine?`<button class="btn red" data-act="revolt" data-r="${r}" ${p.hp<G('revHp')?'disabled':''}>✊ Kelti sukilimą <small>−${G('revHp')} ❤ · +${G('revMe')}</small></button>`:`<div class="muted">Sukilti gali tik ${esc(C(g.home).short)} piliečiai.</div>`}</div>`;}
// compact battle card for lists and the map
function battleCard(b,wide){
  const g=M.regions[b.region];
  return `<button class="bcard${wide?' wide':''}" data-act="openBattle" data-b="${b.id}">
   <span class="bname">${b.rev?'✊ ':''}${C(b.def).cap===b.region?'★ ':''}${esc(g.name)}</span>
   <span class="bscore">${flagBox(b.att)}<b>${b.rw[0]}</b><i>⚔</i><b>${b.rw[1]}</b>${flagBox(b.def)}</span>
   <span class="bpts"><span class="pa">▲ ${b.pts[0]}</span><span class="muted">R${b.round}</span><span class="pd">${b.pts[1]} ▲</span></span>
   <span class="split"><i style="width:${pct(b.dmg[0],b.dmg[1])}%;background:var(--att)"></i><i style="flex:1;background:var(--def)"></i></span>
   <span class="bdmg"><span>${pool(b,0)>0?'💰 ':''}🔥 ${fmt(b.dmg[0])}</span><span>${fmt(b.dmg[1])} 🔥${pool(b,1)>0?' 💰':''}</span></span></button>`;
}
function feedRows(b,s){
  const rows=b.feed[s].map(e=>`<div class="fr${e.c?' crit':''}${e.me?' me':''}${e.h?' half':''}"><span class="av" style="background:${col(sideC(b,s))}">${esc(e.n[0])}</span><span class="fn">${esc(e.n)}</span>${e.w>=0?`<span class="fw">${gico('w',Math.min(5,e.w))}</span>`:''}<span class="fd">🔥 ${fmt(e.d)}${e.c?'!':''}</span></div>`);
  while(rows.length<5)rows.push('<div class="fr empty"></div>');return rows.join('');
}
function battleView(b){
  const p=S.p,g=M.regions[b.region],pa=pct(b.dmg[0],b.dmg[1]),ps=pstats(),w=eqG('w');
  const hills=s=>`<div class="hill ${s?'d':'a'}"><i style="width:${Math.min(100,b.pts[s]/G('rp')*100)}%"></i></div>`;
  return `<div class="feeds"><div class="feed l">${feedRows(b,0)}</div><div class="fmid"><span class="muted">Raundas</span><b>${b.round}</b><span class="muted">iš ${G('rwin')*2-1}</span></div><div class="feed r">${feedRows(b,1)}</div></div>
   <div class="btitle">${b.rev?'✊ Sukilimas · ':''}${C(b.def).cap===b.region?'<span class="cap">★</span> ':''}${esc(g.name)} <button class="btn sm alt" data-act="goto" data-r="${b.region}" aria-label="Rodyti žemėlapyje">⌖</button></div>
   <div class="bbig">${flagBox(b.att)}<b>${b.rw[0]}</b><i>⚔</i><b>${b.rw[1]}</b>${flagBox(b.def)}</div>
   <div class="tickrow"><span class="muted" id="nextTick"></span>${b.gain?`<span class="gain ${b.gain.s?'d':'a'}">▲ +${b.gain.g} ${esc(C(sideC(b,b.gain.s)).short)}</span>`:'<span class="muted">Raundas prasideda</span>'}</div>
   <div class="ptsrow"><span class="pa">▲ ${b.pts[0]}</span><span class="muted">iki ${G('rp')} taškų</span><span class="pd">${b.pts[1]} ▲</span></div>
   <div class="hills">${hills(0)}${hills(1)}</div>
   <div class="dbar"><div class="a" style="width:${clamp(pa,12,88)}%"><small>${pa.toFixed(1)}%</small><b>🔥 ${fmt(b.dmg[0])}</b></div><div class="d"><small>${(100-pa).toFixed(1)}%</small><b>🔥 ${fmt(b.dmg[1])}</b></div></div>
   <div class="sides">
     <div class="sidecol"><div class="row"><span class="grow">${cname(b.att)}</span><span class="bon">🔥 ${pm(bmul(b,0))}</span></div>
       <button class="fight a" data-act="hit" data-b="${b.id}" data-s="0" ${p.hp<ps.cost?'disabled':''}>⚔ PULTI<small>−${fmt1(ps.cost*p.mult)} ❤ · ~${fmt(hitDmg(b,0)*p.mult)}</small></button>${pool(b,0)>0?`<div class="bnt">💰 Premija ₡${fmt1(G('bountyHit'))} už smūgį · fonde ₡${fmt(pool(b,0))}</div>`:''}${b.pl[0]?`<div class="muted">Tavo žala: ${fmt(b.pl[0])}</div>`:''}</div>
     <div class="sidecol"><div class="row"><span class="grow">${cname(b.def)}</span><span class="bon">🔥 ${pm(bmul(b,1))}</span></div>
       <button class="fight d" data-act="hit" data-b="${b.id}" data-s="1" ${p.hp<ps.cost?'disabled':''}>🛡 GINTI<small>−${fmt1(ps.cost*p.mult)} ❤ · ~${fmt(hitDmg(b,1)*p.mult)}</small></button>${pool(b,1)>0?`<div class="bnt">💰 Premija ₡${fmt1(G('bountyHit'))} už smūgį · fonde ₡${fmt(pool(b,1))}</div>`:''}${b.pl[1]?`<div class="muted">Tavo žala: ${fmt(b.pl[1])}</div>`:''}</div>
   </div>
   <div class="box"><div class="row"><span class="grow">❤ ${Math.floor(p.hp)}/${p.maxHp} · 🥧 ${p.inv.bread} · 🍣 ${p.inv.cfish}</span><button class="btn sm alt" data-act="eat">Valgyti</button></div>
     <div class="statstrip sm">${statLine(ps)}</div>
     <div class="row"><span class="grow loadout">${w?`<span class="fw">${gico('w',w.r)}</span> <span style="color:${RAR[w.r].c}">${WN[w.r]}</span> +${w.v}% <span class="muted">(${w.dur})</span>`:'<span class="muted">Be ginklo</span>'}</span><button class="btn sm alt" data-act="tab" data-i="inv">Ekipuotė</button></div>
     <div class="row"><span class="muted">Šoviniai</span><span class="chips grow">${[['','Be']].concat(Object.keys(AMMO).map(k=>[k,`+${AMMO[k]*100}% (${p.inv[k]})`])).map(([k,n])=>`<button class="chip${(p.ammoSel||'')===k?' on':''}" ${k?`style="color:${ITEMS[k].col}"`:''} data-act="ammoSel" data-i="${k}" ${k&&!p.inv[k]?'disabled':''}>${n}</button>`).join('')}</span></div>
     <div class="crbar"><span>📦</span><div class="ebar rv cr"><i style="width:${Math.min(100,(p.crD||0)/G('crDmg')*100)}%"></i></div><span>🎁</span><div class="ebar rv cr2"><i style="width:${Math.min(100,(p.cr2D||0)/G('cr2Dmg')*100)}%"></i></div></div>
     <div class="muted">Iki dėžių: 📦 ${fmt(Math.max(0,G('crDmg')-(p.crD||0)))} · 🎁 ${fmt(Math.max(0,G('cr2Dmg')-(p.cr2D||0)))} žalos</div>
     <div class="row"><span class="grow muted">Smūgių vienu paspaudimu</span>${[1,3,5].map(n=>`<button class="chip${p.mult===n?' on':''}" data-act="mult" data-i="${n}">×${n}</button>`).join('')}</div></div>
   <div class="muted">🏰 Bunkeriai ${bldSide(b,0,'b')} : ${bldSide(b,1,'b')} · 🎖 Kareivinės ${bldSide(b,0,'k')} : ${bldSide(b,1,'k')} (puolėjai : gynėjai)</div>
   <div class="muted">Pusė, kuri raunde padarė daugiau žalos, kas valandą gauna 1–3 taškus. ${G('rp')} taškų laimi raundą, ${G('rwin')} raundai laimi mūšį. Bendra žala: ${fmt(b.tot[0])} prieš ${fmt(b.tot[1])}.</div>`;
}
function openSheet(t){tab=t;$('#rcard').hidden=true;$('#sheet').hidden=false;$('#sheet').classList.toggle('tall',t!=='more');
  document.querySelectorAll('#tabs button').forEach(b=>b.classList.toggle('on',b.dataset.t===(t==='battle'?'battles':t==='trade'?'market':t)));$('#sheetBody').scrollTop=0;renderSheet();}
function closeSheet(){tab=null;$('#sheet').hidden=true;document.querySelectorAll('#tabs button').forEach(b=>b.classList.remove('on'));}
$('#sheetClose').onclick=()=>tab==='battle'?openSheet('battles'):tab==='trade'?openSheet('market'):closeSheet();
document.querySelectorAll('#tabs button').forEach(b=>b.onclick=()=>{if(!S||S.__preview)return;invView='main';tab===b.dataset.t?closeSheet():openSheet(b.dataset.t);});
const slider=(k,label,min,max,stepv)=>`<div class="sl"><div class="row"><label for="bot_${k}">${label}</label><output id="out_${k}">${fmtBot(k,S.bots[k])}</output></div><input type="range" id="bot_${k}" data-bot="${k}" min="${min}" max="${max}" step="${stepv}" value="${S.bots[k]}"></div>`;
const fmtBot=(k,v)=>k==='xp'?'×'+v:/^(maxWars|pts)/.test(k)?String(v):Math.round(v*100)+'%';
const tile=(k,sel)=>{const it=ITEMS[k],n=S.p.inv[k];return `<button class="tile c-${it.c}${sel?' on':''}${n?'':' zero'}" data-act="selItem" data-i="${k}"><span class="ti">${ico(k)}</span>${it.d?`<span class="te">${it.d}</span>`:''}<span class="tn">${fmt(n)}</span></button>`;};
const gTile=(g,cls)=>{const on=S.p.eq[g.s]===g.id;return `<button class="tile gt${invSel==='g'+g.id?' on':''} ${cls||''}" style="--rc:${RAR[g.r].c}" data-act="selGear" data-i="${g.id}">${on&&!cls?'<span class="eqb">Uždėta</span>':''}<span class="fw big">${gico(g.s,g.r)}</span><span class="te">${SLOT[g.s].ic} +${g.v}%</span><span class="dur"><i style="width:${g.dur/gMax(g.s,g.r)*100}%;background:${RAR[g.r].c}"></i></span><span class="tn">${g.dur}</span></button>`;};
const statLine=ps=>`<span>⚔ +${ps.atk}%</span><span>🛡 ${ps.def}%</span><span>🎯 ${ps.prec}%</span><span>💨 ${ps.dodge}%</span><span>💥 ${ps.crit}%</span>`;
function renderInv(){
  const p=S.p;let h='';
  if(invView==='craft'){
    h+=`<button class="btn alt" data-act="invView" data-i="main">← Inventorius</button>`;
    RECIPES.forEach(r=>{const ok=has(r.cost);let nm,ic,ex='';
      if(r.gw!=null){const g=SLOT.w.rng[r.gw];nm=`<span style="color:${RAR[r.gw].c}">${WN[r.gw]}</span>`;ic=`<span class="fw big">${gico('w',r.gw)}</span>`;ex=` <span class="muted">ataka +${g[0]}–${g[1]}%, ${WDUR[r.gw]} smūgių</span>`;}
      else if(r.armor){nm=SLOT[r.armor].n;ic=`<span class="fw big">${gico(r.armor,0)}</span>`;ex=` <span class="muted">${SLOT[r.armor].st.toLowerCase()}, retumas atsitiktinis</span>`;}
      else{nm=Object.entries(r.out).map(([k,v])=>`${v}× ${ITEMS[k].n}`).join('');ic=`<span class="ti sm">${ico(Object.keys(r.out)[0])}</span>`;}
      h+=`<div class="box"><div class="row">${ic}<div class="grow"><b>${nm}</b>${ex}
        <div class="muted">${Object.entries(r.cost).map(([k,v])=>`<span class="${p.inv[k]>=v?'':'lack'}">${ITEMS[k].i||''} ${v} ${ITEMS[k].n} (${p.inv[k]})</span>`).join(' · ')}</div></div>
        <button class="btn sm" data-act="craft" data-i="${r.id}" ${ok?'':'disabled'}>Gaminti</button></div></div>`;});
    h+=`<div class="muted">Aprangos retumo tikimybės: ${RAR.map((r,i)=>`<span style="color:${r.c}">${r.n} ${+((AODDS[i]-(i?AODDS[i-1]:0))*100).toFixed(1)}%</span>`).join(' · ')}</div>`;
    return h;
  }
  if(invView==='dismantle'){
    h+=`<button class="btn alt" data-act="invView" data-i="main">← Inventorius</button><div class="muted">Išardęs ekipuotę atgauni dalį plieno. Kuo labiau susidėvėjusi, tuo mažiau.</div>`;
    if(!p.gear.length)h+=`<div class="muted">Neturi ekipuotės.</div>`;
    p.gear.slice().sort((a,b)=>a.r-b.r||a.v-b.v).forEach(g=>h+=`<div class="box"><div class="row"><span class="fw big">${gico(g.s,g.r)}</span><div class="grow"><b style="color:${RAR[g.r].c}">${gFull(g.s,g.r)}</b><div class="muted">${SLOT[g.s].st} +${g.v}% · ${g.dur}/${gMax(g.s,g.r)}${p.eq[g.s]===g.id?' · uždėta':''}</div></div><button class="btn sm red" data-act="dismantle" data-i="${g.id}">Ardyti</button></div></div>`);
    return h;
  }
  h+=`<div class="row"><button class="btn grow" data-act="invView" data-i="craft">🛠 GAMINTI</button><button class="btn alt grow" data-act="invView" data-i="dismantle">🔧 ARDYTI</button></div>`;
  h+=`<div class="statstrip">${statLine(pstats())}</div>
   <div class="slots">${SLOTS.map(s=>{const g=eqG(s);return g?gTile(g,'slot'):`<div class="tile gt slot empty"><span class="fw big">${SVG[s==='w'?'w1':s]}</span><span class="te">${SLOT[s].n}</span></div>`;}).join('')}</div>`;
  h+=`<h4 class="sec">DAIKTAI</h4><div class="tiles">${['crate','crate2','cfish','bread','a1','a2','a3'].map(k=>tile(k,invSel===k)).join('')}${Object.keys(ITEMS).filter(k=>ITEMS[k].c==='raw').map(k=>tile(k,invSel===k)).join('')}</div>`;
  if(invSel&&ITEMS[invSel]){const it=ITEMS[invSel],k=invSel;let act='';
    if(it.heal)act=`<button class="btn sm" data-act="eatItem" data-i="${k}" ${p.inv[k]?'':'disabled'}>Valgyti</button>`;
    if(k==='crate'||k==='crate2')act=`<button class="btn sm" data-act="crateUI" data-i="${k}">Atidaryti</button>`;
    if(AMMO[k])act=p.ammoSel===k?`<button class="btn sm alt" data-act="ammoSel" data-i="">Nebenaudoti</button>`:`<button class="btn sm" data-act="ammoSel" data-i="${k}">Naudoti mūšyje</button>`;
    h+=`<div class="box"><div class="row"><div class="grow"><b>${it.n}</b> <span class="muted">× ${fmt(p.inv[k])}</span><div class="muted">${it.d||'Žaliava gamybai'}${k==='crate'||k==='crate2'?`<div>Iškrenta ${G(k==='crate2'?'cr2N':'crN')} daikt. (ginklas ${G('crWpn')}%, apranga ${100-G('crWpn')}%): ${crOdds(k==='crate2')}</div><div>Gaunama kovojant: kas ${fmt(G(k==='crate2'?'cr2Dmg':'crDmg'))} žalos${k==='crate2'?', arba perkama rinkoje':''}.</div>`:''}${S.mk[k]?` · rinkoje ₡${p2(S.mk[k].m)}`:''}${p.ammoSel===k?' · naudojami':''}</div></div>${act}
      ${S.mk[k]?`<button class="btn sm alt" data-act="trade" data-i="${k}" data-s="sell">Į rinką</button>`:''}</div></div>`;}
  h+=`<h4 class="sec">EKIPUOTĖ (${p.gear.length})</h4>`;
  if(!p.gear.length)h+=`<div class="muted">Neturi ekipuotės. Pasigamink, nusipirk rinkoje arba laimėk trofėjų dėžę.</div>`;
  h+=`<div class="tiles">${p.gear.slice().sort((a,b)=>SLOTS.indexOf(a.s)-SLOTS.indexOf(b.s)||b.r-a.r||b.v-a.v).map(g=>gTile(g)).join('')}</div>`;
  const g=invSel&&invSel[0]==='g'?p.gear.find(x=>'g'+x.id===invSel):null;
  if(g){const rg=SLOT[g.s].rng[g.r],on=p.eq[g.s]===g.id,cur=eqG(g.s),diff=cur&&!on?g.v-cur.v:0;
    h+=`<div class="box" style="border-color:${RAR[g.r].c}"><div class="row"><span class="fw big">${gico(g.s,g.r)}</span><div class="grow"><b style="color:${RAR[g.r].c}">${gFull(g.s,g.r)}</b> <span class="muted">${g.s==='w'?RAR[g.r].n:''}</span>
      <div>${SLOT[g.s].st} <b>+${g.v}%</b> <span class="muted">(šio retumo rėžiai ${rg[0]}–${rg[1]}%)</span>${diff?` <span class="${diff>0?'up':'dn'}">${diff>0?'▲ +':'▼ '}${diff}</span>`:''}</div>
      <div class="muted">Patvarumas ${g.dur}/${gMax(g.s,g.r)} smūgių</div></div></div>
      <div class="row"><button class="btn sm grow" data-act="equip" data-i="${g.id}">${on?'Nuimti':'Uždėti'}</button><button class="btn sm alt" data-act="trade" data-i="g:${g.s}:${g.r}" data-s="sell">Į rinką</button><button class="btn sm red" data-act="dismantle" data-i="${g.id}">Ardyti</button></div></div>`;}
  h+=`<div class="muted">${RAR.map(r=>`<span style="color:${r.c}">■ ${r.n}</span>`).join(' ')}</div>
   <div class="muted">⚔ ataka didina žalą. 🛡 gynyba (šalmas ir liemenė) mažina sveikatos kainą už smūgį. 🎯 taiklumas yra tikimybė smogti pilna jėga, kitaip žala perpus mažesnė. 💨 išsisukęs neprarandi sveikatos ir nedėvi ekipuotės. 💥 kritinis smūgis padaro dvigubą žalą.</div>`;
  return h;
}
function renderSheet(){
  if(!tab)return;const p=S.p,me=myC(),body=$('#sheetBody');const sc=body.scrollTop;let h='',title='';
  if(tab==='battle'){const b=S.battles.find(x=>x.id===battleId);
    if(!b){title='Mūšis baigėsi';h=`<div class="muted">Šis mūšis jau pasibaigė. Rezultatą rasi žiniose.</div><button class="btn" data-act="tab" data-i="battles">Visi mūšiai</button>`;}
    else{title='Mūšis';h=battleView(b);}
  }
  if(tab==='inv'){title=invView==='craft'?'Gamyba':invView==='dismantle'?'Ardymas':'Inventorius';h=renderInv();}
  if(tab==='battles'){title='Mūšiai';
    const mineF=b=>b.att===p.country||b.def===p.country,enemies=S.wars.filter(w=>w.a===p.country||w.b===p.country).map(w=>w.a===p.country?w.b:w.a);
    const nb=new Set(neighbors(p.country));
    const F={all:()=>true,mine:mineF,enemy:b=>!mineF(b)&&(enemies.includes(b.att)||enemies.includes(b.def)),near:b=>!mineF(b)&&(nb.has(b.att)||nb.has(b.def))};
    const list=S.battles.filter(F[bFilter]).sort((a,b)=>mineF(b)-mineF(a)||(b.tot[0]+b.tot[1])-(a.tot[0]+a.tot[1]));
    h+=`<div class="statstrip"><span>👊 ${fmt(p.st.hits)}</span><span>🔥 ${fmt(p.dmg)}</span><span>🏆 ${p.st.won}</span><span>📦 ${p.st.crates}</span><span>₡ ${fmt(p.st.money)}</span></div>
     <div class="chips">${[['all','Visi'],['mine','Mano šalies'],['enemy','Priešų'],['near','Kaimynų']].map(([k,n])=>`<button class="chip${bFilter===k?' on':''}" data-act="bFilter" data-i="${k}">${n} ${S.battles.filter(F[k]).length}</button>`).join('')}</div>`;
    if(!list.length)h+=`<div class="muted">Čia mūšių šiuo metu nėra.${S.wars.length?'':' Pasaulyje taika.'}</div>`;
    h+=`<div class="bgrid">${list.slice(0,30).map(b=>battleCard(b)).join('')}</div>`;
  }
  if(tab==='work'){title='Įmonės';
    const n=p.companies.length,bc=buildCost(n),wages=p.companies.reduce((s,c)=>s+c.workers,0)*G('wage');
    h+=`<div class="statstrip"><span>⚡ ${Math.floor(p.en)}/${p.maxEn}</span><span>🏭 ${n}/${maxCo()}</span><span>${ITEMS.iron.i} ${fmt(p.inv.iron)}</span><span>🔨 +${fmt1(workGain())}</span>${wages?`<span class="muted">Algos ₡${wages}/d.</span>`:''}</div>`;
    if(p.wageOk===false)h+=`<div class="box" style="border-color:var(--hp)">Vakar neužteko pinigų algoms, todėl darbuotojai šiandien nedirba.</div>`;
    if(n)h+=`<button class="btn alt" data-act="coProdAll">Gaminti visose įmonėse (${G('prodEn')}⚡ už kiekvieną)</button>`;
    else h+=`<div class="muted">Dar neturi įmonių. Pirmoji statoma nemokamai. Patarimas: pradėk nuo akmens kasyklos, nes geležies reikia kitoms įmonėms ir patobulinimams.</div>`;
    p.companies.forEach((c,i)=>{const d=COMPANY[c.type],cap=coCap(c),pc=prodCount(c),au=coAuto(c),full=c.eff>=cap;
      h+=`<div class="box co"><div class="row"><span class="ti sm">${ico(d.out)}</span><div class="grow"><b>${d.name}</b><div class="muted">${d.inp?costStr(d.inp)+' → ':''}${coQ(c)}× ${ITEMS[d.out].n} už ${d.eff} effort · turi ${fmt(p.inv[d.out])}</div></div></div>
       <div class="ebar${full?' full':''}"><i style="width:${c.eff/cap*100}%"></i><span>🔨 ${fmt1(c.eff)} / ${cap}${au?` · +${fmt1(au)}/val.`:''}${full?' · pilna':''}</span></div>
       <div class="row"><button class="btn sm grow" data-act="coWork" data-i="${i}" ${p.en<G('workEn')||full?'disabled':''}>Dirbti −${G('workEn')}⚡ (+${fmt1(workGain())})</button><button class="btn sm grow buy" data-act="coProd" data-i="${i}" ${pc<1||p.en<G('prodEn')?'disabled':''}>Gaminti ${pc*coQ(c)}× −${G('prodEn')}⚡</button></div>
       <div class="upg"><button data-act="coUp" data-i="${i}" data-s="ae" ${p.inv.iron<aeCost(c.ae)?'disabled':''}><b>Variklis ${c.ae}</b><small>+1 effort/val. · ${ITEMS.iron.i} ${aeCost(c.ae)}</small></button>
        <button data-act="coUp" data-i="${i}" data-s="st" ${p.inv.iron<stCost(c.st)?'disabled':''}><b>Sandėlis ${c.st}</b><small>+${G('capBase')} talpos · ${ITEMS.iron.i} ${stCost(c.st)}</small></button>
        <button data-act="coHire" data-i="${i}" ${c.workers>=maxWk()||p.money<hireCost(c.workers)?'disabled':''}><b>👷 ${c.workers}/${maxWk()}</b><small>${c.workers>=maxWk()?'limitas':'samdyti ₡'+hireCost(c.workers)}</small></button></div>
       ${c.workers?`<div class="row"><span class="muted grow">Darbuotojai prideda +${fmt1(c.workers*G('wkEff'))} effort/val., alga ₡${c.workers*G('wage')}/d.</span><button class="btn sm alt" data-act="coFire" data-i="${i}">Atleisti 1</button></div>`:''}
       <div class="row"><span class="muted grow">📍 ${esc(M.regions[c.reg].name)} (${cname(coLoc(c))}) · pelno mokestis ${C(coLoc(c)).tax}%</span><button class="btn sm alt" data-act="coView" data-i="mv${i}">Perkelti</button></div>
       ${coView==='mv'+i?(()=>{const cs=S.countries.filter(x=>x.alive&&x.id!==coLoc(c)).sort((a,b)=>a.tax-b.tax||a.short.localeCompare(b.short,'lt')).map(x=>[x.id,`${x.tax}% · ${x.short}`]);if(!cs.some(o=>String(o[0])===String(PF.mv)))PF.mv=cs[0][0];
         return `<div class="row"><select data-pf="mv" class="grow" aria-label="Šalis">${cs.map(o=>`<option value="${o[0]}" ${String(o[0])===String(PF.mv)?'selected':''}>${esc(o[1])}</option>`).join('')}</select><button class="btn sm" data-act="coMove" data-i="${i}" ${p.inv.steel<G('moveCost')?'disabled':''}>Perkelti (${ITEMS.steel.i} ${G('moveCost')})</button></div><div class="muted">Įmonė persikelia į pasirinktos šalies sostinę ir pelno mokestį moka jos iždui. Jei regioną užima kita šalis, mokestis atitenka jai.</div>`;})():''}</div>`;});
    if(coView==='build'){h+=`<div class="box"><h4>Statyti įmonę</h4><div class="muted">${bc?`Kaina: ${ITEMS.iron.i} ${bc} geležies (turi ${fmt(p.inv.iron)}). Kiekviena kita įmonė kainuoja daugiau.`:'Pirmoji įmonė nemokama.'}</div>
      ${Object.entries(COMPANY).map(([k,d])=>`<div class="row"><span class="ti sm">${ico(d.out)}</span><div class="grow">${d.name}<div class="muted">${d.inp?costStr(d.inp)+' → ':''}${d.q?d.q+'× ':''}${ITEMS[d.out].n}${ITEMS[d.out].d?' ('+ITEMS[d.out].d+')':''}</div></div><button class="btn sm" data-act="coBuild" data-i="${k}" ${p.inv.iron<bc?'disabled':''}>Statyti</button></div>`).join('')}
      <button class="btn alt" data-act="coView" data-i="">Uždaryti</button></div>`;}
    else h+=n>=maxCo()?`<div class="muted">Pasiektas įmonių limitas (${maxCo()}). Jį didina įgūdis „Įmonių limitas“.</div><button class="btn sm alt" data-act="charView" data-i="sk">Atidaryti įgūdžius</button>`
      :`<button class="btn" data-act="coView" data-i="build">+ Statyti įmonę (${bc?ITEMS.iron.i+' '+bc:'nemokamai'})</button>`;
    h+=`<div class="muted">„Dirbti“ sukaupia darbo effort, „Gaminti“ paverčia jį prekėmis. Variklis ir darbuotojai effort kaupia patys kas valandą, kol sandėlis nepilnas. Gaminant nuo numatomo pelno mokamas šalies, kurioje stovi įmonė, mokestis.</div>`;
  }
  if(tab==='char'){title=p.name;const free=ptsFree();
    h+=`<div class="seg three">${[['ms','Misijos'],['sk',`Įgūdžiai${free>0?' ('+free+')':''}`],['pf','Profilis']].map(([k,n])=>`<button class="${cView===k?'on buy':''}" data-act="charView" data-i="${k}">${n}</button>`).join('')}</div>
     <div class="xprow"><b>Lygis ${p.lvl}${p.prestige?` · ★${p.prestige}`:''}</b><div class="ebar xp"><i style="width:${p.lvl>=G('maxLvl')?100:p.xp/xpNeed(p.lvl)*100}%"></i><span>${p.lvl>=G('maxLvl')?'Maksimalus lygis':`${Math.floor(p.xp)} / ${xpNeed(p.lvl)} XP`}</span></div></div>`;
    if(cView==='ms'){for(const t in MTIER){const T=MTIER[t],g=S.ms[t],dn=g.list.filter(m=>m.done).length,per=T.days*24,left=per-S.tick%per;
      h+=`<div class="box"><div class="row"><h4 class="grow">${T.n} · ${dn}/10</h4><span class="muted">liko ${left>=48?Math.ceil(left/24)+' d.':left+' val.'}</span></div>
       <div class="ebar bonus${g.bonus?' full':''}"><i style="width:${Math.min(1,dn/G('msNeed'))*100}%"></i><span>${g.bonus?'✔ Premija gauta':`Premija už ${G('msNeed')}: ${Math.round(mt(t,'Bx')*S.bots.xp)} XP · ₡${mt(t,'Bc')} · 📦×${mt(t,'Cr')}`}</span></div>
       <div class="mslist">${g.list.slice().sort((a,b)=>a.done-b.done).map(m=>`<div class="ms${m.done?' done':''}"><span class="grow">${m.done?'✔ ':''}${MT[m.k][0](m.goal)}</span><span class="mp">${fmt(Math.floor(m.prog))}/${fmt(m.goal)}</span><i style="width:${m.prog/m.goal*100}%"></i></div>`).join('')}</div>
       <div class="muted">Kiekviena misija: ${Math.round(mt(t,'Xp')*S.bots.xp)} XP ir ₡${mt(t,'Cash')}. Atlygis įskaitomas iškart.</div></div>`;}}
    if(cView==='sk'){h+=`<div class="statstrip"><span>Laisvi taškai: <b class="${free>0?'up':''}">${free}</b></span><span class="muted">iš ${ptsTotal()} · ${S.bots.ptsMe} už lygį</span></div>`;
      for(const k in SK){const d=SK[k],l=sk(k);h+=`<div class="row skrow"><span class="ti sm">${d.ic}</span><div class="grow"><b>${d.n}</b> <span class="muted">${l}/${d.max}</span><div class="muted">Dabar +${fmt1(l*skPer(k))}${d.u} · kitas lygis +${skPer(k)}</div></div><button class="btn sm" data-act="skill" data-i="${k}" ${free<skCost(k)||l>=d.max?'disabled':''}>+1 (${skCost(k)} t.)</button></div>`;}
      h+=`<div class="row"><button class="btn sm alt" data-act="respec" ${ptsSpent()?'':'disabled'}>Perskirstyti taškus (₡${G('respec')})</button></div>
       <div class="box"><h4>Prestižas</h4><div class="muted">Pasiekęs ${G('maxLvl')} lygį gali pradėti iš naujo nuo 1 lygio. Įgūdžiai dingsta, bet visam laikui gauni papildomų taškų: po pirmo prestižo ${S.bots.ptsPrest}, po antro ${S.bots.ptsPrest*2}, po trečio ${S.bots.ptsPrest*3} ir taip toliau. Daiktai, pinigai ir įmonės lieka.</div>
       <button class="btn" data-act="askPrestige" ${p.lvl>=G('maxLvl')?'':'disabled'}>${p.lvl>=G('maxLvl')?`Daryti prestižą ${p.prestige+1}`:`Reikia ${G('maxLvl')} lygio`}</button></div>`;}
    if(cView==='pf'){const ps=pstats();h+=`<div class="statstrip">${statLine(ps)}</div><div class="box"><dl class="kv"><dt>Šalis</dt><dd>${cname(p.country)}</dd><dt>Prestižas</dt><dd>${p.prestige}</dd><dt>Gyvybės</dt><dd>${p.maxHp}</dd><dt>Darbo energija</dt><dd>${p.maxEn}</dd><dt>Sveikatos kaina už smūgį</dt><dd>${fmt1(ps.cost)}</dd><dt>Vidutinė smūgio žala</dt><dd>${fmt(hitDmg())}</dd><dt>Bendra žala</dt><dd>${fmt(p.dmg)}</dd><dt>Smūgiai</dt><dd>${fmt(p.st.hits)}</dd><dt>Laimėti mūšiai</dt><dd>${p.st.won}</dd><dt>Šlovė</dt><dd>${Math.round(p.fame)}</dd><dt>Įmonės</dt><dd>${p.companies.length}/${maxCo()}</dd></dl></div>`;}
  }
  if(tab==='market'){title='Rinka';
    const F={all:()=>true,food:k=>mkCat(k)==='food',raw:k=>mkCat(k)==='raw',ammo:k=>mkCat(k)==='ammo',wpn:k=>mkCat(k)==='wpn'||mkCat(k)==='gear',armor:k=>mkCat(k)==='armor',mine:k=>owned(k)>0};
    h+=`<div class="statstrip"><span>₡ ${fmt(p.money)}</span><span class="muted">Mokestis parduodant ${G('fee')}%</span></div>`;
    if(S.orders.length)h+=`<div class="box"><h4>Mano užsakymai (${S.orders.length})</h4>${S.orders.map(o=>`<div class="row"><span class="ti sm">${mkIcon(o.k)}</span><button class="grow linkrow" data-act="trade" data-i="${o.k}"><b class="${o.side==='buy'?'up':'dn'}">${o.side==='buy'?'Pirkti':'Parduoti'}</b> ${o.qty}× ${mkName(o.k)} po ₡${p2(o.price)}<div class="muted">įvykdyta ${o.done}/${o.qty} · rinkoje ₡${p2(S.mk[o.k].m)}</div></button><button class="btn sm alt" data-act="cancelOrder" data-i="${o.id}">Atšaukti</button></div>`).join('')}</div>`;
    h+=`<div class="chips">${[['all','Visos'],['food','Maistas'],['raw','Žaliavos'],['ammo','Šoviniai'],['wpn','Ginklai'],['armor','Apranga'],['mine','Turiu']].map(([k,n])=>`<button class="chip${mFilter===k?' on':''}" data-act="mFilter" data-i="${k}">${n}</button>`).join('')}</div>`;
    h+=`<div class="mlist">${MKEYS.filter(F[mFilter]).map(k=>{const d=demandTag(k);return `<button class="mrow" data-act="trade" data-i="${k}"><span class="ti sm">${mkIcon(k)}</span><span class="mn"><b>${mkName(k)}</b><small class="muted">turi ${fmt(owned(k))} · <i class="dm ${d[1]}">${d[0]}</i></small></span>${spark(k,24,56,24)}<span class="mp"><b>₡${p2(S.mk[k].m)}</b><small>${chgHtml(chg(k,24))}</small></span></button>`;}).join('')||'<span class="muted">Nieko nėra.</span>'}</div>
     <div class="muted">Kainos juda kas valandą: jas veikia karai, paklausos šuoliai ir tavo paties sandoriai. Paspausk prekę, kad pirktum arba parduotum.</div>`;
  }
  if(tab==='trade'){const k=T.k,o=S.mk[k];title=mkName(k);
    h=`<div id="tLive"></div>
     <div class="seg"><button class="${T.side==='buy'?'on buy':''}" data-act="tSide" data-i="buy">PIRKTI</button><button class="${T.side==='sell'?'on sell':''}" data-act="tSide" data-i="sell">PARDUOTI</button></div>
     <label class="chk"><input type="checkbox" id="tMarket" ${T.market?'checked':''} ${isW(k)?'disabled':''}> Rinkos kaina, sandoris įvyksta iškart</label>
     <div class="frow"><label for="tPrice">Kaina</label><div class="stepper"><button data-act="tStep" data-i="-1" ${T.market?'disabled':''} aria-label="Mažinti kainą">−</button><input type="number" inputmode="decimal" id="tPrice" step="0.01" min="0.01" value="${p2(T.price)}" ${T.market?'disabled':''}><button data-act="tStep" data-i="1" ${T.market?'disabled':''} aria-label="Didinti kainą">+</button></div></div>
     <div class="frow"><label for="tQty">Kiekis</label><div class="stepper"><button data-act="tQ" data-i="-1" aria-label="Mažinti kiekį">−</button><input type="number" inputmode="numeric" id="tQty" step="1" min="0" value="${T.qty}"><button data-act="tQ" data-i="1" aria-label="Didinti kiekį">+</button></div></div>
     <input type="range" id="tSlide" min="0" max="1" step="1" value="0" aria-label="Kiekis">
     <div class="chips">${[[.1,'10%'],[.25,'25%'],[.5,'50%'],[1,'Max']].map(([f,n])=>`<button class="chip" data-act="tPct" data-i="${f}">${n}</button>`).join('')}<button class="chip" data-act="tPct" data-i="0">Išvalyti</button></div>
     <div class="box" id="tSum"></div>
     <button class="btn big" id="tGo" data-act="tGo"></button>
     <div class="muted">Limitinis užsakymas (kai varnelė nuimta) laukia, kol rinka pasieks tavo kainą. Pinigai arba prekės tuo metu rezervuojami ir grąžinami atšaukus.</div>`;
  }
  if(tab==='country'){title=me.short;ensureParl();const ci=p.country,al=alOf(ci),nS=G('seats');
    const wars=S.wars.filter(w=>w.a===ci||w.b===ci).map(w=>w.a===ci?w.b:w.a);
    const sel=(key,opts,cls)=>{if(!opts.length)return '';if(!opts.some(o=>String(o[0])===String(PF[key])))PF[key]=opts[0][0];return `<select data-pf="${key}" class="${cls||'grow'}" aria-label="Pasirinkimas">${opts.map(o=>`<option value="${o[0]}" ${String(o[0])===String(PF[key])?'selected':''}>${esc(o[1])}</option>`).join('')}</select>`;};
    const role=p.president?'Parlamento pirmininkas':p.mp?'Deputatas':'Pilietis';
    h+=`<div class="seg three">${[['c','Šalis'],['p',`Parlamentas${S.bills.length?' ('+S.bills.length+')':''}`],['a','Aljansas']].map(([k,n])=>`<button class="${kView===k?'on buy':''}" data-act="kView" data-i="${k}">${n}</button>`).join('')}</div>`;
    if(kView==='c'){const occR=S.owner.map((o,r)=>o!==ci&&M.regions[r].home===ci?r:-1).filter(r=>r>=0).sort((a,b)=>(S.rev[b]||0)-(S.rev[a]||0));
      if(!me.alive)h+=`<div class="box warn"><h4>☠ Valstybė okupuota</h4><div class="muted">Tavo šalis neturi nė vieno regiono. Kelk sukilimus žemiau: laimėjus sukilimo mūšį, valstybė atkuriama. Ištikimi botai piliečiai irgi sukyla, o oportunistai gali pasirinkti kitą šalį. Kitos šalies pilietybę gali priimti skiltyje „Emigracija“.</div></div>`;
      if(occR.length)h+=`<div class="box"><h4>✊ Okupuoti regionai (${occR.length})</h4><div class="muted">Kiekvienas paspaudimas kainuoja ${G('revHp')} ❤ ir prideda ${G('revMe')} sukilimo taškų. Botai piliečiai irgi prisideda. Pasiekus ${G('revMax')} prasideda mūšis dėl regiono.</div>
        ${occR.slice(0,25).map(r=>`<div class="revrow"><button class="btn sm alt" data-act="goto" data-r="${r}" aria-label="Rodyti žemėlapyje">⌖</button><div class="grow"><div class="row"><span class="grow">${esc(M.regions[r].name)} <small class="muted">· ${esc(C(S.owner[r]).short)}</small></span><small>${Math.floor(S.rev[r]||0)}/${G('revMax')}</small></div><div class="ebar rv"><i style="width:${Math.min(100,(S.rev[r]||0)/G('revMax')*100)}%"></i></div></div>
          ${revBusy(r)?`<button class="btn sm" data-act="openBattle" data-b="${S.battles.find(x=>x.region===r).id}">⚔</button>`:`<button class="btn sm red" data-act="revolt" data-r="${r}" ${revCool(r)||!revOk(r)||p.hp<G('revHp')?'disabled':''}>✊</button>`}</div>`).join('')}</div>`;
      const F=S.fin,row=(k,n)=>`<dt>${n}</dt><dd>${fmt(F.t[k]||0)} <span class="muted">· vakar ${fmt(F.y[k]||0)}</span></dd>`;
      h+=`<div class="box"><div class="row">${sw(ci,1)}<b class="grow">${cname(ci)}</b><span class="muted">${role}</span></div><dl class="kv">
        <dt>Pirmininkas</dt><dd>${esc(me.leader)}${p.president?' (tu)':''}</dd><dt>Regionai</dt><dd>${OWN[ci].length}</dd><dt>Karinė galia</dt><dd>${fmt(power(ci))}${me.mobil>S.tick?' 🔺 mobilizacija':''}</dd>
        <dt>Karai</dt><dd>${wars.length?wars.map(w=>esc(C(w).short)).join(', '):'nėra'}</dd><dt>Aljansas</dt><dd>${al?esc(al.name):'nėra'}</dd><dt>Įmonių pelno mokestis</dt><dd>${me.tax}%</dd>${(()=>{const x=cStats()[ci];return `<dt>Piliečiai</dt><dd>${fmt(x.cit)}</dd><dt>Imigravo / emigravo</dt><dd>${fmt(x.imm)} / ${fmt(x.emi)}</dd><dt>Įmonės</dt><dd>${fmt(x.co)}</dd><dt>Žala šiandien / 7 d. / 30 d.</dt><dd>${fmt(x.d1)} / ${fmt(x.d7)} / ${fmt(x.d30)}</dd>`;})()}</dl>
        <div class="row"><button class="btn sm alt grow" data-act="cinfo" data-i="${ci}">📊 Šalies informacija</button><button class="btn sm alt grow" data-act="tab" data-i="tops">🏆 Topai</button></div></div>
       <div class="box"><div class="row"><h4 class="grow">Šalies iždas</h4><b class="tprice">₡${fmt(me.treasury)}</b></div><dl class="kv">${row('reg','Regionų pajamos')}${row('tax','Įmonių mokesčiai')}${row('fee','Rinkos mokestis')}${row('cit','Botų piliečių mokesčiai ir aukos')}${row('war','Karo grobis')}${row('out','Išlaidos')}</dl>
        <div class="muted">Iš iždo mokama už mobilizaciją, bunkerius, kareivines, premijas mūšiams ir deputatų algas. Kaip jį leisti, sprendžia parlamentas.</div></div>`;
      if(p.president)h+=`<div class="box"><h4>Pirmininko valdžia</h4><div class="muted">Kai šalis kariauja, gali pats pradėti mūšį: paspausk priešo regioną žemėlapyje šalia savo sienos ir rinkis „Pulti regioną“. Alga ₡${G('presPay')} per dieną iš iždo.</div></div>`;
      h+=`<div class="box"><h4>Emigracija</h4><div class="muted">Pakeisk pilietybę už ₡100. Vietą parlamente prarasi.</div><div class="row"><select id="emSel" class="grow" aria-label="Šalis">${optList(-1,ci)}</select><button class="btn sm alt" data-act="emigrate">Emigruoti</button></div></div>`;
    }
    if(kView==='p'){const nextE=(Math.floor(S.tick/24/G('elecDays'))+1)*G('elecDays')*24;
      h+=`<div class="box"><div class="row"><h4 class="grow">Parlamentas · ${nS} vietų</h4><span class="muted">${role}</span></div>
        <div class="mps">${S.parl.mps.map((m,i)=>`<span class="${m.me?'me':''}">${i?'':'★ '}${esc(m.n)} <small>${m.v}</small></span>`).join('')}</div>
        <div class="muted">Kiti rinkimai: ${timeStr(nextE)}. Į parlamentą patenka ${nS} daugiausia balsų surinkusių kandidatų, pirmasis tampa pirmininku. Tavo balsai priklauso nuo lygio ir šlovės, kurią gauni kovodamas už savo šalį.</div>
        ${p.mp?'<div>✔ Kaip deputatas kituose rinkimuose kandidatuoji automatiškai.</div>':S.election.candidate?'<div>✔ Tu esi kandidatas kituose rinkimuose.</div>':`<button class="btn" data-act="run">Kandidatuoti (₡50)</button>`}
        ${S.election.last?`<details><summary class="muted">Praeitų rinkimų rezultatai</summary><div class="mps">${S.election.last.map(c=>`<span class="${c.me?'me':''}${c.ok?'':' out'}">${esc(c.n)} <small>${c.v}</small></span>`).join('')}</div></details>`:''}</div>`;
      h+=`<h4 class="sec">SVARSTOMI SIŪLYMAI (${S.bills.length})</h4>`;
      if(!S.bills.length)h+=`<div class="muted">Šiuo metu parlamentas nieko nesvarsto.</div>`;
      S.bills.forEach(b=>{const left=Math.max(1,b.end-S.tick);
        h+=`<div class="box bill"><b>${esc(billTitle(b))}</b><div class="muted">Siūlo ${esc(b.by)}${b.mine?' (tu)':''} · balsavimas baigsis po ${left} val.${b.vote?` · tu balsavai ${b.vote>0?'UŽ':'PRIEŠ'}`:''}</div>
         ${p.mp?`<div class="row"><button class="btn sm grow buy${b.vote>0?' on':''}" data-act="vote" data-i="${b.id}" data-s="1">Už</button><button class="btn sm grow red${b.vote<0?' on':''}" data-act="vote" data-i="${b.id}" data-s="-1">Prieš</button></div>`:''}</div>`;});
      if(p.mp){const nb=neighbors(ci).filter(n=>C(n).alive&&!atWar(ci,n)).sort((a,b)=>power(a)-power(b)).map(n=>[n,`${C(n).short} · galia ${fmt(power(n))}${allied(ci,n)?' · sąjungininkė':''}`]);
        const en=wars.map(w=>[w,`${C(w).short} · užėmėte ${occ(ci,w)}, praradote ${occ(w,ci)}`]);
        const bs=S.battles.filter(b=>b.att===ci||b.def===ci).map(b=>[b.id,`${M.regions[b.region].name} (${b.rw[0]}:${b.rw[1]})${pool(b,b.att===ci?0:1)>0?' · 💰':''}`]);
        const border=r=>[...M.regions[r].adj].some(a=>S.owner[a]!==ci)?1:0;
        const rs=OWN[ci].slice().sort((a,b)=>(me.cap===b)-(me.cap===a)||border(b)-border(a)).slice(0,80).map(r=>[r,`${me.cap===r?'★ ':''}${M.regions[r].name} · 🏰${bld(r,'b')} 🎖${bld(r,'k')}${border(r)?' · pasienis':''}`]);
        const form=(t,body,kind,btn,note)=>`<div class="box"><h4>${t}</h4>${body?`<div class="row">${body}</div>`:''}${note?`<div class="muted">${note}</div>`:''}<button class="btn sm" data-act="prop" data-i="${kind}">${btn}</button></div>`;
        h+=`<h4 class="sec">SIŪLYTI BALSAVIMUI</h4>`;
        if(nb.length)h+=form('Karas',sel('war',nb),'war','Siūlyti skelbti karą','Sąjungininkės gali stoti į karą kartu su užpulta šalimi.');
        if(en.length)h+=form('Taika',sel('peace',en)+sel('terms',Object.entries(TERMS)),'peace','Siūlyti taiką','Jei parlamentas pritars, pasiūlymą svarstys kitos šalies deputatai.');
        h+=form('Įmonių pelno mokestis',sel('tax',[0,5,10,15,20,25,30,40,50].map(v=>[v,v+'%'])),'tax','Siūlyti mokestį',`Dabar ${me.tax}%. Mokestį moka visos šalies regionuose veikiančios įmonės, kai gamina prekes.`);
        h+=form('Mobilizacija','','mobil',`Siūlyti mobilizaciją (₡${G('mobilCost')})`,`2 dienas šalies kariai daro +${G('mobilBonus')}% žalos.`);
        if(bs.length)h+=form('Premija mūšiui',sel('bb',bs)+sel('ba',[100,250,500,1000,2500].map(v=>[v,'₡'+v]),'fit'),'bounty','Siūlyti premiją',`Kovojantys už šalį gauna ₡${G('bountyHit')} už smūgį, kol fondas neišseks, o botai kovoja +${G('bountyBot')}% stipriau.`);
        if(rs.length)h+=form('Statyba',sel('br',rs)+sel('bk',Object.entries(BLD).map(([k,d])=>[k,d.n]),'fit'),'build','Siūlyti statybą',`Bunkeris mažina priešo žalą ${G('bunkerPer')}% už lygį, kareivinės didina savo žalą ${G('barracksPer')}% už lygį. Veikia ginant regioną ir puolant iš jo. Lygio kaina ₡${G('bldCost')} × lygis, daugiausia ${G('bldMax')} lygiai.`);
      } else h+=`<div class="muted">Siūlyti ir balsuoti gali tik deputatai. Kandidatuok rinkimuose.</div>`;
      if(S.votes.length)h+=`<div class="box"><h4>Paskutiniai balsavimai</h4><div class="news">${S.votes.map(v=>`<div class="${v.ok?'hot':''}"><time>${timeStr(v.tick)} · ${v.ok?'priimta':'atmesta'} ${v.y}:${v.n}</time>${esc(v.t)}${v.why?' · '+esc(v.why):''}</div>`).join('')}</div></div>`;
    }
    if(kView==='a'){
      if(al){const lead=al.leader===ci;
        h+=`<div class="box"><div class="row"><h4 class="grow">${esc(al.name)}</h4><span class="muted">${al.members.length}/${G('allyMax')} šalių</span></div>
          ${al.members.map(m=>`<div class="row">${sw(m)}<span class="grow">${al.leader===m?'★ ':''}${cname(m)}${m===ci?' (tavo šalis)':''}</span><span class="muted">galia ${fmt(power(m))}</span></div>`).join('')}
          <div class="muted">Sąjungininkės padeda viena kitai mūšiuose (${G('allyHelp')}% savo jėgos) ir gali stoti į karą, kai narė užpuolama. Kviesti naujas šalis gali tik vado (★) šalies parlamentas. Narė gali ir išduoti: užpulti sąjungininkę.</div>
          ${p.mp?`${lead?(()=>{const cs=S.countries.filter(c=>c.alive&&!al.members.includes(c.id)&&!al.members.some(m=>atWar(m,c.id))).sort((a,b)=>power(b.id)-power(a.id)).slice(0,80).map(c=>[c.id,`${c.short} · galia ${fmt(power(c.id))}${c.al?' · kitame aljanse':''}`]);return cs.length?`<div class="row">${sel('inv',cs)}<button class="btn sm" data-act="prop" data-i="allyInv">Siūlyti kviesti</button></div>`:'';})():''}
          <button class="btn sm alt" data-act="prop" data-i="allyLeave">Siūlyti palikti aljansą</button>`:''}</div>`;}
      else h+=`<div class="box"><h4>Šalis nėra aljanse</h4><div class="muted">Aljansą gali įkurti parlamentas. Tada jūsų šalis taps vadu ir galės kviesti kitas šalis. Kitų aljansų vadai irgi gali pakviesti jūsų šalį, tada kvietimą svarstys parlamentas.</div>
        ${p.mp?`<button class="btn sm" data-act="prop" data-i="allyNew" ${S.alliances.length>=G('allyCount')?'disabled':''}>Siūlyti įkurti aljansą</button>`:''}</div>`;
      h+=`<div class="box"><h4>Pasaulio aljansai (${S.alliances.length}/${G('allyCount')})</h4>${S.alliances.map(a=>`<div class="row">${sw(a.leader)}<div class="grow"><b>${esc(a.name)}</b><div class="muted">${a.members.map(m=>(a.leader===m?'★ ':'')+esc(C(m).short)).join(', ')}</div></div><span class="muted">${fmt(a.members.reduce((s,m)=>s+power(m),0))}</span></div>`).join('')||'<div class="muted">Kol kas nė vieno.</div>'}</div>`;
    }
  }
  if(tab==='cinfo'){title=C(cinfoId).short;h=renderCInfo(cinfoId);}
  if(tab==='tops'){title='🏆 Topai';h=renderTops();}
  if(tab==='bots'){title='Botai ir nustatymai';
    h+=`<div class="seg">${[['b','Botai'],['s','Nustatymai']].map(([k,n])=>`<button class="${bView===k?'on buy':''}" data-act="bView" data-i="${k}">${n}</button>`).join('')}</div>`;
    if(bView==='s'){const g=CFG[cfgG]||CFG[0],ch=Object.keys(S.cfg).length;
      h+=`<div class="chips">${CFG.map((x,i)=>`<button class="chip${i===cfgG?' on':''}" data-act="cfgG" data-i="${i}">${x[0]}${x[1].some(it=>S.cfg[it[0]]!=null)?' •':''}</button>`).join('')}</div>
       <div class="box">${g[1].map(it=>{const v=G(it[0]),mod=S.cfg[it[0]]!=null;return `<div class="row cfg"><label class="grow" for="cfg_${it[0]}">${it[1]}${mod?` <small class="muted">numatyta ${it[2]}</small>`:''}</label><input type="number" inputmode="decimal" id="cfg_${it[0]}" data-cfg="${it[0]}" min="${it[3]}" max="${it[4]}" step="${it[5]}" value="${v}" class="${mod?'mod':''}">${mod?`<button class="btn sm alt" data-act="cfgReset" data-i="${it[0]}" aria-label="Atstatyti">↺</button>`:''}</div>`;}).join('')}</div>
       <div class="row"><button class="btn sm alt" data-act="cfgReset" data-i="" ${ch?'':'disabled'}>Atstatyti visus nustatymus (${ch})</button></div>
       <div class="muted">Pakeitimai įsigalioja iškart ir išsaugomi kartu su žaidimu. XP greitis ir įgūdžių taškai už lygį yra skiltyje „Botai“ → „Progresas“.</div>`;}
    else{
    const alive=S.countries.filter(c=>c.alive);if(botSel<0||!C(botSel).alive)botSel=alive.find(c=>c.id!==p.country).id;
    const o=ov(botSel),bc=C(botSel),bw=S.wars.filter(w=>w.a===botSel||w.b===botSel).map(w=>w.a===botSel?w.b:w.a);
    const cb=citBy(),nOpp=S.cit.filter(z=>z.o).length,nEx=S.cit.filter(z=>!C(z.c).alive).length,nRev=Object.keys(S.rev).length,nRb=S.battles.filter(b=>b.rev).length;
    const cTypes=[['mix','Pagal nustatymą'],['loyal','Ištikimi'],['opp','Oportunistai']];
    h+=`<div class="box"><h4>Botai piliečiai</h4><dl class="kv"><dt>Iš viso</dt><dd>${fmt(S.cit.length)} / ${fmt(G('cMax'))}</dd><dt>Ištikimi</dt><dd>${fmt(S.cit.length-nOpp)}</dd><dt>Oportunistai</dt><dd>${fmt(nOpp)}</dd><dt>Be valstybės (sukilėliai)</dt><dd>${fmt(nEx)}</dd><dt>Sukilimai</dt><dd>${nRev} regionuose · mūšių ${nRb}</dd>${(()=>{const t=S.rstat||{};return `<dt>Sukilimų istorija</dt><dd>${t.start||0} mūšių · laimėta ${t.won||0} · atkurta valstybių ${t.restored||0}</dd><dt>Pilietybės pakeitimai</dt><dd>oportunistų ${t.opp||0} · ištikimų ${t.loy||0}</dd>`;})()}</dl>
      <div class="row"><label for="cN" class="grow">Kiekis</label><input type="number" inputmode="numeric" id="cN" min="1" max="50000" step="1" value="${CN}" class="num"><select id="cT" aria-label="Botų tipas">${cTypes.map(([k,n])=>`<option value="${k}" ${CT===k?'selected':''}>${n}</option>`).join('')}</select></div>
      <div class="row"><button class="btn sm grow" data-act="citAdd" data-i="-1">+ Pridėti po pasaulį</button><button class="btn sm grow red" data-act="citDel" data-i="-1">− Atimti iš visų</button></div>
      <div class="chips">${[-100,-10,10,100].map(v=>`<button class="chip" data-act="citQ" data-i="${v}">${v>0?'+':'−'}${Math.abs(v)}</button>`).join('')}<span class="muted">greitai po pasaulį</span></div>
      <div class="muted">Kiekvienas botas yra atskiras pilietis: dirba (kelia šalies ekonomiką ir moka mokesčius), kovoja mūšiuose už premijas ir kelia sukilimus okupuotuose savo šalies regionuose. Praradę valstybę ištikimi botai pilietybės iškart nekeičia, o kovoja dėl jos atkūrimo. Oportunistai keičia pilietybę, kai kita šalis naudingesnė. Elgseną reguliuok skiltyje „Nustatymai“ → „Botai piliečiai“ ir „Sukilimai“.</div></div>
     <div class="box"><h4>Visi botai</h4>
      ${slider('aggr','Agresija (kaip dažnai skelbia karus)',0,4,.25)}
      ${slider('activity','Mūšių aktyvumas',0,3,.25)}
      ${slider('peace','Taikingumas (kaip greitai taikosi)',0,4,.25)}
      ${slider('power','Visų botų jėga mūšiuose',.25,3,.25)}
      ${slider('ally','Tavo šalies botų jėga',.25,3,.25)}
      ${slider('maxWars','Daugiausia karų vienu metu',0,80,1)}
      <div class="row"><button class="btn sm alt" data-act="worldPeace">Paliaubos visame pasaulyje</button><button class="btn sm alt" data-act="botsReset">Atstatyti</button></div></div>
     <div class="box"><h4>Progresas</h4>
      ${slider('xp','XP greitis (tau ir botams)',.25,5,.25)}
      ${slider('ptsMe','Tavo įgūdžių taškai už lygį',1,15,1)}
      ${slider('ptsBot','Botų įgūdžių taškai už lygį',0,15,1)}
      ${slider('ptsPrest','Papildomi taškai už prestižą',0,25,1)}
      <div class="muted">Botų šalys irgi kyla lygiais ir daro prestižą. Kiekvienas jų taškas prideda 0,4% jėgos mūšyje.</div></div>
     <div class="box"><h4>Viena šalis</h4><select id="botC" aria-label="Šalis">${optList(botSel,-1)}</select>
      <dl class="kv"><dt>Lyderis</dt><dd>${esc(bc.leader)}${bc.playerPres?' (tu)':''}</dd><dt>Karių lygis</dt><dd>${bc.lvl||1}${bc.pres?' · ★'+bc.pres:''} (+${Math.round((botLvl(botSel)-1)*100)}%)</dd><dt>Regionai</dt><dd>${OWN[botSel].length}</dd><dt>Galia</dt><dd>${fmt(power(botSel))}</dd><dt>Iždas</dt><dd>₡${fmt(bc.treasury)}</dd><dt>Karai</dt><dd>${bw.length?bw.map(w=>esc(C(w).short)).join(', '):'nėra'}</dd></dl>
      <div class="row"><label for="botMode" class="grow">Elgesys</label><select id="botMode">${Object.entries(MODES).map(([k,v])=>`<option value="${k}" ${o.mode===k?'selected':''}>${v}</option>`).join('')}</select></div>
      <dl class="kv"><dt>Botai piliečiai</dt><dd>${fmt(cb[botSel])} <span class="muted">· oportunistų ${S.cit.filter(z=>z.c===botSel&&z.o).length}</span></dd></dl>
      <div class="row"><button class="btn sm grow" data-act="citAdd" data-i="${botSel}">+ Pridėti šiai šaliai</button><button class="btn sm grow red" data-act="citDel" data-i="${botSel}">− Atimti iš šios šalies</button></div>
      <div class="row"><label for="botPw" class="grow">Jėga</label><select id="botPw">${[.25,.5,1,1.5,2,3].map(v=>`<option value="${v}" ${(o.pw||1)===v?'selected':''}>${v*100}%</option>`).join('')}</select></div>
      <div class="muted">Taikus neskelbia karų. Agresyvus puola net stipresnius. Užšaldytas nieko nepuola, tik ginasi.</div>
      <button class="btn sm alt" data-act="gotoC" data-i="${botSel}">Rodyti žemėlapyje</button></div>
     <div class="box"><h4>Stipriausios šalys</h4>${alive.slice().sort((a,b)=>OWN[b.id].length-OWN[a.id].length).slice(0,10).map((c,i)=>`<div class="row">${sw(c.id)}<span class="grow">${i+1}. ${esc(c.short)}</span><span class="muted">${OWN[c.id].length} reg. · 👥 ${fmt(cb[c.id])} · ${MODES[ov(c.id).mode]}</span></div>`).join('')}
      <div class="muted">Gyvų šalių: ${alive.length} iš ${NC} · karų: ${S.wars.length} · mūšių: ${S.battles.length}</div></div>`;}
  }
  if(tab==='more'){title='Žinios';
    const list=S.newsHot?S.news.filter(n=>n.hot):S.news;
    h+=`<button class="btn alt" data-act="tab" data-i="tops">🏆 Šalių ir žaidėjų topai</button>
     <label class="chk"><input type="checkbox" id="newsHot" ${S.newsHot?'checked':''}> Tik mano šalies naujienos</label>
     <div class="news">${list.slice(0,40).map(n=>`<div class="${n.hot?'hot':''}"><time>${timeStr(n.tick)}</time>${esc(n.t)}</div>`).join('')||'<span class="muted">Kol kas tylu.</span>'}</div>
     <div class="box"><h4>Žaidimas</h4><div class="muted">Progresas išsaugomas automatiškai šioje naršyklėje.</div>
     <div class="row"><button class="btn alt" data-act="saveNow">Išsaugoti dabar</button><button class="btn red" data-act="askReset">Naujas žaidimas</button></div>
     <div class="muted">Plieno Frontas · sukūrė <a href="https://github.com/nusikales" target="_blank" rel="noopener" style="color:var(--brass2)">Nusikales</a></div></div>`;
  }
  $('#sheetTitle').textContent=title;body.innerHTML=h;body.scrollTop=sc;tickLabel();if(tab==='trade')tradeLive();
  const on=(id,f)=>{const el=$('#'+id);if(el)el.onchange=()=>{f(el);save();renderSheet();};};
  on('tMarket',el=>{T.market=el.checked;if(!T.market)T.price=+p2(S.mk[T.k].m);});
  on('newsHot',el=>S.newsHot=el.checked);
  on('botC',el=>botSel=+el.value);on('cT',el=>CT=el.value);
  const setOv=(k,v)=>{const o=Object.assign({mode:'auto',pw:1},S.bots.ov[botSel]);o[k]=v;if(o.mode==='auto'&&o.pw===1)delete S.bots.ov[botSel];else S.bots.ov[botSel]=o;};
  on('botMode',el=>setOv('mode',el.value));on('botPw',el=>setOv('pw',+el.value));
}
$('#sheetBody').addEventListener('input',e=>{const id=e.target.id;
  if(id==='tQty')return tSetQty(+e.target.value);
  if(id==='tSlide'){T.qty=+e.target.value;$('#tQty').value=T.qty;return tradeSum();}
  if(id==='cN'){CN=clamp(Math.floor(+e.target.value)||1,1,50000);return;}
  if(id==='tPrice'){T.price=Math.max(.01,+e.target.value||0);return tradeSum();}
  if(e.target.dataset&&e.target.dataset.cfg)return;
  const k=e.target.dataset&&e.target.dataset.bot;if(!k)return;S.bots[k]=+e.target.value;$('#out_'+k).textContent=fmtBot(k,S.bots[k]);});
$('#sheetBody').addEventListener('change',e=>{const d=e.target.dataset;if(!d||!S||S.__preview)return;
  if(d.pf){PF[d.pf]=e.target.value;renderSheet();}
  if(d.cfg){const it=CFI[d.cfg],v=clamp(+e.target.value||0,it[3],it[4]);if(v===it[2])delete S.cfg[d.cfg];else S.cfg[d.cfg]=v;recalc();save();refresh(true);}});
document.addEventListener('click',e=>{const t=e.target.closest('[data-act]');if(!t)return;const a=t.dataset.act;
  switch(a){
    case 'closeR':$('#rcard').hidden=true;sel=-1;break;
    case 'openBattle':battleId=+t.dataset.b;openSheet('battle');return;
    case 'tab':openSheet(t.dataset.i);return;
    case 'hit':A.hit(+t.dataset.b,+t.dataset.s);break;
    case 'mult':S.p.mult=+t.dataset.i;break;
    case 'bFilter':bFilter=t.dataset.i;break;
    case 'invView':invView=t.dataset.i;$('#sheetBody').scrollTop=0;break;
    case 'selItem':if(t.dataset.i==='crate'||t.dataset.i==='crate2'){invSel=t.dataset.i;crateUI(t.dataset.i);return;}invSel=invSel===t.dataset.i?null:t.dataset.i;break;
    case 'eatItem':A.eat(t.dataset.i);break;case 'crateUI':crateUI(t.dataset.i);return;case 'crSpin':crSpin(+t.dataset.i);return;case 'crTab':CR.k=t.dataset.i;CR.res=[];crateDraw();return;
    case 'craft':A.craft(t.dataset.i);break;case 'dismantle':A.dismantle(+t.dataset.i);break;case 'equip':A.equip(+t.dataset.i);break;
    case 'selGear':invSel=invSel==='g'+t.dataset.i?null:'g'+t.dataset.i;break;case 'ammoSel':S.p.ammoSel=t.dataset.i;break;
    case 'goto':{const g=M.regions[+t.dataset.r],r=cv.getBoundingClientRect();closeSheet();V.s=Math.max(V.s,2);V.x=r.width/2-g.lx*V.s;V.y=r.height/2-g.ly*V.s;sel=+t.dataset.r;showRegion(sel);break;}
    case 'gotoC':closeSheet();focusCountry(+t.dataset.i);break;
    case 'cinfo':cinfoId=+t.dataset.i;sel=-1;openSheet('cinfo');return;
    case 'tView':tView=t.dataset.i;break;case 'tcKey':tcKey=t.dataset.i;break;case 'tpKey':tpKey=t.dataset.i;break;
    case 'emigrateTo':A.emigrate(+t.dataset.i);break;
    case 'eat':A.eat();break;
    case 'coBuild':CA.coBuild(t.dataset.i);break;case 'coWork':CA.coWork(+t.dataset.i);break;case 'coProd':CA.coProd(+t.dataset.i);break;case 'coProdAll':CA.coProdAll();break;
    case 'coUp':CA.coUp(+t.dataset.i,t.dataset.s);break;case 'coHire':CA.coHire(+t.dataset.i);break;case 'coFire':CA.coFire(+t.dataset.i);break;
    case 'coView':coView=t.dataset.i||null;break;case 'charView':cView=t.dataset.i;openSheet('char');return;
    case 'skill':CA.skill(t.dataset.i);break;case 'respec':CA.respec();break;case 'askPrestige':showModal('prestige');return;case 'prestige':CA.prestige();break;
    case 'trade':if(CR.open){if(CR.busy)return;CR.open=false;$('#modal').hidden=true;}openTrade(t.dataset.i,t.dataset.s);return;
    case 'mFilter':mFilter=t.dataset.i;break;
    case 'cancelOrder':cancelOrder(+t.dataset.i);break;
    case 'tSide':T.side=t.dataset.i;T.qty=Math.min(T.qty,tMax());break;
    case 'tRange':T.range=+t.dataset.i;tradeLive();return;
    case 'tPick':if(isW(T.k))return;T.market=false;T.price=+(+t.dataset.i).toFixed(2);break;
    case 'tStep':T.price=Math.max(.01,+(T.price*(1+.01*t.dataset.i)+.01*t.dataset.i).toFixed(2));$('#tPrice').value=p2(T.price);tradeSum();return;
    case 'tQ':tSetQty(T.qty+ +t.dataset.i);return;
    case 'tPct':tSetQty(Math.floor(tMax()*t.dataset.i));return;
    case 'tGo':{const ok=T.market?tradeNow(T.k,T.side,T.qty):placeOrder(T.k,T.side,T.qty,T.price);if(ok)T.qty=0;break;}
    case 'run':A.run();break;case 'kView':kView=t.dataset.i;$('#sheetBody').scrollTop=0;break;case 'bView':bView=t.dataset.i;$('#sheetBody').scrollTop=0;break;case 'cfgG':cfgG=+t.dataset.i;break;
    case 'cfgReset':if(t.dataset.i)delete S.cfg[t.dataset.i];else S.cfg={};recalc();break;
    case 'prop':propose(t.dataset.i);break;case 'propB':PF.br=+t.dataset.r;PF.bk=t.dataset.i;propose('build');break;case 'vote':voteBill(+t.dataset.i,+t.dataset.s);break;
    case 'coMove':CA.coMove(+t.dataset.i,+PF.mv);break;
    case 'attack':A.attack(+t.dataset.r);break;case 'emigrate':A.emigrate(+$('#emSel').value);break;
    case 'worldPeace':A.worldPeace();break;case 'botsReset':A.botsReset();break;
    case 'revolt':A.revolt(+t.dataset.r);break;case 'acceptCit':$('#modal').hidden=true;A.acceptCit(+t.dataset.i);break;
    case 'citAdd':{const e=$('#cN');if(e)CN=clamp(Math.floor(+e.value)||1,1,50000);citAdd(CN,+t.dataset.i,CT);break;}
    case 'citDel':{const e=$('#cN');if(e)CN=clamp(Math.floor(+e.value)||1,1,50000);citDel(CN,+t.dataset.i,CT);break;}
    case 'citQ':{const v=+t.dataset.i;if(v>0)citAdd(v,-1,CT);else citDel(-v,-1,CT);break;}
    case 'saveNow':save();toast('Išsaugota.');break;
    case 'askReset':showModal('reset');break;
    case 'start':{const name=($('#pname').value||'').trim().slice(0,20)||'Karys',ci=+$('#pcountry').value;$('#modal').hidden=true;newGame(name,ci);focusCountry(ci);refresh(true);return;}
    case 'closeModal':if(CR.busy)return;$('#modal').hidden=true;CR.open=false;break;
    case 'doReset':try{localStorage.removeItem(SAVE);}catch(_){}closeSheet();preview();showModal('new');return;
  }
  if(S&&!S.__preview){refresh(true);save();}
});
// ---------- crate opening window ----------
const CR={k:'crate',busy:false,res:[],open:false};
const crTile=g=>`<span class="crt${g.win?' win':''}" style="--rc:${RAR[g.r].c}"><span class="fw big">${gico(g.s,g.r)}</span></span>`;
function crateUI(k){CR.k=k==='crate2'?'crate2':'crate';CR.res=[];CR.open=true;closeSheet();$('#modal').hidden=false;crateDraw();}
function crateDraw(){const p=S.p,k=CR.k,el=k==='crate2',n=p.inv[k],na=!!p.crNoAnim,per=G(el?'cr2N':'crN');
  const tabs=['crate','crate2'].map(x=>`<button class="${x===k?'on buy':''}" data-act="crTab" data-i="${x}" ${CR.busy?'disabled':''}>${ITEMS[x].i} ${ITEMS[x].n} (${p.inv[x]})</button>`).join('');
  $('#modal').innerHTML=`<div class="card crate"><div class="seg">${tabs}</div>
   <div class="crodds"><b>Šansai</b> · ${per} daikt. iš dėžės · ginklas ${G('crWpn')}%, apranga ${100-G('crWpn')}%<div>${crOdds(el)}</div></div>
   <div id="crReels" class="crreels">${CR.res.length?'':`<div class="crempty">${ITEMS[k].i}<div class="muted">Turi ${n}. ${n?'Spausk „Sukti“.':'Dėžių gausi kovodamas arba nusipirk rinkoje.'}</div></div>`}</div>
   <div id="crGot" class="crgot"></div>
   <label class="chk"><input type="checkbox" id="crNoAnim" ${na?'checked':''}> Be animacijos</label>
   <div class="row"><button class="btn grow" data-act="crSpin" data-i="1" ${n<1||CR.busy?'disabled':''}>Sukti</button><button class="btn grow" data-act="crSpin" data-i="5" ${n<1||CR.busy?'disabled':''}>Sukti ×${Math.min(5,Math.max(1,n))}</button></div>
   <div class="row"><button class="btn alt grow" data-act="trade" data-i="${k}" data-s="buy" ${CR.busy?'disabled':''}>🛒 Pirkti ₡${p2(S.mk[k].m)}</button><button class="btn alt grow" data-act="closeModal" ${CR.busy?'disabled':''}>Uždaryti</button></div></div>`;
  const cb=$('#crNoAnim');cb.onchange=()=>{p.crNoAnim=cb.checked;save();};
  if(CR.res.length&&!CR.busy)crShow(false);}
function crShow(anim){const box=$('#crReels');if(!box)return;const el=CR.k==='crate2',L=46,W=68,dur=G('crSpin')*1000;
  box.innerHTML=CR.res.map((g,i)=>{const strip=[];for(let j=0;j<L;j++)strip.push(j===L-4?Object.assign({win:!anim},g):{s:crSlot(),r:crRoll(el)});
    return `<div class="reel"><div class="strip" id="crS${i}" style="transform:translateX(0)">${strip.map(crTile).join('')}</div></div>`;}).join('');
  const got=()=>{$('#crGot').innerHTML=CR.res.map(g=>`<div class="row"><span class="fw">${gico(g.s,g.r)}</span><span class="grow" style="color:${RAR[g.r].c}">${gFull(g.s,g.r)}</span><span>${SLOT[g.s].ic} +${g.v}%</span></div>`).join('');};
  const center=(L-4)*W-(box.clientWidth/2-W/2);
  if(!anim){CR.res.forEach((g,i)=>$('#crS'+i).style.transform=`translateX(${-center}px)`);got();return;}
  requestAnimationFrame(()=>requestAnimationFrame(()=>{CR.res.forEach((g,i)=>{const st=$('#crS'+i),off=center+rr(-22,22);
    st.style.transition=`transform ${dur+i*180}ms cubic-bezier(.12,.75,.1,1)`;st.style.transform=`translateX(${-off}px)`;});}));
  setTimeout(()=>{CR.busy=false;if(!CR.open)return;crateDraw();refresh(true);},dur+CR.res.length*180+150);}
function crSpin(n){if(CR.busy)return;const p=S.p,k=CR.k;n=Math.min(n,p.inv[k]);if(n<1)return;CR.res=[];
  for(let i=0;i<n;i++)CR.res.push(...A.openCrate(k));const best=CR.res.reduce((m,g)=>!m||g.r>m.r?g:m,null);if(best)invSel='g'+best.id;save();
  if(p.crNoAnim){crateDraw();refresh(true);return;}CR.busy=true;crateDraw();crShow(true);}
function showModal(kind){
  const m=$('#modal');m.hidden=false;let h='';
  if(kind==='new'){const lt=WORLD.findIndex(c=>c.a==='LT');
    h=`<h1>Plieno Frontas</h1><div class="muted">Vieno žaidėjo karo strategija tikrame pasaulio žemėlapyje. ${NC} šalis valdo botai. Statyk įmones, gamink ginklus, kovok mūšiuose, patek į parlamentą, kurk aljansus ir vesk savo šalį į pergalę.</div>
     <label for="pname" class="muted">Tavo vardas</label><input type="text" id="pname" maxlength="20" placeholder="pvz. Generolas Vilkas">
     <label for="pcountry" class="muted">Tavo šalis</label><select id="pcountry">${WORLD.map((c,i)=>M.caps[i]<0?'':`<option value="${i}" ${i===lt?'selected':''}>${esc(c.n)}</option>`).join('')}</select>
     <button class="btn" data-act="start">Pradėti karą</button>
     <div class="muted" style="text-align:center">Sukūrė <a href="https://github.com/nusikales" target="_blank" rel="noopener" style="color:var(--brass2)">Nusikales</a></div>`;
  }
  if(kind==='prestige')h=`<h1>Prestižas ${S.p.prestige+1}?</h1><div class="muted">Grįši į 1 lygį ir prarasi visus įgūdžius. Mainais visam laikui turėsi ${(S.p.prestige+1)*S.bots.ptsPrest} papildomų įgūdžių taškų. Daiktai, pinigai ir įmonės lieka.</div><div class="row"><button class="btn" data-act="prestige">Daryti prestižą</button><button class="btn alt" data-act="closeModal">Atšaukti</button></div>`;
  if(kind==='reset')h=`<h1>Naujas žaidimas?</h1><div class="muted">Dabartinis progresas bus ištrintas.</div><div class="row"><button class="btn red" data-act="doReset">Taip, pradėti iš naujo</button><button class="btn alt" data-act="closeModal">Atšaukti</button></div>`;
  if(kind==='elected')h=`<h1>${S.p.president?'Tu parlamento pirmininkas!':'Tu deputatas!'}</h1><div class="muted">${esc(myC().name)} išrinko tave į parlamentą. Skiltyje „Šalis“ → „Parlamentas“ gali siūlyti karą, taiką, mokesčius, statybas, premijas mūšiams ir balsuoti. ${S.p.president?'Kaip pirmininkas gali pats pradėti mūšius.':''} Alga ₡${S.p.president?G('presPay'):G('mpPay')} per dieną iš iždo.</div><button class="btn" data-act="closeModal">Pradėti dirbti</button>`;
  if(kind==='defeat'){const q=lastConq>=0&&C(lastConq).alive?lastConq:-1;h=`<h1>Šalis krito</h1><div class="muted">${esc(myC().name)} neteko visų regionų. Gali likti jos piliečiu ir kelti sukilimus okupuotuose regionuose (kainuoja gyvybes): kai sukilimas pasiekia ${G('revMax')}, prasideda mūšis, o laimėjus valstybė atkuriama. Arba gali priimti kitos šalies pilietybę.</div>
    <div class="row"><button class="btn red" data-act="closeModal">✊ Likti ir sukilti</button>${q>=0?`<button class="btn alt" data-act="acceptCit" data-i="${q}">Priimti pilietybę: ${esc(C(q).short)}</button>`:''}</div>`;}
  if(kind==='victory')h=`<h1>Pergalė!</h1><div class="muted">${esc(myC().name)} valdo visą pasaulį per ${Math.floor(S.tick/24)+1} dienas. Tavo bendra žala: ${fmt(S.p.dmg)}.</div><button class="btn" data-act="doReset">Žaisti dar kartą</button>`;
  m.innerHTML=`<div class="card">${h}</div>`;
}
let toastT=0;function toast(t,ms){const el=$('#toast');el.textContent=t;el.hidden=false;clearTimeout(toastT);toastT=setTimeout(()=>el.hidden=true,ms||2200);}
function refresh(force){
  if(!S||S.__preview)return;const p=S.p;
  $('#lvl').firstChild.nodeValue=p.lvl;{const xp=(p.lvl>=G('maxLvl')?100:p.xp/xpNeed(p.lvl)*100);$('#xpbar').style.width=xp+'%';$('#lvl').style.setProperty('--xp',xp.toFixed(1));}{const f=ptsFree(),pb=$('#pBadge');pb.hidden=f<1;pb.textContent=f;}
  $('#hpbar').style.width=(p.hp/p.maxHp*100)+'%';$('#hptxt').textContent=`❤ ${Math.floor(p.hp)}/${p.maxHp}`;
  $('#enbar').style.width=(p.en/p.maxEn*100)+'%';$('#entxt').textContent=`⚡ ${Math.floor(p.en)}/${p.maxEn}`;
  $('#money').textContent='₡ '+fmt(p.money);$('#inv').textContent=`🥧 ${p.inv.bread} · 🍣 ${p.inv.cfish}${p.inv.crate?' · 📦 '+p.inv.crate:''}${p.inv.crate2?' · 🎁 '+p.inv.crate2:''}`;
  $('#clock').textContent=timeStr(S.tick)+' · '+flagOf(myC().a)+' '+myC().short+(p.president?' · Pirmininkas':p.mp?' · Deputatas':'');$('#myflag').style.background=col(p.country);
  const nb=S.battles.filter(b=>b.att===p.country||b.def===p.country).length;const bb=$('#bBadge');bb.hidden=!nb;bb.textContent=nb;
  {const nv=p.mp?(S.bills||[]).filter(b=>!b.vote).length:0,eb=$('#eBadge');eb.hidden=!nv;eb.textContent=nv;}const ib=$('#iBadge'),nc=p.inv.crate+p.inv.crate2;ib.hidden=!nc;ib.textContent=nc;
  document.querySelectorAll('#speed button').forEach(b=>b.classList.toggle('on',+b.dataset.s===S.speed));
  const ae=document.activeElement,busy=!force&&ae&&$('#sheetBody').contains(ae)&&(ae.tagName==='SELECT'||ae.type==='range'||ae.type==='number'||ae.dataset.cfg);
  if(tab==='trade'&&!force)tradeLive();else if(!busy||force)renderSheet();
  if(!$('#rcard').hidden)showRegion(+$('#rcard').dataset.r);
}
document.querySelectorAll('#speed button').forEach(b=>b.onclick=()=>{if(!S||S.__preview)return;S.speed=+b.dataset.s;refresh();});
let acc=0,last=performance.now();
function tickLabel(){const el=$('#nextTick');if(!el||!S)return;el.textContent=S.speed?`⏱ ${Math.max(1,Math.ceil((TICK_MS-acc)/S.speed/1000))} s`:'⏸ pauzė';}
setInterval(()=>{const now=performance.now(),dt=now-last;last=now;if(!S||S.__preview||!$('#modal').hidden||!S.speed){tickLabel();return;}acc+=dt*S.speed;let n=0;while(acc>=TICK_MS&&n<8){acc-=TICK_MS;step();n++;}if(n>=8)acc=0;tickLabel();},250);
window.addEventListener('resize',resize);
window.addEventListener('pagehide',save);

// boot
function preview(){S={__preview:true,owner:M.regions.map(g=>g.home),countries:freshCountries(),battles:[],wars:[],p:{country:WORLD.findIndex(c=>c.a==='LT')}};renderTerritory();focusCountry(S.p.country);V.s*=.45;const r=cv.getBoundingClientRect(),c=C(S.p.country);V.x=r.width/2-c._lx*V.s;V.y=r.height/2-c._ly*V.s;}
M=genMap();resize();
if(load()){renderTerritory();focusCountry(S.p.country);refresh();const hn=S.news.find(n=>n.hot);if(hn)$('#tick1').textContent=hn.t;if(S.over)showModal('victory');}
else{preview();showModal('new');}
requestAnimationFrame(draw);
window.__pf={get S(){return S;},get M(){return M;},step};
})();
