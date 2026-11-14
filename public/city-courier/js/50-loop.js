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
