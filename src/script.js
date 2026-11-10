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
const BATTLE_LEN=16, ELECTION_EVERY=5;
const COLORS=WORLD.map((c,i)=>hsl((i*137.508)%360,36+(i%4)*7,36+(i%3)*6));
const MODES={auto:'Įprastas',peaceful:'Taikus',aggressive:'Agresyvus',frozen:'Užšaldytas'};
const BOT_DEF={aggr:1,activity:1,power:1,ally:1,peace:1,maxWars:20,ov:{}};

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
  bread:{n:'Duona',i:'🍞',d:'+15 ❤',heal:15,price:4,c:'food'},
  cfish:{n:'Kepta žuvis',i:'🍣',d:'+35 ❤',heal:35,price:9,c:'food'},
  ammo:{n:'Šoviniai',svg:'ammo',d:'+20% žalos',price:1.2,c:'gear'},
  crate:{n:'Trofėjų dėžė',i:'📦',d:'Atidaryk',c:'gear'},
  grain:{n:'Grūdai',i:'🌾',price:1.5,c:'raw'},fish:{n:'Žuvis',i:'🐟',price:2.5,c:'raw'},
  iron:{n:'Geležis',i:'🪨',price:3,c:'raw'},steel:{n:'Plienas',i:'🔩',price:11,c:'raw'},
  wood:{n:'Mediena',i:'🪵',price:4,c:'raw'},lead:{n:'Švinas',i:'🔘',price:5,c:'raw'},oil:{n:'Nafta',i:'🛢️',price:9,c:'raw'}
};
const RAWS=['grain','fish','iron','wood','lead','oil'];
const WPN={1:{n:'Pistoletas',mul:1.3,dur:30,crit:.05,col:'#7fb38f',cost:{steel:3,wood:1}},
  2:{n:'Automatas',mul:1.7,dur:40,crit:.08,col:'#6fa3e0',cost:{steel:8,wood:3,oil:2}},
  3:{n:'Snaiperinis šautuvas',mul:2.2,dur:50,crit:.2,col:'#b58ae0',cost:{steel:16,wood:4,oil:6}}};
const RECIPES=[
  {id:'bread',out:{bread:1},cost:{grain:2}},{id:'cfish',out:{cfish:1},cost:{fish:2}},
  {id:'steel',out:{steel:1},cost:{iron:3}},{id:'ammo',out:{ammo:10},cost:{lead:1,steel:1}},
  {id:'w1',wpn:1,cost:WPN[1].cost},{id:'w2',wpn:2,cost:WPN[2].cost},{id:'w3',wpn:3,cost:WPN[3].cost}];
const COMPANY={farm:{name:'Ūkis',out:'grain',per:6,cost:250},fishery:{name:'Žvejybos įmonė',out:'fish',per:4,cost:300},
  mine:{name:'Geležies kasykla',out:'iron',per:5,cost:400},sawmill:{name:'Lentpjūvė',out:'wood',per:3,cost:350},
  leadmine:{name:'Švino kasykla',out:'lead',per:3,cost:450},oilrig:{name:'Naftos gręžinys',out:'oil',per:2,cost:600}};
const SVG={ammo:'<svg viewBox="0 0 24 24"><path d="M9 19V10c0-4 3-7 3-7s3 3 3 7v9z" fill="#e0b050"/><rect x="8" y="18" width="8" height="3.5" rx="1" fill="#8a6420"/></svg>',
  w1:'<svg viewBox="0 0 24 24"><path d="M3 7h18v4h-9l-1 3H8l-1 6H3l2-9H3z" fill="currentColor"/></svg>',
  w2:'<svg viewBox="0 0 24 24"><path d="M1 9h13l1-2h3v2h5v2h-9l-1 2h-2l-1 6H7l1-6H5l-2 3H1z" fill="currentColor"/></svg>',
  w3:'<svg viewBox="0 0 24 24"><path d="M0 11h12v-1h12v2H14l-1 2h-3l-1 5H6l1-5H3l-1 2H0zM8 6h8v3H8z" fill="currentColor"/></svg>'};
const ico=k=>ITEMS[k].svg?SVG[ITEMS[k].svg]:ITEMS[k].i;
const wico=t=>`<span style="color:${WPN[t].col}">${SVG['w'+t]}</span>`;
const costStr=c=>Object.entries(c).map(([k,v])=>`${v}× ${ITEMS[k].n}`).join(', ');

// ---------- state ----------
const SAVE='plieno-frontas-v3',RP=30,RWIN=2;
let S=null,OWN=[],OWNC=[];
function botName(){return pick(FIRST)+' '+pick(LAST);}
function freshCountries(){return WORLD.map((d,i)=>({id:i,name:d.n,short:d.n,a:d.a,cap:M.caps[i],treasury:300,alive:M.caps[i]>=0,leader:botName(),playerPres:false,mobil:0,tax:10}));}
const freshInv=()=>({bread:5,cfish:0,ammo:40,crate:1,grain:4,fish:0,iron:3,steel:2,wood:1,lead:0,oil:0});
function newGame(name,countryId){
  S={v:3,tick:0,speed:1,owner:M.regions.map(g=>g.home),countries:freshCountries(),
    wars:[],battles:[],news:[],nextBattleId:1,nextWid:2,newsHot:true,
    election:{candidate:false},bots:JSON.parse(JSON.stringify(BOT_DEF)),
    p:{name:name||'Karys',country:countryId,hp:100,maxHp:100,en:100,maxEn:100,money:120,str:10,xp:0,lvl:1,
      inv:freshInv(),weapons:[{id:1,t:1,dur:WPN[1].dur}],eq:1,useAmmo:true,mult:1,fame:0,dmg:0,
      st:{hits:0,won:0,crates:0,money:0},companies:[],president:false},
    over:false};
  rebuildOwn();mkInit();S.countries.forEach((c,i)=>c.treasury=300+OWN[i].length*120);
  addNews(`${S.p.name} prisijungė prie šalies ${S.countries[countryId].short} kariuomenės.`,true);
  renderTerritory();save();
}
function save(){if(!S||S.__preview)return;try{localStorage.setItem(SAVE,JSON.stringify(S));}catch(e){}}
function load(){try{const t=localStorage.getItem(SAVE);if(!t)return false;const o=JSON.parse(t);if(!o||o.owner.length!==M.regions.length||o.countries.length!==NC||!o.p.inv)return false;S=o;
  S.bots=Object.assign(JSON.parse(JSON.stringify(BOT_DEF)),S.bots||{});S.p.inv=Object.assign(freshInv(),S.p.inv);delete S['market'];if(!S.mk||MKEYS.some(k=>!S.mk[k]))mkInit();S.orders=S.orders||[];S.p.cost=S.p.cost||{};return true;}catch(e){return false;}}
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
const eqW=()=>S.p.weapons.find(w=>w.id===S.p.eq)||null;

// ---------- market ----------
const MKW={w1:45,w2:130,w3:320};
const MKEYS=Object.keys(ITEMS).filter(k=>ITEMS[k].price).concat(Object.keys(MKW));
const isW=k=>k in MKW,wT=k=>+k[1];
const mkBase=k=>isW(k)?MKW[k]:ITEMS[k].price;
const mkName=k=>isW(k)?WPN[wT(k)].n:ITEMS[k].n;
const mkIcon=k=>isW(k)?`<span class="fw big">${wico(wT(k))}</span>`:ico(k);
const mkCat=k=>isW(k)?'gear':ITEMS[k].c;
const mkDesc=k=>isW(k)?`×${WPN[wT(k)].mul} žalos, ${WPN[wT(k)].dur} smūgių`:(ITEMS[k].d||'Žaliava gamybai');
const WARF={ammo:1,steel:.6,w1:.5,w2:.5,w3:.5,bread:.4,cfish:.4,iron:.4,lead:.6,oil:.5};
const liq=k=>clamp(Math.round(120/mkBase(k)),1,80);
const FEE=.02,HIST=168,MAXORD=12;
const owned=k=>isW(k)?S.p.weapons.filter(w=>w.t===wT(k)).length:S.p.inv[k];
const p2=v=>v.toFixed(2);
function mkBook(k){const o=S.mk[k],L=liq(k),a=[],b=[];for(let i=0;i<6;i++){const q=()=>Math.max(1,Math.round(L*(.5+i*.35)*rr(.6,1.4)));
  a.push([o.m*(1.015+i*.02),q()]);b.push([o.m*(.985-i*.02),q()]);}o.a=a;o.b=b;}
