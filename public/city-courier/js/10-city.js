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

