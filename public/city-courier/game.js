addEventListener('error',e=>{const m=document.getElementById('msg');if(m)m.textContent='Chyba: '+e.message});
let ASSETS={};
const N=8,P=40,B=165,$=id=>document.getElementById(id);
const clamp=(a,b,c)=>Math.max(b,Math.min(c,a)),wrap=a=>Math.atan2(Math.sin(a),Math.cos(a)),rnd=(a,b)=>a+Math.random()*(b-a);
const R=new THREE.WebGLRenderer({antialias:true});R.setPixelRatio(Math.min(devicePixelRatio,2));R.shadowMap.enabled=true;R.outputEncoding=THREE.sRGBEncoding;
document.body.prepend(R.domElement);
const S=new THREE.Scene();S.background=new THREE.Color(0x9ec7e8);S.fog=new THREE.Fog(0x9ec7e8,90,280);
const C=new THREE.PerspectiveCamera(60,1,.1,400);
const hemi=new THREE.HemisphereLight(0xffffff,0x556677,.95);S.add(hemi);
const sun=new THREE.DirectionalLight(0xfff2d6,1.1);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);sun.shadow.bias=-.0005;sun.shadow.normalBias=.05;
const sc=sun.shadow.camera;sc.left=sc.bottom=-70;sc.right=sc.top=70;sc.far=300;S.add(sun,sun.target);
function resize(){R.setSize(innerWidth,innerHeight);C.aspect=innerWidth/innerHeight;C.updateProjectionMatrix()}
addEventListener('resize',resize);resize();

// ---- ovládání
const keys={up:0,down:0,left:0,right:0};
const kmap={ArrowUp:'up',KeyW:'up',ArrowDown:'down',KeyS:'down',ArrowLeft:'left',KeyA:'left',ArrowRight:'right',KeyD:'right'};
addEventListener('keydown',e=>{if(kmap[e.code]){keys[kmap[e.code]]=1;e.preventDefault()}if(e.code==='KeyF')flip();if(e.code==='KeyE')toggleFps();if(e.code==='KeyV')camMode^=1;if(e.code==='Digit1')selectWeapon(0);if(e.code==='Digit2')selectWeapon(1);if(e.code==='Digit3')selectWeapon(2);if(e.code==='Enter'&&G.state!=='play'&&!$('go').disabled)start()});
addEventListener('keyup',e=>{if(kmap[e.code])keys[kmap[e.code]]=0});
document.querySelectorAll('[data-k]').forEach(b=>{const k=b.dataset.k;b.addEventListener('pointerdown',e=>{keys[k]=1;e.preventDefault()});
 ['pointerup','pointerleave','pointercancel'].forEach(t=>b.addEventListener(t,()=>keys[k]=0))});

// ---- modely (GLB z archivu, vložené jako base64)
const loader=new THREE.GLTFLoader(),M={};
const loadAll=()=>Promise.all(Object.entries(ASSETS).map(([name,url])=>new Promise(resolve=>{
  loader.load(url,gltf=>{M[name]=gltf.scene;A[name]=gltf.animations;resolve();},undefined,error=>{
    console.warn('[City Courier] Model failed:',name,error);
    resolve();
  });
})));
function fit(k,t,col){
 const g=new THREE.Group();let o;
 if(M[k])o=M[k].clone(true);else o=new THREE.Mesh(new THREE.BoxGeometry(1,1,1.5),new THREE.MeshStandardMaterial({color:col}));
 g.add(o);const s=new THREE.Vector3();new THREE.Box3().setFromObject(g).getSize(s);o.scale.multiplyScalar(t/Math.max(s.x,s.z));
 const b=new THREE.Box3().setFromObject(g),c=new THREE.Vector3();b.getCenter(c);o.position.set(o.position.x-c.x,o.position.y-b.min.y,o.position.z-c.z);
 const wheels=[];
 o.traverse(m=>{
  if(m.isMesh){m.castShadow=m.receiveShadow=true;[].concat(m.material).forEach(x=>{if(x&&x.metalness!==undefined)x.metalness=Math.min(x.metalness,.3)})}
  if(/wheel/i.test(m.name||''))wheels.push(m);
 });
 g.userData.wheels=wheels;
 return g;
}
let flipA=0;const carInners=[],carModels=[];
function carModel(k,col,len){
 const size=len||4.3,g=fit(k,size,col),w=new THREE.Group();w.add(g);w.userData.len=size;g.rotation.y=flipA;carInners.push(g);
 const headlights=[],taillights=[],brakeLights=[];
 const lampGeometry=new THREE.BoxGeometry(.22,.1,.045);
 for(const x of [-.48,.48]){
  const head=new THREE.Mesh(lampGeometry,new THREE.MeshBasicMaterial({color:0xfff0c6}));
  head.position.set(x,.47,-size*.46);head.visible=false;g.add(head);headlights.push(head);
  const tail=new THREE.Mesh(lampGeometry,new THREE.MeshBasicMaterial({color:0x8f1010}));
  tail.position.set(x,.48,size*.46);tail.visible=false;g.add(tail);taillights.push(tail);
  const brake=new THREE.Mesh(lampGeometry,new THREE.MeshBasicMaterial({color:0xff1717}));
  brake.position.set(x,.34,size*.46);brake.visible=false;g.add(brake);brakeLights.push(brake);
 }
 w.userData.body=g;w.userData.wheels=g.userData.wheels||[];
 w.userData.headlights=headlights;w.userData.taillights=taillights;w.userData.brakeLights=brakeLights;
 carModels.push(w);return w;
}
function flip(){flipA+=Math.PI;carInners.forEach(g=>g.rotation.y=flipA)}
function forgetCarModel(model){const i=carModels.indexOf(model);if(i>=0)carModels.splice(i,1)}
function updateCarAnimations(dt,t){
 carModels.forEach(car=>{
  const cop=cops.find(c=>c.m===car);
  const speed=car===player.m?(fps.on?0:player.v):(cop?.speed||0);
  if(Math.abs(speed)>.15)car.userData.wheels.forEach(wheel=>{wheel.rotation.x-=speed*dt/.34});
  const body=car.userData.body;
  if(body)body.position.y=Math.abs(speed)>.8?Math.sin(t*.016+car.id)*.018*Math.min(1,Math.abs(speed)/8):0;
  const braking=car===player.m&&(keys.down||player.v<-.5);
  car.userData.brakeLights.forEach(light=>{light.visible=braking});
 });
}
$('fl').onclick=flip;

