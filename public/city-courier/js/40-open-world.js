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
 streetLights.forEach(({light,bulbMaterial})=>{
  light.intensity=night*1.65;
  bulbMaterial.color.setRGB(.23+.77*night,.25+.57*night,.29+.34*night);
 });
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
 if(dt>0&&!fps.on&&Math.abs(player.v)>4&&Math.hypot(x-player.x,z-player.z)<2.4)killPed(p);
 if(dt>0&&player2.active&&Math.abs(player2.v)>4&&Math.hypot(x-player2.x,z-player2.z)<2.4)killPed(p)}
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