function mkTarget(k){return mkBase(k)*S.mk[k].trend*(1+(WARF[k]||0)*Math.min(1,S.battles.length/40)*.5);}
function mkMove(k){const o=S.mk[k];o.m=clamp(o.m*Math.exp(.025*(R()+R()+R()-1.5)+.03*Math.log(mkTarget(k)/o.m)),mkBase(k)*.3,mkBase(k)*4);o.hist.push(+o.m.toFixed(3));if(o.hist.length>HIST)o.hist.shift();mkBook(k);}
function mkInit(){S.mk={};S.orders=S.orders||[];S.nextOid=S.nextOid||1;S.p.cost=S.p.cost||{};
  MKEYS.forEach(k=>{S.mk[k]={m:mkBase(k)*rr(.85,1.15),trend:rr(.85,1.15),hist:[],vol:0};for(let i=0;i<72;i++)mkMove(k);});}
function mkTick(){
  MKEYS.forEach(k=>{S.mk[k].vol*=.9;mkMove(k);});
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
function give(k,q){if(isW(k)){for(let i=0;i<q;i++)addWeapon(wT(k));}else S.p.inv[k]+=q;}
function take(k,q){const p=S.p;if(!isW(k)){p.inv[k]-=q;return 1;}let f=0;
  for(let i=0;i<q;i++){const c=p.weapons.filter(w=>w.t===wT(k)).sort((a,b)=>(a.id===p.eq)-(b.id===p.eq)||b.dur-a.dur)[0];f+=c.dur/WPN[c.t].dur;p.weapons=p.weapons.filter(w=>w!==c);
    if(p.eq===c.id){const nx=p.weapons.slice().sort((a,b)=>b.t-a.t)[0];p.eq=nx?nx.id:null;}}return f/q;}
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
  if(side==='buy'){p.money-=qt.total;give(k,q);addCost(k,q,qt.total);toast(`Nupirkta ${q}× ${mkName(k)} už ₡${p2(qt.total)}`);}
  else{const f=take(k,q),net=qt.total*f*(1-FEE);p.money+=net;myC().treasury+=qt.total*f*FEE;subCost(k,q);toast(`Parduota ${q}× ${mkName(k)} už ₡${p2(net)}`);}
  eat_book(k,side,q);return true;}
function placeOrder(k,side,q,price){const p=S.p;q=Math.floor(q);price=+(+price).toFixed(2);
  if(isW(k))return toast('Ginklams galimi tik momentiniai sandoriai.');
  if(q<1||!(price>0))return toast('Įvesk kainą ir kiekį.');if(S.orders.length>=MAXORD)return toast(`Daugiausia ${MAXORD} užsakymų vienu metu.`);
  if(side==='buy'){if(p.money<q*price)return toast('Nepakanka pinigų.');p.money-=q*price;}else{if(owned(k)<q)return toast('Neturi tiek prekių.');take(k,q);}
  S.orders.push({id:S.nextOid++,k,side,qty:q,done:0,price,tick:S.tick});toast('Užsakymas pateiktas. Jis įvykdomas, kai rinka pasiekia tavo kainą.',3200);return true;}