// ---- město
const col=[],blocks=[];
function buildCity(){
 const gnd=new THREE.Mesh(new THREE.PlaneGeometry(560,560),new THREE.MeshStandardMaterial({color:0x30343a,roughness:.95}));gnd.rotation.x=-Math.PI/2;gnd.receiveShadow=true;S.add(gnd);
 const dm=new THREE.InstancedMesh(new THREE.PlaneGeometry(1.2,4),new THREE.MeshBasicMaterial({color:0xe8e8d0}),600);let n=0;const mt=new THREE.Matrix4(),q=new THREE.Quaternion(),e=new THREE.Euler();
 for(let k=-4;k<=4;k++)for(let a=-160;a<=160;a+=8)for(const ax of [0,1]){if(Math.abs(a-Math.round(a/P)*P)<9)continue;
  e.set(-Math.PI/2,0,ax?Math.PI/2:0);q.setFromEuler(e);mt.compose(new THREE.Vector3(ax?a:k*P,.05,ax?k*P:a),q,new THREE.Vector3(1,1,1));dm.setMatrixAt(n++,mt)}
 dm.count=n;S.add(dm);
 const names=['Small Building','Low Building','Large Building','Skyscraper','Small Building','Large Building'],cols=[0xb0a090,0x8aa0b8,0xc0b0a0,0x7f8fa0];
 for(let i=0;i<N;i++)for(let j=0;j<N;j++){
  const cx=(i-3.5)*P,cz=(j-3.5)*P;blocks.push([cx,cz]);
  const sl=new THREE.Mesh(new THREE.BoxGeometry(28,.3,28),new THREE.MeshStandardMaterial({color:0x8d8d86}));sl.position.set(cx,.15,cz);sl.receiveShadow=true;S.add(sl);
  for(const [ox,oz] of [[-7,-7],[7,-7],[-7,7],[7,7]]){
   const g=fit(names[Math.floor(Math.random()*names.length)],11,cols[Math.floor(Math.random()*4)]);{const hb=new THREE.Box3().setFromObject(g).getSize(new THREE.Vector3()).y;g.scale.y=Math.min(1,rnd(10,20)/hb)}g.position.set(cx+ox,.3,cz+oz);g.rotation.y=Math.floor(Math.random()*4)*Math.PI/2;S.add(g);
   col.push({x:cx+ox,z:cz+oz,hw:5.5,hd:5.5})}
  if(Math.random()<.7){const t=fit('Tree',4,0x2f8f3a);t.position.set(cx+(Math.random()<.5?-12.5:12.5),.3,cz+rnd(-12,12));S.add(t)}
 }}
