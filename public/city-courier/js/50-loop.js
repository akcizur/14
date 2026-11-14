let last=performance.now();
function loop(t){
 requestAnimationFrame(loop);
 const dt=Math.min(.05,(t-last)/1000);last=t;
 if(G.state==='play'){update(dt);tod=(tod+dt/90)%1;if(triggerDown&&fps.on&&document.pointerLockElement)shoot()}
 if(player.m){
  player.m.position.set(player.x,0,player.z);player.m.rotation.y=player.h;
  if(player2.active&&player2.m){player2.m.position.set(player2.x,0,player2.z);player2.m.rotation.y=player2.h}
  dayApply();gun.visible=fps.on&&!!camMode;pm.visible=fps.on&&!camMode;
  if(fps.on){pm.position.set(fps.x,0,fps.z);pm.rotation.y=fps.yaw;charAnim(pmc,(keys.up||keys.down||keys.left||keys.right)?(held.s?'run':'walk'):'idle')}
  chars.forEach(c=>c.mixer&&c.mixer.update(dt));updateCarAnimations(dt,t);
  player.m.visible=(fps.on||!camMode)&&(fps.on||G.inv<=0||Math.floor(t/90)%2===0);
 }
 parcels.forEach(p=>{p.box.rotation.y+=dt*2;p.box.position.y=1.8+Math.sin(t/300+p.x)*.3});
 const fx=Math.sin(player.h),fz=Math.cos(player.h),k=1-Math.pow(.002,dt);
 if(fps.on){camMode?camFps():camTps()}
 else if(camMode){camCar()}
 else{C.position.lerp(new THREE.Vector3(player.x-fx*14,8,player.z-fz*14),k);C.lookAt(player.x+fx*8,1,player.z+fz*8)}
 if(player2.active){
  const fx2=Math.sin(player2.h),fz2=Math.cos(player2.h);
  C2.position.lerp(new THREE.Vector3(player2.x-fx2*14,8,player2.z-fz2*14),k);
  C2.lookAt(player2.x+fx2*8,1,player2.z+fz2*8);
 }
 const first=who(),focus=player2.active?{x:(first.x+player2.x)*.5,z:(first.z+player2.z)*.5}:first;
 sun.position.set(focus.x+sunO[0],sunO[1],focus.z+sunO[2]);sun.target.position.set(focus.x,0,focus.z);
 hud();minimap();
 if(splitMode){
  const leftWidth=Math.floor(innerWidth/2),rightWidth=innerWidth-leftWidth;
  R.setScissorTest(true);
  R.setViewport(0,0,leftWidth,innerHeight);R.setScissor(0,0,leftWidth,innerHeight);R.render(S,C);
  R.setViewport(leftWidth,0,rightWidth,innerHeight);R.setScissor(leftWidth,0,rightWidth,innerHeight);R.render(S,C2);
  R.setScissorTest(false);
 }else R.render(S,C);
}
window.COURIER_ASSETS_READY.then(manifest=>{ASSETS=manifest;return loadAll()}).then(()=>{
 buildCity();player.m=carModel('Sports Car',0xd22030);S.add(player.m);
 {const c=fitChar('Man',1.8);pm=c.g;pmc=c;S.add(pm);pm.visible=false;chars.push(c);charAnim(c,'idle')}
 buildVehicles();buildPeds();
 const b=$('go');b.disabled=false;b.textContent='Start';b.onclick=()=>start(false);
 const b2=$('go2');b2.disabled=false;b2.onclick=()=>start(true);
 const b3=$('go3');b3.disabled=false;b3.onclick=()=>startSplit();
 requestAnimationFrame(loop)
}).catch(error=>{console.error('[City Courier] Startup failed:',error);$('msg').textContent='Hru se nepodařilo načíst. Obnov stránku a zkontroluj připojení.'});