function fillOrder(o,f){const p=S.p,v=f*o.price;o.done+=f;S.mk[o.k].vol+=f;
  if(o.side==='buy'){give(o.k,f);addCost(o.k,f,v);}else{p.money+=v*(1-FEE);myC().treasury+=v*FEE;subCost(o.k,f);}}
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
function declareWar(a,b){if(atWar(a,b)||a===b)return;S.wars.push({a,b,since:S.tick});addNews(`⚔ ${C(a).short} paskelbė karą šaliai ${C(b).short}!`,near(a,b));}
function makePeace(a,b,quiet){S.wars=S.wars.filter(w=>!((w.a===a&&w.b===b)||(w.a===b&&w.b===a)));if(!quiet)addNews(`🕊 ${C(a).short} ir ${C(b).short} pasirašė taiką.`,near(a,b));}
// battle: sides 0 = attacker, 1 = defender; first to RWIN rounds, a round is won at RP points
const sideC=(b,s)=>s?b.def:b.att;
const bonus=(b,s)=>b.bon[s]+(C(sideC(b,s)).mobil>S.tick?.3:0);
function startBattle(att,region){
  if(S.battles.some(b=>b.region===region))return;
  const def=S.owner[region];if(def===att)return;
  let adj=0;M.regions[region].adj.forEach(a=>{if(S.owner[a]===att)adj++;});
  S.battles.push({id:S.nextBattleId++,region,att,def,rw:[0,0],pts:[0,0],dmg:[0,0],tot:[0,0],pl:[0,0],round:1,start:S.tick,
    bon:[Math.min(.2,adj*.05),C(def).cap===region?.55:.25],feed:[[],[]],gain:null});
  if(near(att,def))addNews(`🔥 Prasidėjo mūšis dėl ${M.regions[region].name}: ${C(att).short} puola ${C(def).short}.`,true);
}
function pushFeed(b,s,e){b.feed[s].unshift(e);if(b.feed[s].length>5)b.feed[s].length=5;}
function resolveBattle(b,win){
  const reg=M.regions[b.region],p=S.p;
  if(b.pl[0]||b.pl[1]){const mine=b.pl[win];
    if(mine>0){const reward=Math.round(15+mine/40);p.money+=reward;p.st.won++;p.st.money+=reward;let t=`Laimėjai mūšį dėl ${reg.name}! +₡${reward}`;
      if(mine>=400){p.inv.crate++;p.st.crates++;t+=' ir 📦';}toast(t);}
    else toast(`Mūšis dėl ${reg.name} pralaimėtas.`);}
  if(win===0&&S.owner[b.region]===b.def&&C(b.att).alive){
    const old=b.def;S.owner[b.region]=b.att;rebuildOwn();
    addNews(`🏴 ${C(b.att).short} užėmė regioną „${reg.name}“.`,near(b.att,old));
    if(C(old).cap===b.region){const rs=OWN[old];if(rs.length){C(old).cap=rs.reduce((m,r)=>M.regions[r].cells>M.regions[m].cells?r:m,rs[0]);}}
    C(b.att).treasury+=150;
    if(OWN[old].length===0){C(old).alive=false;S.wars=S.wars.filter(w=>w.a!==old&&w.b!==old);S.battles=S.battles.filter(x=>x.att!==old);
      addNews(`☠ ${C(old).name}: valstybė nustojo egzistavusi. Ją užkariavo ${C(b.att).short}.`,true);
      if(p.country===old){p.country=b.att;p.president=false;C(old).playerPres=false;S.election.candidate=false;addNews(`${p.name} tapo šalies ${C(b.att).short} piliečiu.`,true);showModal('defeat');}
    }
    renderTerritory();
  } else if(near(b.att,b.def))addNews(`🛡 ${C(b.def).short} apgynė ${reg.name} nuo ${C(b.att).short}.`,true);
}
function botDmg(ci){return power(ci)*rr(.6,1.4)*S.bots.power*(ci===S.p.country?S.bots.ally:1)*(ov(ci).pw||1);}
function battleTick(b){
  for(let s=0;s<2;s++){const ci=sideC(b,s),d=botDmg(ci)*(1+bonus(b,s));b.dmg[s]+=d;b.tot[s]+=d;
    const crit=R()<.15,part=d*rr(.35,.75);pushFeed(b,s,{n:pick(FIRST),w:1+Math.floor(R()*R()*3),d:Math.round(part),c:crit});
    if(R()<.6)pushFeed(b,s,{n:pick(FIRST),w:1+Math.floor(R()*R()*3),d:Math.round(d-part),c:false});}
  const sum=b.dmg[0]+b.dmg[1],lead=b.dmg[0]>b.dmg[1]?0:1,sh=b.dmg[lead]/(sum||1),g=sh>.8?3:sh>.62?2:1;
  b.pts[lead]+=g;b.gain={s:lead,g};
  if(b.pts[lead]>=RP){b.rw[lead]++;if(b.rw[lead]>=RWIN)return lead;
    b.round++;b.pts=[0,0];b.dmg=[0,0];b.gain=null;
    if(near(b.att,b.def))addNews(`Raundą dėl ${M.regions[b.region].name} laimėjo ${C(sideC(b,lead)).short} (${b.rw[0]}:${b.rw[1]}).`,true);}
  return -1;
}
function step(){
  if(S.over)return;
  S.tick++;const p=S.p,B=S.bots;
  p.hp=Math.min(p.maxHp,p.hp+2);p.en=Math.min(p.maxEn,p.en+3);
  S.countries.forEach((c,i)=>{if(c.alive)c.treasury+=OWN[i].length*c.tax*0.3;});
  const done=[];
  for(const b of S.battles){if(S.owner[b.region]!==b.def||!C(b.att).alive){done.push([b,-2]);continue;}const w=battleTick(b);if(w>=0)done.push([b,w]);}
  if(done.length){const ids=new Set(done.map(d=>d[0].id));S.battles=S.battles.filter(b=>!ids.has(b.id));done.forEach(([b,w])=>{if(w>=0)resolveBattle(b,w);});}
  if(S.tick%2===0){const byC={};S.wars.forEach(w=>{(byC[w.a]=byC[w.a]||[]).push(w.b);(byC[w.b]=byC[w.b]||[]).push(w.a);});
    const busy=new Set(S.battles.map(b=>b.region));
    for(const k in byC){const ci=+k,c=C(ci);if(!c.alive||ov(ci).mode==='frozen')continue;
      const mine=S.battles.filter(b=>b.att===ci).length,cap=1+Math.floor(OWN[ci].length/9);
      if(mine>=cap||R()>.3*B.activity)continue;
      const en=byC[k],targets=[];OWN[ci].forEach(r=>M.regions[r].adj.forEach(a=>{if(en.includes(S.owner[a])&&!busy.has(a))targets.push(a);}));
      if(targets.length){const t=pick(targets);busy.add(t);startBattle(ci,t);}}}
  mkTick();
  if(S.tick%24===0)newDay();
  checkVictory();
  if(S.tick%5===0)save();
  refresh();
}
function newDay(){
  const p=S.p,day=S.tick/24,B=S.bots;
  const prod={};p.companies.forEach(c=>{const d=COMPANY[c.type];prod[d.out]=(prod[d.out]||0)+d.per*c.lvl;});
  const pk=Object.keys(prod);pk.forEach(k=>p.inv[k]+=prod[k]);
  if(pk.length)toast('Įmonės pagamino: '+pk.map(k=>`${ITEMS[k].i} ${prod[k]}`).join(' '));
  if(p.president)p.money+=40;
  mkDay();
  S.countries.forEach((c,ci)=>{if(!c.alive||c.playerPres)return;
    const m=ov(ci).mode,wars=S.wars.filter(w=>w.a===ci||w.b===ci);
    if(wars.length===0&&m!=='peaceful'&&m!=='frozen'&&S.wars.length<B.maxWars&&R()<.022*B.aggr*(m==='aggressive'?4:1)){
      const nb=neighbors(ci).filter(n=>C(n).alive);
      if(nb.length){nb.sort((x,y)=>power(x)-power(y));const t=R()<.7?nb[0]:pick(nb);if(power(ci)>power(t)*.8||m==='aggressive')declareWar(ci,t);}}
    wars.forEach(w=>{const other=w.a===ci?w.b:w.a;if(C(other).playerPres)return;const age=S.tick-w.since;
      if(age>24*4&&R()<.16*B.peace*(m==='peaceful'?3:m==='aggressive'?.3:1))makePeace(ci,other);});
    if(c.treasury>1200&&R()<.4&&wars.length){c.treasury-=500;c.mobil=S.tick+48;}
  });
  if(day%ELECTION_EVERY===0)election();
}
function election(){
  const p=S.p;
  S.countries.forEach((c,ci)=>{if(!c.alive)return;
    if(ci===p.country){
      const bots=[botName(),botName()].map(n=>({n,v:Math.round(rr(15,60))}));
      const all=bots.slice();if(S.election.candidate)all.push({n:p.name,v:Math.round(10+p.lvl*4+p.fame*.5+rr(0,20)),me:true});
      all.sort((a,b)=>b.v-a.v);const w=all[0],wasPres=p.president;
      p.president=!!w.me;c.playerPres=p.president;c.leader=w.n;
      addNews(`🗳 Rinkimai (${c.short}): laimėjo ${w.n} (${w.v} balsų).`,true);
      S.election.last=all;S.election.candidate=false;
      if(p.president)showModal('elected');else if(wasPres)toast('Tavo kadencija baigėsi.');
    } else if(R()<.4)c.leader=botName();
  });
}
function checkVictory(){
  if(!S.over&&OWN[S.p.country].length===S.owner.length){S.over=true;save();showModal('victory');}
}

// ---------- player actions ----------
function gainXp(n){const p=S.p;p.xp+=n;while(p.xp>=p.lvl*50){p.xp-=p.lvl*50;p.lvl++;p.maxHp+=5;p.maxEn+=5;p.hp=p.maxHp;p.en=p.maxEn;toast(`Naujas lygis: ${p.lvl}!`);}}
const has=c=>Object.entries(c).every(([k,v])=>S.p.inv[k]>=v);
const pay=c=>Object.entries(c).forEach(([k,v])=>S.p.inv[k]-=v);
function addWeapon(t){const w={id:S.nextWid++,t,dur:WPN[t].dur};S.p.weapons.push(w);if(!eqW())S.p.eq=w.id;return w;}
function hitDmg(b,s){const p=S.p,w=eqW(),am=p.useAmmo&&p.inv.ammo>0;
  return (40+p.str*4)*(1+p.lvl*.05)*(w?WPN[w.t].mul:1)*(am?1.2:1)*(b?1+bonus(b,s):1);}