function collide(p,r){let hit=false;
 for(const c of col){const dx=p.x-c.x,dz=p.z-c.z;if(Math.abs(dx)>c.hw+r||Math.abs(dz)>c.hd+r)continue;
  const nx=clamp(dx,-c.hw,c.hw),nz=clamp(dz,-c.hd,c.hd),ex=dx-nx,ez=dz-nz,d2=ex*ex+ez*ez;
  if(d2>=r*r)continue;hit=true;
  if(d2<1e-6){if(c.hw-Math.abs(dx)<c.hd-Math.abs(dz))p.x=c.x+Math.sign(dx||1)*(c.hw+r);else p.z=c.z+Math.sign(dz||1)*(c.hd+r)}
  else{const d=Math.sqrt(d2);p.x+=ex/d*(r-d);p.z+=ez/d*(r-d)}}
 p.x=clamp(p.x,-B,B);p.z=clamp(p.z,-B,B);return hit}

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
const roadPos=()=>{const a=Math.floor(rnd(-4,5))*P,b=rnd(-155,155);return Math.random()<.5?[a,b]:[b,a]};
function spawnParcel(){let x,z;do{[x,z]=roadPos()}while(Math.hypot(x-player.x,z-player.z)<30);
 const m=new THREE.Group(),box=new THREE.Mesh(new THREE.BoxGeometry(2.4,2.4,2.4),new THREE.MeshStandardMaterial({color:0xffc83d,emissive:0xaa7700}));
 const pil=new THREE.Mesh(new THREE.CylinderGeometry(1.6,1.6,60,16,1,true),new THREE.MeshBasicMaterial({color:0xffd24a,transparent:true,opacity:.4,depthWrite:false,depthTest:false}));pil.position.y=30;pil.renderOrder=5;
 m.add(box,pil);m.position.set(x,0,z);S.add(m);parcels.push({x,z,m,box})}
function spawnCop(){let best=null,bd=-1;for(const [x,z] of [[-160,-160],[160,-160],[-160,160],[160,160]]){const d=Math.hypot(x-player.x,z-player.z);if(d>bd){bd=d;best=[x,z]}}
 const m=carModel('Police Car',0x2255cc);S.add(m);cops.push({x:best[0],z:best[1],dx:best[0]>0?-1:1,dz:0,h:0,lx:null,lz:null,m})}
function clearAll(){cops.forEach(c=>{S.remove(c.m);forgetCarModel(c.m)});cops.length=0;parcels.forEach(p=>S.remove(p.m));parcels.length=0}
function start(free){clearAll();tod=free?.28:.3;Object.assign(G,{state:'play',score:0,lives:3,level:1,got:0,time:90,inv:2,free:!!free,wanted:0,wt:0});unparkOwn();Object.assign(player,{x:0,z:0,h:0,v:0});fps.on=false;triggerDown=false;gun.visible=false;$('xh').style.display='none';
 if(!free)spawnCop();for(let i=0;i<(free?10:4);i++)spawnParcel();$('ov').style.display='none';C.position.set(0,8,-14)}
function over(why){G.state='over';document.exitPointerLock&&document.exitPointerLock();fps.on=false;triggerDown=false;gun.visible=false;$('xh').style.display='none';
 if(G.score>best){best=G.score;try{localStorage.setItem('akc14best',best)}catch(e){}}
 if(!G.free)saveMissionScore();refreshScores();
 $('msg').innerHTML=why+'<br><br>Skóre: <b>'+G.score+'</b> · Level '+G.level+' · Rekord: '+best;$('go').textContent='Hrát znovu';$('ov').style.display='flex'}
function copStep(c,dt){if(c.stun>0){c.speed=0;c.stun-=dt;if(c.stun<=0)c.m.rotation.z=0;return}const sp=13+G.level*1.3;c.speed=sp;c.x+=c.dx*sp*dt;c.z+=c.dz*sp*dt;
 const gx=Math.round(c.x/P)*P,gz=Math.round(c.z/P)*P;
 if(Math.abs(c.x-gx)<1.3&&Math.abs(c.z-gz)<1.3&&(gx!==c.lx||gz!==c.lz)){c.lx=gx;c.lz=gz;c.x=gx;c.z=gz;let bs=null,bd=1e9;
  for(const [dx,dz] of [[1,0],[-1,0],[0,1],[0,-1]]){if(dx===-c.dx&&dz===-c.dz)continue;const nx=gx+dx*P,nz=gz+dz*P;if(Math.abs(nx)>B||Math.abs(nz)>B)continue;
   const d=(nx-who().x)**2+(nz-who().z)**2+Math.random()*300;if(d<bd){bd=d;bs=[dx,dz]}}
  if(!bs)bs=[-c.dx,-c.dz];c.dx=bs[0];c.dz=bs[1]}
 c.h+=wrap(Math.atan2(c.dx,c.dz)-c.h)*Math.min(1,8*dt);c.m.position.set(c.x,0,c.z);c.m.rotation.y=c.h}
