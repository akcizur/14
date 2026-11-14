(function(root){
 "use strict";
 function clamp(value,min,max){return Math.max(min,Math.min(max,value))}
 function stepVehicle(vehicle,input,dt,maxSpeed){
  const elapsed=Number.isFinite(dt)?Math.max(0,dt):0;
  const controls=input||{};
  const forward=(Number(controls.up)>0?1:0)-(Number(controls.down)>0?1:0);
  const steering=(Number(controls.left)>0?1:0)-(Number(controls.right)>0?1:0);
  if(forward>0)vehicle.v+=22*elapsed;
  else if(forward<0)vehicle.v-=28*elapsed;
  else vehicle.v-=Math.sign(vehicle.v)*Math.min(Math.abs(vehicle.v),10*elapsed);
  vehicle.v=clamp(vehicle.v,-10,Number.isFinite(maxSpeed)?maxSpeed:24);
  vehicle.h+=steering*2.3*elapsed*clamp(vehicle.v/8,-1,1);
  vehicle.x+=Math.sin(vehicle.h)*vehicle.v*elapsed;
  vehicle.z+=Math.cos(vehicle.h)*vehicle.v*elapsed;
  return vehicle;
 }
 function separatePlayers(first,second,minimumDistance){
  const dx=second.x-first.x,dz=second.z-first.z;
  const distance=Math.hypot(dx,dz),minimum=Number.isFinite(minimumDistance)?Math.max(0,minimumDistance):0;
  if(distance>=minimum)return false;
  const nx=distance>.001?dx/distance:1,nz=distance>.001?dz/distance:0;
  const push=(minimum-distance)*.5;
  first.x-=nx*push;first.z-=nz*push;
  second.x+=nx*push;second.z+=nz*push;
  return true;
 }
 root.CourierDriving=Object.freeze({stepVehicle,separatePlayers});
})(globalThis);