const A={
  work(){const p=S.p;if(p.en<10)return toast('Per mažai energijos.');p.en-=10;const w=Math.round(6+p.lvl*1.2);p.money+=w;myC().treasury+=w*.5;gainXp(3);
    const k=pick(RAWS);p.inv[k]++;toast(`Uždirbai ₡${w} ir ${ITEMS[k].i} ${ITEMS[k].n}`);},
  train(){const p=S.p;if(p.en<15)return toast('Per mažai energijos.');p.en-=15;p.str+=1;gainXp(4);toast(`Jėga: ${p.str}`);},
  eat(k){const p=S.p;if(!k)k=p.inv.bread>0?'bread':p.inv.cfish>0?'cfish':null;if(!k||p.inv[k]<1)return toast('Neturi maisto. Pasigamink arba nusipirk rinkoje.');
    if(p.hp>=p.maxHp)return toast('Sveikata pilna.');p.inv[k]--;p.hp=Math.min(p.maxHp,p.hp+ITEMS[k].heal);},
  hit(id,s){const p=S.p,b=S.battles.find(x=>x.id===id);if(!b)return;if(p.hp<10)return toast('Per mažai sveikatos. Pavalgyk.');
    let total=0,n=0,anyCrit=false;
    for(let i=0;i<p.mult&&p.hp>=10;i++){const w=eqW(),am=p.useAmmo&&p.inv.ammo>0,crit=R()<(w?WPN[w.t].crit:.03);
      const d=Math.round(hitDmg(b,s)*rr(.9,1.1)*(crit?2:1));p.hp-=10;if(am)p.inv.ammo--;
      if(w&&--w.dur<=0){p.weapons=p.weapons.filter(x=>x!==w);const nx=p.weapons.slice().sort((a,c)=>c.t-a.t)[0];p.eq=nx?nx.id:null;toast(`${WPN[w.t].n} susidėvėjo.`);}
      b.dmg[s]+=d;b.tot[s]+=d;b.pl[s]+=d;p.dmg+=d;p.st.hits++;total+=d;n++;anyCrit=anyCrit||crit;
      pushFeed(b,s,{n:p.name,w:w?w.t:0,d,c:crit,me:1});
      if(sideC(b,s)===p.country)p.fame+=d/120;gainXp(2);}
    if(n>1||!tabIsBattle())toast(`${anyCrit?'💥 ':''}${fmt(total)} žalos`);},
  craft(id){const r=RECIPES.find(x=>x.id===id);if(!has(r.cost))return toast('Trūksta žaliavų: '+costStr(r.cost));pay(r.cost);
    if(r.wpn){addWeapon(r.wpn);toast(`Pagaminta: ${WPN[r.wpn].n}`);}else{for(const k in r.out)S.p.inv[k]+=r.out[k];const k=Object.keys(r.out)[0];toast(`Pagaminta: ${r.out[k]}× ${ITEMS[k].n}`);}gainXp(1);},
  dismantle(id){const p=S.p,w=p.weapons.find(x=>x.id===id);if(!w)return;const back=Math.max(1,Math.floor(WPN[w.t].cost.steel*.5*w.dur/WPN[w.t].dur));
    p.weapons=p.weapons.filter(x=>x!==w);if(p.eq===id){const nx=p.weapons.slice().sort((a,c)=>c.t-a.t)[0];p.eq=nx?nx.id:null;}p.inv.steel+=back;toast(`Išardyta. +${back} ${ITEMS.steel.n}`);},
  equip(id){S.p.eq=S.p.eq===id?null:id;},
  openCrate(){const p=S.p;if(p.inv.crate<1)return;p.inv.crate--;const got=[];const m=Math.round(rr(20,80));p.money+=m;got.push('₡'+m);
    for(let i=0;i<2;i++){const k=pick(RAWS.concat(['steel'])),q=Math.round(rr(3,8));p.inv[k]+=q;got.push(`${q}× ${ITEMS[k].n}`);}
    const a=Math.round(rr(10,30));p.inv.ammo+=a;got.push(`${a}× ${ITEMS.ammo.n}`);
    const r=R();if(r<.04){addWeapon(3);got.push(WPN[3].n);}else if(r<.16){addWeapon(2);got.push(WPN[2].n);}
    toast('📦 '+got.join(', '),4000);},
  buyCo(type){const d=COMPANY[type];if(S.p.money<d.cost)return toast('Nepakanka pinigų.');S.p.money-=d.cost;S.p.companies.push({type,lvl:1});toast(`Įsigijai: ${d.name}`);},
  upCo(i){const c=S.p.companies[i],cost=COMPANY[c.type].cost*c.lvl;if(S.p.money<cost)return toast('Nepakanka pinigų.');S.p.money-=cost;c.lvl++;},
  run(){if(S.p.money<50)return toast('Registracija kainuoja ₡50.');S.p.money-=50;S.election.candidate=true;toast('Užsiregistravai rinkimuose!');},
  war(t){if(S.p.president)declareWar(S.p.country,t);},
  peace(t){if(!S.p.president)return;const ok=power(t)<power(S.p.country)*1.1||R()<.5;if(ok)makePeace(S.p.country,t);else{addNews(`${C(t).short} atmetė taikos pasiūlymą.`,true);toast('Taika atmesta.');}},
  mobil(){const c=myC();if(!S.p.president||c.treasury<500)return toast('Ižde trūksta ₡500.');c.treasury-=500;c.mobil=S.tick+48;toast('Mobilizacija 2 dienoms: +30% žalos.');},
  attack(r){if(S.p.president)startBattle(S.p.country,r);},
  emigrate(ci){if(ci===S.p.country||!C(ci).alive)return;if(S.p.money<100)return toast('Emigracija kainuoja ₡100.');if(S.p.president)return toast('Prezidentas negali emigruoti.');S.p.money-=100;S.p.country=ci;S.election.candidate=false;addNews(`${S.p.name} emigravo į šalį ${C(ci).short}.`,true);focusCountry(ci);},
  worldPeace(){S.wars=[];S.battles=[];addNews('🕊 Visame pasaulyje paskelbtos paliaubos.',true);},
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
  g.addColorStop(0,'#173444');g.addColorStop(1,'#0b1820');cx.fillStyle=g;cx.fillRect(0,0,W,H);
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

// ---------- UI ----------
let tab=null,botSel=-1,battleId=0,invView='main',invSel=null,bFilter='all',mFilter='all';
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
   <div class="book"><div><small class="muted">Parduoda (kaina · kiekis)</small>${bk(o.a,'ask')}</div><div><small class="muted">Perka (kaina · kiekis)</small>${bk(o.b,'bid')}</div></div>`;
  tradeSum();}
function tradeSum(){const el=$('#tSum');if(!el)return;const k=T.k,p=S.p,mx=tMax(),sl=$('#tSlide'),go=$('#tGo');
  sl.max=Math.max(1,mx);sl.value=Math.min(T.qty,mx);sl.disabled=mx<1;
  let total,avg,warn='';const q=T.qty;
  if(T.market){const qt=quote(k,T.side,Math.min(q,depth(k,T.side)));total=qt.total;avg=qt.avg||T.price;}else{total=q*T.price;avg=T.price;}
  const fee=T.side==='sell'?total*FEE:0,after=T.side==='buy'?p.money-total:p.money+total-fee;
  if(q>mx)warn=T.side==='buy'?'Tiek nupirkti negali: trūksta pinigų arba pasiūlos.':'Tiek parduoti negali.';
  else if(!T.market&&q>0){const g=T.side==='buy'?T.price>=S.mk[k].a[0][0]:T.price<=S.mk[k].b[0][0];warn=g?'Kaina siekia rinką, užsakymas bus įvykdytas artimiausią valandą.':'Užsakymas lauks, kol rinka pasieks šią kainą.';}
  el.innerHTML=`<dl class="kv"><dt>Vidutinė kaina</dt><dd>₡${p2(avg)}</dd><dt>${T.side==='buy'?'Sumokėsi':'Gausi'}</dt><dd><b>₡${p2(total-fee)}</b></dd>${fee?`<dt>Mokestis ${FEE*100}%</dt><dd>₡${p2(fee)}</dd>`:''}<dt>Likutis po sandorio</dt><dd>₡${p2(after)}</dd><dt>Daugiausia galima</dt><dd>${fmt(mx)}</dd></dl>${warn?`<div class="muted">${warn}</div>`:''}`;
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
   <div class="muted">${cname(oi)}${oi!==g.home?' (okupuota)':''} · gyventojų ${fmt(g.pop)} · lyderis ${esc(o.leader)}${o.playerPres?' (tu)':''}</div>`;
  if(b)h+=battleCard(b,true);
  else if(oi!==p.country&&atWar(p.country,oi)){
    if(p.president&&[...g.adj].some(a=>S.owner[a]===p.country))h+=`<button class="btn red" data-act="attack" data-r="${r}">Pulti regioną</button>`;
    else h+=`<div class="muted">Tavo šalis kariauja su šia šalimi.</div>`;}
  el.innerHTML=h;el.dataset.r=r;
}
// compact battle card for lists and the map
function battleCard(b,wide){
  const g=M.regions[b.region];
  return `<button class="bcard${wide?' wide':''}" data-act="openBattle" data-b="${b.id}">
   <span class="bname">${C(b.def).cap===b.region?'★ ':''}${esc(g.name)}</span>
   <span class="bscore">${flagBox(b.att)}<b>${b.rw[0]}</b><i>⚔</i><b>${b.rw[1]}</b>${flagBox(b.def)}</span>
   <span class="bpts"><span class="pa">▲ ${b.pts[0]}</span><span class="muted">R${b.round}</span><span class="pd">${b.pts[1]} ▲</span></span>
   <span class="split"><i style="width:${pct(b.dmg[0],b.dmg[1])}%;background:var(--att)"></i><i style="flex:1;background:var(--def)"></i></span>
   <span class="bdmg"><span>🔥 ${fmt(b.dmg[0])}</span><span>${fmt(b.dmg[1])} 🔥</span></span></button>`;
}
function feedRows(b,s){
  const rows=b.feed[s].map(e=>`<div class="fr${e.c?' crit':''}${e.me?' me':''}"><span class="av" style="background:${col(sideC(b,s))}">${esc(e.n[0])}</span><span class="fn">${esc(e.n)}</span>${e.w?`<span class="fw">${wico(e.w)}</span>`:''}<span class="fd">🔥 ${fmt(e.d)}${e.c?'!':''}</span></div>`);
  while(rows.length<5)rows.push('<div class="fr empty"></div>');return rows.join('');
}
function battleView(b){
  const p=S.p,g=M.regions[b.region],pa=pct(b.dmg[0],b.dmg[1]),w=eqW(),am=p.useAmmo&&p.inv.ammo>0;
  const hills=s=>`<div class="hill ${s?'d':'a'}"><i style="width:${Math.min(100,b.pts[s]/RP*100)}%"></i></div>`;
  return `<div class="feeds"><div class="feed l">${feedRows(b,0)}</div><div class="fmid"><span class="muted">Raundas</span><b>${b.round}</b><span class="muted">iš ${RWIN*2-1}</span></div><div class="feed r">${feedRows(b,1)}</div></div>
   <div class="btitle">${C(b.def).cap===b.region?'<span class="cap">★</span> ':''}${esc(g.name)} <button class="btn sm alt" data-act="goto" data-r="${b.region}" aria-label="Rodyti žemėlapyje">⌖</button></div>
   <div class="bbig">${flagBox(b.att)}<b>${b.rw[0]}</b><i>⚔</i><b>${b.rw[1]}</b>${flagBox(b.def)}</div>
   <div class="tickrow"><span class="muted" id="nextTick"></span>${b.gain?`<span class="gain ${b.gain.s?'d':'a'}">▲ +${b.gain.g} ${esc(C(sideC(b,b.gain.s)).short)}</span>`:'<span class="muted">Raundas prasideda</span>'}</div>
   <div class="ptsrow"><span class="pa">▲ ${b.pts[0]}</span><span class="muted">iki ${RP} taškų</span><span class="pd">${b.pts[1]} ▲</span></div>
   <div class="hills">${hills(0)}${hills(1)}</div>
   <div class="dbar"><div class="a" style="width:${clamp(pa,12,88)}%"><small>${pa.toFixed(1)}%</small><b>🔥 ${fmt(b.dmg[0])}</b></div><div class="d"><small>${(100-pa).toFixed(1)}%</small><b>🔥 ${fmt(b.dmg[1])}</b></div></div>
   <div class="sides">
     <div class="sidecol"><div class="row"><span class="grow">${cname(b.att)}</span><span class="bon">🔥 +${Math.round(bonus(b,0)*100)}%</span></div>
       <button class="fight a" data-act="hit" data-b="${b.id}" data-s="0" ${p.hp<10?'disabled':''}>⚔ PULTI<small>−${10*p.mult} ❤ · ~${fmt(hitDmg(b,0)*p.mult)}</small></button>${b.pl[0]?`<div class="muted">Tavo žala: ${fmt(b.pl[0])}</div>`:''}</div>
     <div class="sidecol"><div class="row"><span class="grow">${cname(b.def)}</span><span class="bon">🔥 +${Math.round(bonus(b,1)*100)}%</span></div>
       <button class="fight d" data-act="hit" data-b="${b.id}" data-s="1" ${p.hp<10?'disabled':''}>🛡 GINTI<small>−${10*p.mult} ❤ · ~${fmt(hitDmg(b,1)*p.mult)}</small></button>${b.pl[1]?`<div class="muted">Tavo žala: ${fmt(b.pl[1])}</div>`:''}</div>
   </div>
   <div class="box"><div class="row"><span class="grow">❤ ${Math.floor(p.hp)}/${p.maxHp} · 🍞 ${p.inv.bread} · 🍣 ${p.inv.cfish}</span><button class="btn sm alt" data-act="eat">Valgyti</button></div>
     <div class="row"><span class="grow loadout">${w?`<span class="fw">${wico(w.t)}</span> ${WPN[w.t].n} ×${WPN[w.t].mul} <span class="muted">(${w.dur})</span>`:'<span class="muted">Be ginklo</span>'}</span>
       <label class="chk"><input type="checkbox" id="useAmmo" ${p.useAmmo?'checked':''}> Šoviniai (${p.inv.ammo})</label></div>
     <div class="row"><span class="grow muted">Smūgių vienu paspaudimu</span>${[1,3,5].map(n=>`<button class="chip${p.mult===n?' on':''}" data-act="mult" data-i="${n}">×${n}</button>`).join('')}</div></div>
   <div class="muted">Pusė, kuri raunde padarė daugiau žalos, kas valandą gauna 1–3 taškus. ${RP} taškų laimi raundą, ${RWIN} raundai laimi mūšį. Bendra žala: ${fmt(b.tot[0])} prieš ${fmt(b.tot[1])}.</div>`;
}
function openSheet(t){tab=t;$('#rcard').hidden=true;$('#sheet').hidden=false;$('#sheet').classList.toggle('tall',t==='battle'||t==='inv'||t==='trade'||t==='market');
  document.querySelectorAll('#tabs button').forEach(b=>b.classList.toggle('on',b.dataset.t===(t==='battle'?'battles':t==='trade'?'market':t)));$('#sheetBody').scrollTop=0;renderSheet();}