function update(dt){
 if(!G.free)G.time-=dt;G.inv=Math.max(0,G.inv-dt);if(!G.free&&G.time<=0)return over('Došel čas!');if(G.free&&G.wanted>0){G.wt-=dt;if(G.wt<=0){G.wanted=0;cops.forEach(k=>{S.remove(k.m);forgetCarModel(k.m)});cops.length=0;flash('Policie tě ztratila z dohledu')}}peds.forEach(p=>pedStep(p,dt));
 const acc=fps.on?0:keys.up-keys.down,st=fps.on?0:keys.left-keys.right;
 if(acc>0)player.v+=22*dt;else if(acc<0)player.v-=28*dt;else player.v-=Math.sign(player.v)*Math.min(Math.abs(player.v),10*dt);
 player.v=clamp(player.v,-10,MAX);player.h+=st*2.3*dt*clamp(player.v/8,-1,1);
 player.x+=Math.sin(player.h)*player.v*dt;player.z+=Math.cos(player.h)*player.v*dt;
 if(collide(player,1.7))player.v*=.7;
 if(fps.on)fpsStep(dt);cops.forEach(c=>copStep(c,dt));
 for(let i=parcels.length-1;i>=0;i--){const p=parcels[i];if(Math.hypot(p.x-who().x,p.z-who().z)<(fps.on?2.8:4.4)){S.remove(p.m);parcels.splice(i,1);G.score+=100*G.level;G.got++;G.time+=3;spawnParcel()}}
 if(!G.free&&G.got>=6){G.level++;G.got=0;G.time+=25;G.score+=500;if(cops.length<4)spawnCop()}
 if(G.inv<=0)for(const c of cops)if(!(c.stun>0)&&Math.hypot(c.x-who().x,c.z-who().z)<(fps.on?2.4:3.4)){G.lives--;G.inv=2.5;player.v=0;cops.forEach(k=>{S.remove(k.m);forgetCarModel(k.m)});cops.length=0;if(G.free){G.lives=3;G.wanted=0;G.score=Math.floor(G.score/2);unparkOwn();fps.on=false;gun.visible=false;$('xh').style.display='none';player.x=0;player.z=0;player.v=0;flash('Zatčen! Přišel jsi o polovinu peněz.')}else{for(let i=0;i<G.level&&i<4;i++)spawnCop();if(G.lives<=0)return over('Policie tě chytila!')}break}
}
function hud(){let nb=null,nd=1e9;for(const p of parcels){const d=Math.hypot(p.x-who().x,p.z-who().z);if(d<nd){nd=d;nb=p}}if(nb){$('ai').style.transform='rotate('+(-90-wrap(Math.atan2(nb.x-who().x,nb.z-who().z)-(fps.on?fps.yaw:player.h))*57.3)+'deg)';$('ad').textContent=Math.round(nd)+' m'}$('hs').textContent='Skóre '+G.score;$('ht').textContent=G.free?clockStr():'Čas '+Math.max(0,Math.ceil(G.time));$('hl').textContent=G.free?('★'.repeat(G.wanted||0)||'Bez hledání'):'♥'.repeat(Math.max(0,G.lives));$('hv').textContent=G.free?'Open World':'Level '+G.level;$('hp').textContent=G.free?(camMode?'1. osoba':'3. osoba'):'Balíky '+G.got+'/6';$('hw').textContent='Zbraň '+(weaponIndex+1)+' · '+WEAPONS[weaponIndex].name}
const mc=$('mm').getContext('2d'),MS=150/350,mx=x=>75-x*MS,mz=z=>75-z*MS;
function minimap(){mc.clearRect(0,0,150,150);mc.fillStyle='#4a5260';blocks.forEach(([x,z])=>mc.fillRect(mx(x)-14*MS,mz(z)-14*MS,28*MS,28*MS));
 mc.fillStyle='#ffc83d';parcels.forEach(p=>{mc.beginPath();mc.arc(mx(p.x),mz(p.z),3,0,7);mc.fill()});
 mc.fillStyle='#5cd0ff';vehicles.forEach(v=>mc.fillRect(mx(v.x)-2,mz(v.z)-2,4,4));mc.fillStyle='#ff4040';cops.forEach(c=>{mc.beginPath();mc.arc(mx(c.x),mz(c.z),3.5,0,7);mc.fill()});
 const W=who(),px=mx(W.x),pz=mz(W.z),hh=fps.on?fps.yaw:player.h,s=Math.sin(hh),c=Math.cos(hh);mc.fillStyle='#fff';mc.beginPath();
 mc.moveTo(px-s*7,pz-c*7);mc.lineTo(px+s*4+c*4,pz+c*4-s*4);mc.lineTo(px+s*4-c*4,pz+c*4+s*4);mc.fill()}
