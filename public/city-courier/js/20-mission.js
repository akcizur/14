// ---- hra
let G={state:'menu',score:0,lives:3,level:1,got:0,time:90,inv:0},best=0,scores=[];
try{
 best=+localStorage.getItem('akc14best')||0;
 const stored=JSON.parse(localStorage.getItem('akc14scores')||'[]');
 if(Array.isArray(stored))scores=stored.filter(v=>Number.isFinite(v?.score)&&Number.isFinite(v?.level));
}catch(e){}
best=Math.max(best,...scores.map(v=>v.score),0);
function refreshScores(){
 const list=$('scoreList');if(!list)return;list.textContent='';
 const ordered=scores.slice().sort((a,b)=>b.score-a.score).slice(0,10);
 if(!ordered.length){const li=document.createElement('li');li.textContent='Zatím žádný dokončený běh';list.appendChild(li);return}
 ordered.forEach((entry,index)=>{
  const li=document.createElement('li');
  const date=new Date(Number(entry.when)||Date.now()).toLocaleDateString('cs-CZ');
  li.textContent=(index+1)+'. '+entry.score+' bodů · Level '+entry.level+' · '+date;
  list.appendChild(li);
 });
}
function saveMissionScore(){
 scores.push({score:G.score,level:G.level,when:Date.now()});
 scores.sort((a,b)=>b.score-a.score);scores=scores.slice(0,10);
 try{localStorage.setItem('akc14scores',JSON.stringify(scores))}catch(e){}
 refreshScores();
}
refreshScores();
const player={x:0,z:0,h:0,v:0,m:null},cops=[],parcels=[],MAX=24;
function closestCourierTarget(x,z){
 const first=who();
 let nearest=first,nearestDistance=(first.x-x)**2+(first.z-z)**2;
 if(player2.active){
  const secondDistance=(player2.x-x)**2+(player2.z-z)**2;
  if(secondDistance<nearestDistance){nearest=player2;nearestDistance=secondDistance}
 }
 return nearest;
}
const roadPos=()=>{const a=Math.floor(rnd(-4,5))*P,b=rnd(-155,155);return Math.random()<.5?[a,b]:[b,a]};
function spawnParcel(){let x,z;do{[x,z]=roadPos()}while(Math.hypot(x-player.x,z-player.z)<30);
 const m=new THREE.Group(),box=new THREE.Mesh(new THREE.BoxGeometry(2.4,2.4,2.4),new THREE.MeshStandardMaterial({color:0xffc83d,emissive:0xaa7700}));
 const pil=new THREE.Mesh(new THREE.CylinderGeometry(1.6,1.6,60,16,1,true),new THREE.MeshBasicMaterial({color:0xffd24a,transparent:true,opacity:.4,depthWrite:false,depthTest:false}));pil.position.y=30;pil.renderOrder=5;
 m.add(box,pil);m.position.set(x,0,z);S.add(m);parcels.push({x,z,m,box})}
function spawnCop(){let best=null,bd=-1;for(const [x,z] of [[-160,-160],[160,-160],[-160,160],[160,160]]){const d=Math.hypot(x-player.x,z-player.z);if(d>bd){bd=d;best=[x,z]}}
 const m=carModel('Police Car',0x2255cc);S.add(m);cops.push({x:best[0],z:best[1],dx:best[0]>0?-1:1,dz:0,h:0,lx:null,lz:null,m})}
function clearAll(){cops.forEach(c=>{S.remove(c.m);forgetCarModel(c.m)});cops.length=0;parcels.forEach(p=>S.remove(p.m));parcels.length=0}
function start(free){
 clearAll();
 if(player2.m){S.remove(player2.m);forgetCarModel(player2.m);player2.m=null}
 player2.active=false;splitMode=false;
 $('splitHud').style.display='none';$('splitDivider').style.display='none';$('arr').style.display='';
 Object.assign(keys,{up:0,down:0,left:0,right:0});Object.assign(keys2,{up:0,down:0,left:0,right:0});
 resize();
 tod=free?.28:.3;
 Object.assign(G,{state:'play',score:0,lives:3,level:1,got:0,time:90,inv:2,free:!!free,wanted:0,wt:0,split:false});
 unparkOwn();Object.assign(player,{x:0,z:0,h:0,v:0});
 fps.on=false;triggerDown=false;gun.visible=false;$('xh').style.display='none';
 if(!free)spawnCop();for(let i=0;i<(free?10:4);i++)spawnParcel();
 $('ov').style.display='none';C.position.set(0,8,-14)
}
function startSplit(){
 start(false);
 splitMode=true;G.split=true;
 Object.assign(player2,{active:true,x:6.5,z:0,h:0,v:0});
 player2.m=carModel('SUV',0x16a6a6,4.8);
 player2.m.position.set(player2.x,0,player2.z);player2.m.rotation.y=player2.h;S.add(player2.m);
 $('splitHud').style.display='flex';$('splitDivider').style.display='block';$('arr').style.display='none';
 resize();showSplitToast();
}
function showSplitToast(){flash('Dva řidiči: P1 WASD · P2 šipky')}function over(why){G.state='over';document.exitPointerLock&&document.exitPointerLock();fps.on=false;triggerDown=false;gun.visible=false;$('xh').style.display='none';
 if(G.score>best){best=G.score;try{localStorage.setItem('akc14best',best)}catch(e){}}
 if(!G.free)saveMissionScore();refreshScores();
 $('msg').innerHTML=why+'<br><br>Skóre: <b>'+G.score+'</b> · Level '+G.level+' · Rekord: '+best;$('go').textContent='Hrát znovu';$('ov').style.display='flex'}
