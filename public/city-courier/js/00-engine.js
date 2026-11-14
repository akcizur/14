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