// ---- FPS postava
const fps={on:false,x:0,z:0,yaw:0,pitch:0,y:0,vy:0,fl:0},held={s:0,j:0};let lastShot=0,triggerDown=false,weaponIndex=0,audioCtx=null;
const WEAPONS=[
 {name:'PISTOLE',cooldown:250,pellets:1,spread:.002,range:100,hitRadius:2.9,stun:5,score:50,frequency:560,wave:'square',volume:.055},
 {name:'SMG',cooldown:92,pellets:1,spread:.018,range:88,hitRadius:2.6,stun:3.2,score:35,frequency:390,wave:'sawtooth',volume:.035},
 {name:'BROKOVNICE',cooldown:680,pellets:8,spread:.085,range:48,hitRadius:3.3,stun:6.5,score:75,frequency:145,wave:'triangle',volume:.09}
];
function updateWeaponLabel(){$('hw').textContent='Zbraň '+(weaponIndex+1)+' · '+WEAPONS[weaponIndex].name}
function selectWeapon(index){
 if(index<0||index>=WEAPONS.length||index===weaponIndex)return;
 weaponIndex=index;
 const body=gun.userData.body;
 if(body){const scale=weaponIndex===0?[1,1,1]:weaponIndex===1?[1.35,1.1,1.35]:[1.65,1.25,1.55];body.scale.set(...scale)}
 updateWeaponLabel();flash('Zbraň: '+WEAPONS[weaponIndex].name);
}
function playWeaponSound(weapon){
 try{
  const AudioContextClass=window.AudioContext||window.webkitAudioContext;
  if(!AudioContextClass)return;
  if(!audioCtx)audioCtx=new AudioContextClass();
  if(audioCtx.state==='suspended')audioCtx.resume();
  const oscillator=audioCtx.createOscillator(),gain=audioCtx.createGain(),now=audioCtx.currentTime;
  oscillator.type=weapon.wave;oscillator.frequency.setValueAtTime(weapon.frequency,now);
  oscillator.frequency.exponentialRampToValueAtTime(Math.max(55,weapon.frequency*.42),now+.075);
  gain.gain.setValueAtTime(.0001,now);gain.gain.exponentialRampToValueAtTime(weapon.volume,now+.004);
  gain.gain.exponentialRampToValueAtTime(.0001,now+.11);
  oscillator.connect(gain);gain.connect(audioCtx.destination);oscillator.start(now);oscillator.stop(now+.12);
 }catch(error){console.debug('[City Courier] Audio unavailable',error)}
}
const who=()=>fps.on?fps:player;
S.add(C);
const gun=new THREE.Group();
{const b=new THREE.Mesh(new THREE.BoxGeometry(.09,.13,.55),new THREE.MeshStandardMaterial({color:0x2a2d33}));
 const h=new THREE.Mesh(new THREE.BoxGeometry(.07,.16,.1),new THREE.MeshStandardMaterial({color:0x3a3d44}));h.position.set(0,-.12,.15);
 const f=new THREE.Mesh(new THREE.BoxGeometry(.12,.12,.12),new THREE.MeshBasicMaterial({color:0xffd24a}));f.position.z=-.34;f.visible=false;
 gun.userData.f=f;gun.userData.body=b;gun.add(b,h,f)}
gun.position.set(.26,-.24,-.55);gun.visible=false;C.add(gun);updateWeaponLabel();
addEventListener('keydown',e=>{if(e.code==='ShiftLeft')held.s=1;if(e.code==='Space'){held.j=1;if(fps.on)e.preventDefault()}});
addEventListener('keyup',e=>{if(e.code==='ShiftLeft')held.s=0;if(e.code==='Space')held.j=0});
document.addEventListener('mousemove',e=>{if(fps.on&&document.pointerLockElement){fps.yaw-=e.movementX*.0025;fps.pitch=clamp(fps.pitch-e.movementY*.0025,-1.4,1.4)}});
R.domElement.addEventListener('mousedown',()=>{if(!fps.on||G.state!=='play')return;if(!document.pointerLockElement){R.domElement.requestPointerLock();return}triggerDown=true;shoot()});
document.addEventListener('mouseup',()=>{triggerDown=false});
document.addEventListener('pointerlockchange',()=>{if(!document.pointerLockElement)triggerDown=false});
function toggleFps(){if(G.state!=='play')return;
 if(!fps.on){parkCar();fps.x=player.x+Math.cos(player.h)*2.8;fps.z=player.z-Math.sin(player.h)*2.8;fps.yaw=player.h;fps.pitch=0;fps.y=0;fps.vy=0;player.v=0;fps.on=true;gun.visible=true;$('xh').style.display='block';if(R.domElement.requestPointerLock)R.domElement.requestPointerLock()}
 else if(nearVeh()){enterVeh(nearVeh());fps.on=false;gun.visible=false;$('xh').style.display='none';if(document.exitPointerLock)document.exitPointerLock()}}