function copStep(c,dt){
 if(c.stun>0){c.speed=0;c.stun-=dt;if(c.stun<=0)c.m.rotation.z=0;return}
 const sp=13+G.level*1.3;c.speed=sp;c.x+=c.dx*sp*dt;c.z+=c.dz*sp*dt;
 const gx=Math.round(c.x/P)*P,gz=Math.round(c.z/P)*P;
 if(Math.abs(c.x-gx)<1.3&&Math.abs(c.z-gz)<1.3&&(gx!==c.lx||gz!==c.lz)){
  c.lx=gx;c.lz=gz;c.x=gx;c.z=gz;let bs=null,bd=1e9;
  const target=closestCourierTarget(gx,gz);
  for(const [dx,dz] of [[1,0],[-1,0],[0,1],[0,-1]]){
   if(dx===-c.dx&&dz===-c.dz)continue;
   const nx=gx+dx*P,nz=gz+dz*P;if(Math.abs(nx)>B||Math.abs(nz)>B)continue;
   const d=(nx-target.x)**2+(nz-target.z)**2+Math.random()*300;
   if(d<bd){bd=d;bs=[dx,dz]}
  }
  if(!bs)bs=[-c.dx,-c.dz];c.dx=bs[0];c.dz=bs[1]
 }
 c.h+=wrap(Math.atan2(c.dx,c.dz)-c.h)*Math.min(1,8*dt);c.m.position.set(c.x,0,c.z);c.m.rotation.y=c.h
}
function update(dt){
 if(!G.free)G.time-=dt;
 G.inv=Math.max(0,G.inv-dt);
 if(!G.free&&G.time<=0)return over('Došel čas!');
 if(G.free&&G.wanted>0){
  G.wt-=dt;
  if(G.wt<=0){G.wanted=0;cops.forEach(k=>{S.remove(k.m);forgetCarModel(k.m)});cops.length=0;flash('Policie tě ztratila z dohledu')}
 }
 peds.forEach(p=>pedStep(p,dt));
 const acc=fps.on?0:keys.up-keys.down,st=fps.on?0:keys.left-keys.right;
 if(acc>0)player.v+=22*dt;else if(acc<0)player.v-=28*dt;else player.v-=Math.sign(player.v)*Math.min(Math.abs(player.v),10*dt);
 player.v=clamp(player.v,-10,MAX);player.h+=st*2.3*dt*clamp(player.v/8,-1,1);
 player.x+=Math.sin(player.h)*player.v*dt;player.z+=Math.cos(player.h)*player.v*dt;
 if(collide(player,1.7))player.v*=.7;
 if(player2.active){
  const acc2=keys2.up-keys2.down,st2=keys2.left-keys2.right;
  if(acc2>0)player2.v+=22*dt;else if(acc2<0)player2.v-=28*dt;else player2.v-=Math.sign(player2.v)*Math.min(Math.abs(player2.v),10*dt);
  player2.v=clamp(player2.v,-10,MAX);player2.h+=st2*2.3*dt*clamp(player2.v/8,-1,1);
  player2.x+=Math.sin(player2.h)*player2.v*dt;player2.z+=Math.cos(player2.h)*player2.v*dt;
  if(collide(player2,1.7))player2.v*=.7;
  const dx=player2.x-player.x,dz=player2.z-player.z,d=Math.hypot(dx,dz),minimum=3.4;
  if(d<minimum){
   const nx=d>.001?dx/d:1,nz=d>.001?dz/d:0,push=(minimum-d)*.5;
   player.x-=nx*push;player.z-=nz*push;player2.x+=nx*push;player2.z+=nz*push;
   collide(player,1.7);collide(player2,1.7);player.v*=.65;player2.v*=.65;
  }
 }
 if(fps.on)fpsStep(dt);
 cops.forEach(c=>copStep(c,dt));
 for(let i=parcels.length-1;i>=0;i--){
  const p=parcels[i],first=who();
  const d1=Math.hypot(p.x-first.x,p.z-first.z),r1=fps.on?2.8:4.4;
  const d2=player2.active?Math.hypot(p.x-player2.x,p.z-player2.z):Infinity;
  if(d1<r1||d2<4.4){S.remove(p.m);parcels.splice(i,1);G.score+=100*G.level;G.got++;G.time+=3;spawnParcel()}
 }
 if(!G.free&&G.got>=6){G.level++;G.got=0;G.time+=25;G.score+=500;if(cops.length<4)spawnCop()}
 if(G.inv<=0){
  for(const c of cops){
   if(c.stun>0)continue;
   const target=closestCourierTarget(c.x,c.z),range=target===fps?2.4:3.4;
   if(Math.hypot(c.x-target.x,c.z-target.z)>=range)continue;
   G.lives--;G.inv=2.5;player.v=0;player2.v=0;
   cops.forEach(k=>{S.remove(k.m);forgetCarModel(k.m)});cops.length=0;
   if(G.free){
    G.lives=3;G.wanted=0;G.score=Math.floor(G.score/2);unparkOwn();fps.on=false;gun.visible=false;$('xh').style.display='none';
    player.x=0;player.z=0;player.v=0;
    if(player2.active){player2.x=6.5;player2.z=0;player2.v=0}
    flash('Zatčen! Přišel jsi o polovinu peněz.')
   }else{
    for(let i=0;i<G.level&&i<4;i++)spawnCop();
    if(G.lives<=0)return over('Policie tě chytila!')
   }
   break
  }
 }
}
function hud(){if(splitMode){$('p1Status').textContent='P1 · '+Math.round(Math.abs(player.v)*3.6)+' km/h';$('p2Status').textContent='P2 · '+Math.round(Math.abs(player2.v)*3.6)+' km/h';}let nb=null,nd=1e9;for(const p of parcels){const d=Math.hypot(p.x-who().x,p.z-who().z);if(d<nd){nd=d;nb=p}}if(nb){$('ai').style.transform='rotate('+(-90-wrap(Math.atan2(nb.x-who().x,nb.z-who().z)-(fps.on?fps.yaw:player.h))*57.3)+'deg)';$('ad').textContent=Math.round(nd)+' m'}$('hs').textContent='Skóre '+G.score;$('ht').textContent=G.free?clockStr():'Čas '+Math.max(0,Math.ceil(G.time));$('hl').textContent=G.free?('★'.repeat(G.wanted||0)||'Bez hledání'):'♥'.repeat(Math.max(0,G.lives));$('hv').textContent=G.free?'Open World':'Level '+G.level;$('hp').textContent=G.free?(camMode?'1. osoba':'3. osoba'):'Balíky '+G.got+'/6';$('hw').textContent='Zbraň '+(weaponIndex+1)+' · '+WEAPONS[weaponIndex].name}
const mc=$('mm').getContext('2d'),MS=150/350,mx=x=>75-x*MS,mz=z=>75-z*MS;
function minimap(){mc.clearRect(0,0,150,150);mc.fillStyle='#4a5260';blocks.forEach(([x,z])=>mc.fillRect(mx(x)-14*MS,mz(z)-14*MS,28*MS,28*MS));
 mc.fillStyle='#ffc83d';parcels.forEach(p=>{mc.beginPath();mc.arc(mx(p.x),mz(p.z),3,0,7);mc.fill()});
 mc.fillStyle='#5cd0ff';vehicles.forEach(v=>mc.fillRect(mx(v.x)-2,mz(v.z)-2,4,4));mc.fillStyle='#ff4040';cops.forEach(c=>{mc.beginPath();mc.arc(mx(c.x),mz(c.z),3.5,0,7);mc.fill()});
 const W=who(),px=mx(W.x),pz=mz(W.z),hh=fps.on?fps.yaw:player.h,s=Math.sin(hh),c=Math.cos(hh);mc.fillStyle='#fff';mc.beginPath();
 mc.moveTo(px-s*7,pz-c*7);mc.lineTo(px+s*4+c*4,pz+c*4-s*4);mc.lineTo(px+s*4-c*4,pz+c*4+s*4);mc.fill();
 if(player2.active){mc.fillStyle='#5cd0ff';mc.beginPath();mc.arc(mx(player2.x),mz(player2.z),4,0,Math.PI*2);mc.fill()}}
