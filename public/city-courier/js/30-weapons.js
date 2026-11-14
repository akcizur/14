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
 