function fpsStep(dt){const f=fps,sp=held.s?12:7,fw=keys.up-keys.down,sd=keys.left-keys.right,s=Math.sin(f.yaw),c=Math.cos(f.yaw);
 const ax=s*fw+c*sd,az=c*fw-s*sd,l=Math.hypot(ax,az)||1;
 if(fw||sd){f.x+=ax/l*sp*dt;f.z+=az/l*sp*dt}
 collide(f,.8);
 if(held.j&&f.y===0)f.vy=8;
 f.vy-=24*dt;f.y=Math.max(0,f.y+f.vy*dt);if(f.y===0&&f.vy<0)f.vy=0;
 f.fl=Math.max(0,f.fl-dt);gun.userData.f.visible=f.fl>0}
function camFps(){const f=fps,cp=Math.cos(f.pitch),ey=1.7+f.y;C.position.set(f.x,ey,f.z);C.lookAt(f.x+Math.sin(f.yaw)*cp,ey+Math.sin(f.pitch),f.z+Math.cos(f.yaw)*cp)}
function shotTargetForRay(direction,f,originY,weapon){
 let nearest=null,nearestDistance=Infinity;
 for(const cop of cops){
  if(cop.stun>0)continue;
  const tx=cop.x-f.x,ty=1-originY,tz=cop.z-f.z;
  const distance=tx*direction[0]+ty*direction[1]+tz*direction[2];
  if(distance<0||distance>weapon.range||distance>=nearestDistance)continue;
  const perpendicular=tx*tx+ty*ty+tz*tz-distance*distance;
  if(perpendicular<weapon.hitRadius){nearest={target:cop,kind:'cop',distance};nearestDistance=distance}
 }
 for(const ped of peds){
  if(ped.dead>0)continue;
  const tx=ped.x-f.x,ty=.9-originY,tz=ped.z-f.z;
  const distance=tx*direction[0]+ty*direction[1]+tz*direction[2];
  if(distance<0||distance>weapon.range||distance>=nearestDistance)continue;
  const perpendicular=tx*tx+ty*ty+tz*tz-distance*distance;
  if(perpendicular<weapon.hitRadius*.2){nearest={target:ped,kind:'ped',distance};nearestDistance=distance}
 }
 if(!nearest)return null;
 for(let step=1.5;step<nearest.distance;step+=1.5){
  const px=f.x+direction[0]*step,py=originY+direction[1]*step,pz=f.z+direction[2]*step;
  if(py<16&&col.some(k=>Math.abs(px-k.x)<k.hw&&Math.abs(pz-k.z)<k.hd))return null;
 }
 return nearest;
}
function shoot(){
 const weapon=WEAPONS[weaponIndex],now=performance.now();
 if(now-lastShot<weapon.cooldown)return;lastShot=now;fps.fl=.09;playWeaponSound(weapon);
 const f=fps,originY=1.7+f.y,hits=new Map();
 for(let pellet=0;pellet<weapon.pellets;pellet++){
  const yaw=f.yaw+(Math.random()-.5)*weapon.spread*2;
  const pitch=f.pitch+(Math.random()-.5)*weapon.spread*2;
  const cp=Math.cos(pitch),direction=[Math.sin(yaw)*cp,Math.sin(pitch),Math.cos(yaw)*cp];
  const hit=shotTargetForRay(direction,f,originY,weapon);
  if(hit&&!hits.has(hit.target))hits.set(hit.target,hit);
 }
 for(const hit of hits.values()){
  if(hit.kind==='ped')killPed(hit.target);
  else{hit.target.stun=Math.max(hit.target.stun||0,weapon.stun);hit.target.m.rotation.z=.45;if(G.free)wantedUp(1)}
  G.score+=weapon.score;
 }
}
 // ---- OPEN WORLD