function closeSheet(){tab=null;$('#sheet').hidden=true;document.querySelectorAll('#tabs button').forEach(b=>b.classList.remove('on'));}
$('#sheetClose').onclick=()=>tab==='battle'?openSheet('battles'):tab==='trade'?openSheet('market'):closeSheet();
document.querySelectorAll('#tabs button').forEach(b=>b.onclick=()=>{if(!S||S.__preview)return;invView='main';tab===b.dataset.t?closeSheet():openSheet(b.dataset.t);});
const slider=(k,label,min,max,stepv)=>`<div class="sl"><div class="row"><label for="bot_${k}">${label}</label><output id="out_${k}">${fmtBot(k,S.bots[k])}</output></div><input type="range" id="bot_${k}" data-bot="${k}" min="${min}" max="${max}" step="${stepv}" value="${S.bots[k]}"></div>`;
const fmtBot=(k,v)=>k==='maxWars'?String(v):Math.round(v*100)+'%';
const tile=(k,sel)=>{const it=ITEMS[k],n=S.p.inv[k];return `<button class="tile c-${it.c}${sel?' on':''}${n?'':' zero'}" data-act="selItem" data-i="${k}"><span class="ti">${ico(k)}</span>${it.d?`<span class="te">${it.d}</span>`:''}<span class="tn">${fmt(n)}</span></button>`;};
function renderInv(){
  const p=S.p;let h='';
  if(invView==='craft'){
    h+=`<button class="btn alt" data-act="invView" data-i="main">← Inventorius</button>`;
    RECIPES.forEach(r=>{const ok=has(r.cost),nm=r.wpn?WPN[r.wpn].n:Object.entries(r.out).map(([k,v])=>`${v}× ${ITEMS[k].n}`).join(''),ic=r.wpn?`<span class="fw big">${wico(r.wpn)}</span>`:`<span class="ti sm">${ico(Object.keys(r.out)[0])}</span>`;
      h+=`<div class="box"><div class="row">${ic}<div class="grow"><b>${nm}</b>${r.wpn?` <span class="muted">×${WPN[r.wpn].mul} žalos, ${WPN[r.wpn].dur} smūgių, kritinis ${Math.round(WPN[r.wpn].crit*100)}%</span>`:''}
        <div class="muted">${Object.entries(r.cost).map(([k,v])=>`<span class="${p.inv[k]>=v?'':'lack'}">${ITEMS[k].i||''} ${v} ${ITEMS[k].n} (${p.inv[k]})</span>`).join(' · ')}</div></div>
        <button class="btn sm" data-act="craft" data-i="${r.id}" ${ok?'':'disabled'}>Gaminti</button></div></div>`;});
    return h;
  }
  if(invView==='dismantle'){
    h+=`<button class="btn alt" data-act="invView" data-i="main">← Inventorius</button><div class="muted">Išardęs ginklą atgauni dalį plieno. Kuo labiau susidėvėjęs, tuo mažiau.</div>`;
    if(!p.weapons.length)h+=`<div class="muted">Neturi ginklų.</div>`;
    p.weapons.forEach(w=>h+=`<div class="box"><div class="row"><span class="fw big">${wico(w.t)}</span><div class="grow"><b>${WPN[w.t].n}</b><div class="muted">Likę ${w.dur}/${WPN[w.t].dur} smūgių${p.eq===w.id?' · uždėtas':''}</div></div><button class="btn sm red" data-act="dismantle" data-i="${w.id}">Ardyti</button></div></div>`);
    return h;
  }
  h+=`<div class="row"><button class="btn grow" data-act="invView" data-i="craft">🛠 GAMINTI</button><button class="btn alt grow" data-act="invView" data-i="dismantle">🔧 ARDYTI</button></div>`;
  h+=`<h4 class="sec">DAIKTAI</h4><div class="tiles">${['crate','cfish','bread','ammo'].map(k=>tile(k,invSel===k)).join('')}${Object.keys(ITEMS).filter(k=>ITEMS[k].c==='raw').map(k=>tile(k,invSel===k)).join('')}</div>`;
  if(invSel&&ITEMS[invSel]){const it=ITEMS[invSel],k=invSel;let act='';
    if(it.heal)act=`<button class="btn sm" data-act="eatItem" data-i="${k}" ${p.inv[k]?'':'disabled'}>Valgyti</button>`;
    if(k==='crate')act=`<button class="btn sm" data-act="openCrate" ${p.inv.crate?'':'disabled'}>Atidaryti</button>`;
    if(k==='ammo')act=`<label class="chk"><input type="checkbox" id="useAmmo" ${p.useAmmo?'checked':''}> Naudoti mūšyje</label>`;
    h+=`<div class="box"><div class="row"><div class="grow"><b>${it.n}</b> <span class="muted">× ${fmt(p.inv[k])}</span><div class="muted">${it.d||'Žaliava gamybai'}${S.mk[k]?` · rinkoje ₡${p2(S.mk[k].m)}`:''}</div></div>${act}
      ${S.mk[k]?`<button class="btn sm alt" data-act="trade" data-i="${k}" data-s="sell">Į rinką</button>`:''}</div></div>`;}
  h+=`<h4 class="sec">GINKLAI</h4>`;
  if(!p.weapons.length)h+=`<div class="muted">Neturi ginklų. Kovoji plikomis rankomis, kol pasigaminsi naują.</div>`;
  h+=`<div class="tiles w">${p.weapons.slice().sort((a,b)=>b.t-a.t).map(w=>`<button class="tile wt${p.eq===w.id?' on':''}" data-act="equip" data-i="${w.id}">${p.eq===w.id?'<span class="eqb">Uždėtas</span>':''}<span class="fw big">${wico(w.t)}</span><span class="te">×${WPN[w.t].mul}</span><span class="dur"><i style="width:${w.dur/WPN[w.t].dur*100}%;background:${WPN[w.t].col}"></i></span><span class="tn">${w.dur}</span></button>`).join('')}</div>
   <div class="muted">Paspausk ginklą, kad jį uždėtum arba nuimtum. Vienas smūgis sunaudoja vieną ginklo patvarumo tašką ir vieną šovinį.</div>`;
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
  if(tab==='work'){title='Darbas ir įmonės';
    h+=`<div class="box"><h4>Darbas</h4><div class="muted">10⚡ → ₡${Math.round(6+p.lvl*1.2)} ir atsitiktinė žaliava.</div><button class="btn" data-act="work" ${p.en<10?'disabled':''}>Dirbti</button></div>
      <div class="box"><h4>Treniruotė</h4><div class="muted">15⚡ → +1 jėga. Dabar jėga: <b>${p.str}</b></div><button class="btn" data-act="train" ${p.en<15?'disabled':''}>Treniruotis</button></div>
      <div class="box"><h4>Karys</h4><dl class="kv"><dt>Vardas</dt><dd>${esc(p.name)}</dd><dt>Lygis</dt><dd>${p.lvl} (${p.xp}/${p.lvl*50} XP)</dd><dt>Jėga</dt><dd>${p.str}</dd><dt>Bendra žala</dt><dd>${fmt(p.dmg)}</dd><dt>Šlovė</dt><dd>${Math.round(p.fame)}</dd></dl></div>
      <h4 class="sec">TAVO ĮMONĖS</h4>`;
    if(!p.companies.length)h+=`<div class="muted">Dar neturi įmonių. Jos gamina žaliavas kiekvieną dieną 00:00.</div>`;
    p.companies.forEach((c,i)=>{const d=COMPANY[c.type];h+=`<div class="box"><div class="row"><div class="grow"><b>${ITEMS[d.out].i} ${d.name}</b> · lygis ${c.lvl}<div class="muted">${d.per*c.lvl}× ${ITEMS[d.out].n} per dieną</div></div><button class="btn sm alt" data-act="upCo" data-i="${i}">Gerinti ₡${d.cost*c.lvl}</button></div></div>`;});
    h+=`<div class="box"><h4>Įsigyti įmonę</h4>`+Object.entries(COMPANY).map(([k,d])=>`<div class="row"><div class="grow">${ITEMS[d.out].i} ${d.name}<div class="muted">${d.per}× ${ITEMS[d.out].n} per dieną</div></div><button class="btn sm" data-act="buyCo" data-i="${k}">₡${d.cost}</button></div>`).join('')+`</div>`;
  }
  if(tab==='market'){title='Rinka';
    const F={all:()=>true,food:k=>mkCat(k)==='food',raw:k=>mkCat(k)==='raw',gear:k=>mkCat(k)==='gear',mine:k=>owned(k)>0};
    h+=`<div class="statstrip"><span>₡ ${fmt(p.money)}</span><span class="muted">Mokestis parduodant ${FEE*100}%</span></div>`;
    if(S.orders.length)h+=`<div class="box"><h4>Mano užsakymai (${S.orders.length})</h4>${S.orders.map(o=>`<div class="row"><span class="ti sm">${mkIcon(o.k)}</span><button class="grow linkrow" data-act="trade" data-i="${o.k}"><b class="${o.side==='buy'?'up':'dn'}">${o.side==='buy'?'Pirkti':'Parduoti'}</b> ${o.qty}× ${mkName(o.k)} po ₡${p2(o.price)}<div class="muted">įvykdyta ${o.done}/${o.qty} · rinkoje ₡${p2(S.mk[o.k].m)}</div></button><button class="btn sm alt" data-act="cancelOrder" data-i="${o.id}">Atšaukti</button></div>`).join('')}</div>`;
    h+=`<div class="chips">${[['all','Visos'],['food','Maistas'],['raw','Žaliavos'],['gear','Ginkluotė'],['mine','Turiu']].map(([k,n])=>`<button class="chip${mFilter===k?' on':''}" data-act="mFilter" data-i="${k}">${n}</button>`).join('')}</div>`;
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
  if(tab==='country'){title=me.short;
    const wars=S.wars.filter(w=>w.a===p.country||w.b===p.country).map(w=>w.a===p.country?w.b:w.a);
    const nextE=(Math.floor(S.tick/24/ELECTION_EVERY)+1)*ELECTION_EVERY*24;
    h+=`<div class="box"><div class="row">${sw(p.country,1)}<b class="grow">${cname(p.country)}</b></div><dl class="kv">
      <dt>Prezidentas</dt><dd>${esc(me.leader)}${p.president?' (tu)':''}</dd><dt>Regionai</dt><dd>${OWN[p.country].length}</dd><dt>Iždas</dt><dd>₡${fmt(me.treasury)}</dd><dt>Karinė galia</dt><dd>${fmt(power(p.country))}${me.mobil>S.tick?' 🔺 mobilizacija':''}</dd>
      <dt>Karai</dt><dd>${wars.length?wars.map(w=>esc(C(w).short)).join(', '):'nėra'}</dd></dl></div>`;
    h+=`<div class="box"><h4>Prezidento rinkimai</h4><div class="muted">Kiti rinkimai: ${timeStr(nextE)}. Balsai priklauso nuo lygio ir šlovės, kurią gauni kovodamas už savo šalį.</div>
      ${S.election.candidate?'<div>✔ Tu esi kandidatas.</div>':`<button class="btn" data-act="run">Kandidatuoti (₡50)</button>`}
      ${S.election.last?'<div class="muted">Praeiti rezultatai: '+S.election.last.map(c=>esc(c.n)+' '+c.v).join(' · ')+'</div>':''}</div>`;
    if(p.president){
      const nb=neighbors(p.country).filter(n=>C(n).alive);
      h+=`<div class="box"><h4>Prezidento valdžia</h4><div class="muted">Skelbk karą kaimynams, siūlyk taiką, mobilizuok kariuomenę. Kare gali pulti regioną paspaudęs jį žemėlapyje.</div>
        ${nb.map(n=>`<div class="row">${sw(n)}<span class="grow">${esc(C(n).short)} · galia ${fmt(power(n))}</span>${atWar(p.country,n)?`<button class="btn sm alt" data-act="peace" data-i="${n}">Siūlyti taiką</button>`:`<button class="btn sm red" data-act="war" data-i="${n}">Skelbti karą</button>`}</div>`).join('')}
        <button class="btn" data-act="mobil" ${me.treasury<500?'disabled':''}>Mobilizacija (₡500 iš iždo)</button></div>`;
    }
    h+=`<div class="box"><h4>Emigracija</h4><div class="muted">Pakeisk pilietybę už ₡100.</div><div class="row"><select id="emSel" class="grow" aria-label="Šalis">${optList(-1,p.country)}</select><button class="btn sm alt" data-act="emigrate">Emigruoti</button></div></div>`;
  }
  if(tab==='bots'){title='Botų valdymas';
    const alive=S.countries.filter(c=>c.alive);if(botSel<0||!C(botSel).alive)botSel=alive.find(c=>c.id!==p.country).id;
    const o=ov(botSel),bc=C(botSel),bw=S.wars.filter(w=>w.a===botSel||w.b===botSel).map(w=>w.a===botSel?w.b:w.a);
    h+=`<div class="box"><h4>Visi botai</h4>
      ${slider('aggr','Agresija (kaip dažnai skelbia karus)',0,4,.25)}
      ${slider('activity','Mūšių aktyvumas',0,3,.25)}
      ${slider('peace','Taikingumas (kaip greitai taikosi)',0,4,.25)}
      ${slider('power','Visų botų jėga mūšiuose',.25,3,.25)}
      ${slider('ally','Tavo šalies botų jėga',.25,3,.25)}
      ${slider('maxWars','Daugiausia karų vienu metu',0,80,1)}
      <div class="row"><button class="btn sm alt" data-act="worldPeace">Paliaubos visame pasaulyje</button><button class="btn sm alt" data-act="botsReset">Atstatyti</button></div></div>
     <div class="box"><h4>Viena šalis</h4><select id="botC" aria-label="Šalis">${optList(botSel,-1)}</select>
      <dl class="kv"><dt>Lyderis</dt><dd>${esc(bc.leader)}${bc.playerPres?' (tu)':''}</dd><dt>Regionai</dt><dd>${OWN[botSel].length}</dd><dt>Galia</dt><dd>${fmt(power(botSel))}</dd><dt>Iždas</dt><dd>₡${fmt(bc.treasury)}</dd><dt>Karai</dt><dd>${bw.length?bw.map(w=>esc(C(w).short)).join(', '):'nėra'}</dd></dl>
      <div class="row"><label for="botMode" class="grow">Elgesys</label><select id="botMode">${Object.entries(MODES).map(([k,v])=>`<option value="${k}" ${o.mode===k?'selected':''}>${v}</option>`).join('')}</select></div>
      <div class="row"><label for="botPw" class="grow">Jėga</label><select id="botPw">${[.25,.5,1,1.5,2,3].map(v=>`<option value="${v}" ${(o.pw||1)===v?'selected':''}>${v*100}%</option>`).join('')}</select></div>
      <div class="muted">Taikus neskelbia karų. Agresyvus puola net stipresnius. Užšaldytas nieko nepuola, tik ginasi.</div>
      <button class="btn sm alt" data-act="gotoC" data-i="${botSel}">Rodyti žemėlapyje</button></div>
     <div class="box"><h4>Stipriausios šalys</h4>${alive.slice().sort((a,b)=>OWN[b.id].length-OWN[a.id].length).slice(0,10).map((c,i)=>`<div class="row">${sw(c.id)}<span class="grow">${i+1}. ${esc(c.short)}</span><span class="muted">${OWN[c.id].length} reg. · ${MODES[ov(c.id).mode]}</span></div>`).join('')}
      <div class="muted">Gyvų šalių: ${alive.length} iš ${NC} · karų: ${S.wars.length} · mūšių: ${S.battles.length}</div></div>`;
  }
  if(tab==='more'){title='Žinios';
    const list=S.newsHot?S.news.filter(n=>n.hot):S.news;
    h+=`<label class="chk"><input type="checkbox" id="newsHot" ${S.newsHot?'checked':''}> Tik mano šalies naujienos</label>
     <div class="news">${list.slice(0,40).map(n=>`<div class="${n.hot?'hot':''}"><time>${timeStr(n.tick)}</time>${esc(n.t)}</div>`).join('')||'<span class="muted">Kol kas tylu.</span>'}</div>
     <div class="box"><h4>Žaidimas</h4><div class="muted">Progresas išsaugomas automatiškai šioje naršyklėje.</div>
     <div class="row"><button class="btn alt" data-act="saveNow">Išsaugoti dabar</button><button class="btn red" data-act="askReset">Naujas žaidimas</button></div>
     <div class="muted">Plieno Frontas · sukūrė <a href="https://github.com/nusikales" target="_blank" rel="noopener" style="color:var(--brass2)">Nusikales</a></div></div>`;
  }
  $('#sheetTitle').textContent=title;body.innerHTML=h;body.scrollTop=sc;tickLabel();if(tab==='trade')tradeLive();
  const on=(id,f)=>{const el=$('#'+id);if(el)el.onchange=()=>{f(el);save();renderSheet();};};
  on('tMarket',el=>{T.market=el.checked;if(!T.market)T.price=+p2(S.mk[T.k].m);});
  on('useAmmo',el=>S.p.useAmmo=el.checked);on('newsHot',el=>S.newsHot=el.checked);
  on('botC',el=>botSel=+el.value);
  const setOv=(k,v)=>{const o=Object.assign({mode:'auto',pw:1},S.bots.ov[botSel]);o[k]=v;if(o.mode==='auto'&&o.pw===1)delete S.bots.ov[botSel];else S.bots.ov[botSel]=o;};
  on('botMode',el=>setOv('mode',el.value));on('botPw',el=>setOv('pw',+el.value));
}
$('#sheetBody').addEventListener('input',e=>{const id=e.target.id;
  if(id==='tQty')return tSetQty(+e.target.value);
  if(id==='tSlide'){T.qty=+e.target.value;$('#tQty').value=T.qty;return tradeSum();}
  if(id==='tPrice'){T.price=Math.max(.01,+e.target.value||0);return tradeSum();}
  const k=e.target.dataset&&e.target.dataset.bot;if(!k)return;S.bots[k]=+e.target.value;$('#out_'+k).textContent=fmtBot(k,S.bots[k]);});
document.addEventListener('click',e=>{const t=e.target.closest('[data-act]');if(!t)return;const a=t.dataset.act;
  switch(a){
    case 'closeR':$('#rcard').hidden=true;sel=-1;break;
    case 'openBattle':battleId=+t.dataset.b;openSheet('battle');return;
    case 'tab':openSheet(t.dataset.i);return;
    case 'hit':A.hit(+t.dataset.b,+t.dataset.s);break;
    case 'mult':S.p.mult=+t.dataset.i;break;
    case 'bFilter':bFilter=t.dataset.i;break;
    case 'invView':invView=t.dataset.i;$('#sheetBody').scrollTop=0;break;
    case 'selItem':invSel=invSel===t.dataset.i?null:t.dataset.i;break;
    case 'eatItem':A.eat(t.dataset.i);break;case 'openCrate':A.openCrate();break;
    case 'craft':A.craft(t.dataset.i);break;case 'dismantle':A.dismantle(+t.dataset.i);break;case 'equip':A.equip(+t.dataset.i);break;
    case 'goto':{const g=M.regions[+t.dataset.r],r=cv.getBoundingClientRect();closeSheet();V.s=Math.max(V.s,2);V.x=r.width/2-g.lx*V.s;V.y=r.height/2-g.ly*V.s;sel=+t.dataset.r;showRegion(sel);break;}
    case 'gotoC':closeSheet();focusCountry(+t.dataset.i);break;
    case 'eat':A.eat();break;case 'work':A.work();break;case 'train':A.train();break;
    case 'trade':openTrade(t.dataset.i,t.dataset.s);return;
    case 'mFilter':mFilter=t.dataset.i;break;
    case 'cancelOrder':cancelOrder(+t.dataset.i);break;
    case 'tSide':T.side=t.dataset.i;T.qty=Math.min(T.qty,tMax());break;
    case 'tRange':T.range=+t.dataset.i;tradeLive();return;
    case 'tPick':if(isW(T.k))return;T.market=false;T.price=+(+t.dataset.i).toFixed(2);break;
    case 'tStep':T.price=Math.max(.01,+(T.price*(1+.01*t.dataset.i)+.01*t.dataset.i).toFixed(2));$('#tPrice').value=p2(T.price);tradeSum();return;
    case 'tQ':tSetQty(T.qty+ +t.dataset.i);return;
    case 'tPct':tSetQty(Math.floor(tMax()*t.dataset.i));return;
    case 'tGo':{const ok=T.market?tradeNow(T.k,T.side,T.qty):placeOrder(T.k,T.side,T.qty,T.price);if(ok)T.qty=0;break;}
    case 'buyCo':A.buyCo(t.dataset.i);break;case 'upCo':A.upCo(+t.dataset.i);break;
    case 'run':A.run();break;case 'war':A.war(+t.dataset.i);break;case 'peace':A.peace(+t.dataset.i);break;case 'mobil':A.mobil();break;
    case 'attack':A.attack(+t.dataset.r);break;case 'emigrate':A.emigrate(+$('#emSel').value);break;
    case 'worldPeace':A.worldPeace();break;case 'botsReset':A.botsReset();break;
    case 'saveNow':save();toast('Išsaugota.');break;
    case 'askReset':showModal('reset');break;
    case 'start':{const name=($('#pname').value||'').trim().slice(0,20)||'Karys',ci=+$('#pcountry').value;$('#modal').hidden=true;newGame(name,ci);focusCountry(ci);refresh(true);return;}
    case 'closeModal':$('#modal').hidden=true;break;
    case 'doReset':try{localStorage.removeItem(SAVE);}catch(_){}closeSheet();preview();showModal('new');return;
  }
  if(S&&!S.__preview){refresh(true);save();}
});
function showModal(kind){
  const m=$('#modal');m.hidden=false;let h='';
  if(kind==='new'){const lt=WORLD.findIndex(c=>c.a==='LT');
    h=`<h1>Plieno Frontas</h1><div class="muted">Vieno žaidėjo karo strategija tikrame pasaulio žemėlapyje. ${NC} šalis valdo botai. Dirbk, gamink ginklus, kovok mūšiuose, laimėk rinkimus ir vesk savo šalį į pergalę.</div>
     <label for="pname" class="muted">Tavo vardas</label><input type="text" id="pname" maxlength="20" placeholder="pvz. Generolas Vilkas">
     <label for="pcountry" class="muted">Tavo šalis</label><select id="pcountry">${WORLD.map((c,i)=>M.caps[i]<0?'':`<option value="${i}" ${i===lt?'selected':''}>${esc(c.n)}</option>`).join('')}</select>
     <button class="btn" data-act="start">Pradėti karą</button>
     <div class="muted" style="text-align:center">Sukūrė <a href="https://github.com/nusikales" target="_blank" rel="noopener" style="color:var(--brass2)">Nusikales</a></div>`;
  }
  if(kind==='reset')h=`<h1>Naujas žaidimas?</h1><div class="muted">Dabartinis progresas bus ištrintas.</div><div class="row"><button class="btn red" data-act="doReset">Taip, pradėti iš naujo</button><button class="btn alt" data-act="closeModal">Atšaukti</button></div>`;
  if(kind==='elected')h=`<h1>Tu prezidentas!</h1><div class="muted">${esc(myC().name)} išrinko tave. Skiltyje „Šalis“ gali skelbti karus, siūlyti taiką ir mobilizuoti kariuomenę. Atlyginimas ₡40 per dieną.</div><button class="btn" data-act="closeModal">Pradėti valdyti</button>`;
  if(kind==='defeat')h=`<h1>Šalis krito</h1><div class="muted">Tavo šalis buvo užkariauta. Dabar tavo šalis yra ${esc(myC().name)} ir tu kovoji toliau.</div><button class="btn" data-act="closeModal">Tęsti</button>`;
  if(kind==='victory')h=`<h1>Pergalė!</h1><div class="muted">${esc(myC().name)} valdo visą pasaulį per ${Math.floor(S.tick/24)+1} dienas. Tavo bendra žala: ${fmt(S.p.dmg)}.</div><button class="btn" data-act="doReset">Žaisti dar kartą</button>`;
  m.innerHTML=`<div class="card">${h}</div>`;
}
let toastT=0;function toast(t,ms){const el=$('#toast');el.textContent=t;el.hidden=false;clearTimeout(toastT);toastT=setTimeout(()=>el.hidden=true,ms||2200);}
function refresh(force){
  if(!S||S.__preview)return;const p=S.p;
  $('#lvl').firstChild.nodeValue=p.lvl;$('#xpbar').style.width=(p.xp/(p.lvl*50)*100)+'%';
  $('#hpbar').style.width=(p.hp/p.maxHp*100)+'%';$('#hptxt').textContent=`❤ ${Math.floor(p.hp)}/${p.maxHp}`;
  $('#enbar').style.width=(p.en/p.maxEn*100)+'%';$('#entxt').textContent=`⚡ ${Math.floor(p.en)}/${p.maxEn}`;
  $('#money').textContent='₡ '+fmt(p.money);$('#inv').textContent=`🍞 ${p.inv.bread+p.inv.cfish} · 💪 ${p.str}${p.inv.crate?' · 📦 '+p.inv.crate:''}`;
  $('#clock').textContent=timeStr(S.tick)+' · '+flagOf(myC().a)+' '+myC().short+(p.president?' · Prezidentas':'');$('#myflag').style.background=col(p.country);
  const nb=S.battles.filter(b=>b.att===p.country||b.def===p.country).length;const bb=$('#bBadge');bb.hidden=!nb;bb.textContent=nb;
  $('#eBadge').hidden=!p.president;const ib=$('#iBadge');ib.hidden=!p.inv.crate;ib.textContent=p.inv.crate;
  document.querySelectorAll('#speed button').forEach(b=>b.classList.toggle('on',+b.dataset.s===S.speed));
  const ae=document.activeElement,busy=!force&&ae&&$('#sheetBody').contains(ae)&&(ae.tagName==='SELECT'||ae.type==='range');
  if(tab==='trade'&&!force)tradeLive();else if(!busy)renderSheet();
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