const A={},chars=[],peds=[],vehicles=[];let pm,pmc,camMode=0,tod=.3,sunO=[50,90,30],toastT=0;
function flash(m){const e=$('toast');e.textContent=m;e.style.opacity=1;clearTimeout(toastT);toastT=setTimeout(()=>e.style.opacity=0,3200)}
const clockStr=()=>{const h=(tod*24+6)%24;return String(Math.floor(h)).padStart(2,'0')+':'+String(Math.floor(h%1*60)).padStart(2,'0')};
function dayApply(){
 const phase=tod*90;
 const smooth=(a,b,x)=>{const v=clamp((x-a)/(b-a),0,1);return v*v*(3-2*v)};
 let day=phase<4?smooth(0,4,phase):phase<56?1:phase<60?1-smooth(56,60,phase):0;
 const angle=phase/60*Math.PI,el=phase<60?Math.sin(angle):0;
 const sky=new THREE.Color(0x081426).lerp(new THREE.Color(0x9ec7e8),day);
 const twilight=Math.max(1-smooth(0,6,phase),smooth(54,60,phase));
 sky.lerp(new THREE.Color(0xff9a5a),.38*twilight);
 S.background=sky;S.fog.color.copy(sky);hemi.intensity=.22+.78*day;sun.intensity=1.2*day;
 sunO=[Math.cos(angle)*80,Math.max(8,el*100),30];
 const night=1-day;
 carModels.forEach(car=>{
  car.userData.headlights.forEach(light=>{light.visible=night>.28});
  car.userData.taillights.forEach(light=>{light.visible=night>.28});
  car.userData.brakeLights.forEach(light=>{light.visible=car===player.m&&(keys.down||player.v<-.5)});
 });
}
function fitChar(k,H,tint){const g=new THREE.Group(),o=M[k]?THREE.SkeletonUtils.clone(M[k]):new THREE.Mesh(new THREE.BoxGeometry(.5,1.7,.4),new THREE.MeshStandardMaterial({color:0x3366cc}));
 g.add(o);o.updateMatrixWorld(true);let lo=1e9,hi=-1e9;const v=new THREE.Vector3();o.traverse(b=>{if(b.isBone){b.getWorldPosition(v);lo=Math.min(lo,v.y);hi=Math.max(hi,v.y)}});
 if(hi>lo){const s=H/((hi-lo)*1.1);o.scale.multiplyScalar(s);o.position.y=-lo*s+.03}else o.position.y=H/2;
 o.traverse(m=>{if(m.isMesh){m.castShadow=true;m.frustumCulled=false;if(tint&&m.material&&!Array.isArray(m.material)){m.material=m.material.clone();m.material.color.multiply(tint)}}});
 const c={g,mixer:null,acts:null};if(M[k]&&A[k]&&A[k].length){c.mixer=new THREE.AnimationMixer(o);c.acts={};A[k].forEach(cl=>{c.acts[cl.name.toLowerCase()]=c.mixer.clipAction(cl)})}return c}
function charAnim(c,name){if(!c.acts||c.cur===name)return;const a=Object.keys(c.acts).find(n=>n.includes(name));if(!a)return;const n=c.acts[a];
 if(name==='death'){n.setLoop(THREE.LoopOnce,1);n.clampWhenFinished=true}else n.setLoop(THREE.LoopRepeat,Infinity);
 if(c.prev)c.prev.fadeOut(.2);n.reset().fadeIn(.2).play();c.prev=n;c.cur=name}
function buildPeds(){for(let i=0;i<32;i++){const c=fitChar('Man',1.75,new THREE.Color().setHSL(Math.random(),.45,.62));S.add(c.g);chars.push(c);const p={c,m:c.g,dead:0,dir:1,sp:rnd(1.4,2.6),x:0,z:0};respawnPed(p);peds.push(p);pedStep(p,0)}}
function respawnPed(p){p.ax=Math.random()<.5?0:1;p.line=Math.round(rnd(-4,4))*P+(Math.random()<.5?-6.75:6.75);p.a=rnd(-150,100);p.b=Math.min(160,p.a+rnd(30,80));p.pos=rnd(p.a,p.b);p.dir=Math.random()<.5?1:-1;p.dead=0;charAnim(p.c,'walk')}
function pedStep(p,dt){if(p.dead>0){p.dead-=dt;if(p.dead<=0)respawnPed(p);return}
 p.pos+=p.dir*p.sp*dt;if(p.pos>p.b){p.pos=p.b;p.dir=-1}else if(p.pos<p.a){p.pos=p.a;p.dir=1}
 const x=p.ax?p.pos:p.line,z=p.ax?p.line:p.pos;p.x=x;p.z=z;p.m.position.set(x,.3,z);p.m.rotation.y=p.ax?(p.dir>0?Math.PI/2:-Math.PI/2):(p.dir>0?0:Math.PI);
 if(dt>0&&!fps.on&&Math.abs(player.v)>4&&Math.hypot(x-player.x,z-player.z)<2.4)killPed(p)}
function killPed(p){if(p.dead>0)return;p.dead=5;charAnim(p.c,'death');if(G.free)wantedUp(1)}
function wantedUp(n){G.wanted=Math.min(3,G.wanted+n);G.wt=30;while(cops.length<G.wanted)spawnCop();flash('Hledaný: '+'★'.repeat(G.wanted))}
const VT=[['Car',4.3,0x2a6fd6],['SUV',4.8,0x444444],['Pickup Truck',5.2,0xaa3322],['Van',5.2,0xdddddd],['Sports Car',4.3,0xe0b020],['Bus',9,0xe0a020],['Car',4.3,0x22aa55]];
function parkRec(m,x,z,h,len){const r={m,x,z,h,k:{x,z,hw:len/2.4,hd:len/2.4}};col.push(r.k);vehicles.push(r);return r}
function buildVehicles(){for(let i=0;i<16;i++){const t=VT[i%VT.length],m=carModel(t[0],t[2],t[1]);let x,z;
 do{[x,z]=roadPos()}while((Math.abs(x-Math.round(x/P)*P)<10&&Math.abs(z-Math.round(z/P)*P)<10)||Math.hypot(x,z)<14);
 const onX=Math.abs(x-Math.round(x/P)*P)<.5;let h;if(onX){x+=Math.random()<.5?3:-3;h=Math.random()<.5?0:Math.PI}else{z+=Math.random()<.5?3:-3;h=Math.random()<.5?Math.PI/2:-Math.PI/2}
 m.position.set(x,0,z);m.rotation.y=h;S.add(m);parkRec(m,x,z,h,t[1])}}
function unparkOwn(){const ri=vehicles.findIndex(v=>v.m===player.m);if(ri>=0){const ci=col.indexOf(vehicles[ri].k);if(ci>=0)col.splice(ci,1);vehicles.splice(ri,1)}}
function parkCar(){parkRec(player.m,player.x,player.z,player.h,player.m.userData.len||4.3)}
function nearVeh(){let b=null,bd=6;for(const v of vehicles){const d=Math.hypot(v.x-fps.x,v.z-fps.z);if(d<bd){bd=d;b=v}}return b}
function enterVeh(v){vehicles.splice(vehicles.indexOf(v),1);const i=col.indexOf(v.k);if(i>=0)col.splice(i,1);player.m=v.m;player.x=v.x;player.z=v.z;player.h=v.h;player.v=0}
function camTps(){const f=fps,cp=Math.cos(f.pitch),dx=Math.sin(f.yaw)*cp,dy=Math.sin(f.pitch),dz=Math.cos(f.yaw)*cp,ty=1.5+f.y;C.position.set(f.x-dx*4.2,Math.max(.5,ty-dy*4.2+.5),f.z-dz*4.2);C.lookAt(f.x,ty,f.z)}
function camCar(){const s=Math.sin(player.h),c=Math.cos(player.h);C.position.set(player.x+s*.4,1.2,player.z+c*.4);C.lookAt(player.x+s*12,1.1,player.z+c*12)}
let last=performance.now();
function loop(t){requestAnimationFrame(loop);const dt=Math.min(.05,(t-last)/1000);last=t;
 if(G.state==='play'){update(dt);tod=(tod+dt/90)%1;if(triggerDown&&fps.on&&document.pointerLockElement)shoot();}
 if(player.m){player.m.position.set(player.x,0,player.z);player.m.rotation.y=player.h;dayApply();gun.visible=fps.on&&!!camMode;pm.visible=fps.on&&!camMode;if(fps.on){pm.position.set(fps.x,0,fps.z);pm.rotation.y=fps.yaw;charAnim(pmc,(keys.up||keys.down||keys.left||keys.right)?(held.s?'run':'walk'):'idle')}chars.forEach(c=>c.mixer&&c.mixer.update(dt));updateCarAnimations(dt,t);player.m.visible=(fps.on||!camMode)&&(fps.on||G.inv<=0||Math.floor(t/90)%2===0)}
 parcels.forEach(p=>{p.box.rotation.y+=dt*2;p.box.position.y=1.8+Math.sin(t/300+p.x)*.3});
 const fx=Math.sin(player.h),fz=Math.cos(player.h),k=1-Math.pow(.002,dt);
 if(fps.on){camMode?camFps():camTps()}else if(camMode){camCar()}else{C.position.lerp(new THREE.Vector3(player.x-fx*14,8,player.z-fz*14),k);C.lookAt(player.x+fx*8,1,player.z+fz*8)}
 sun.position.set(who().x+sunO[0],sunO[1],who().z+sunO[2]);sun.target.position.set(who().x,0,who().z);
 hud();minimap();R.render(S,C)}
window.COURIER_ASSETS_READY.then(manifest=>{ASSETS=manifest;return loadAll()}).then(()=>{buildCity();player.m=carModel('Sports Car',0xd22030);S.add(player.m);{const c=fitChar('Man',1.8);pm=c.g;pmc=c;S.add(pm);pm.visible=false;chars.push(c);charAnim(c,'idle')}buildVehicles();buildPeds();
 const b=$('go');b.disabled=false;b.textContent='Start';b.onclick=()=>start(false);const b2=$('go2');b2.disabled=false;b2.onclick=()=>start(true);requestAnimationFrame(loop)}).catch(error=>{console.error('[City Courier] Startup failed:',error);$('msg').textContent='Hru se nepodařilo načíst. Obnov stránku a zkontroluj připojení.'});
