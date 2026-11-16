(function(root){
function camera(three,yaw=35,pitch=16){let t=yaw*Math.PI/180,f=pitch*Math.PI/180;let u=three?[Math.sin(t),0,-Math.cos(t)]:[0,0,-1],v=three?[Math.cos(t)*Math.sin(f),-Math.cos(f),Math.sin(t)*Math.sin(f)]:[0,-1,0],normal=three?[Math.cos(t)*Math.cos(f),Math.sin(f),Math.sin(t)*Math.cos(f)]:[1,0,0];return {u,v,normal,project:([x,y,z])=>[u[0]*x+u[1]*y+u[2]*z,v[0]*x+v[1]*y+v[2]*z],gradient:(a,b)=>{let d=u[1]*v[2]-u[2]*v[1];return [(a*v[2]-b*v[1])/d,(b*u[1]-a*u[2])/d];}};}
function glyph(sigma,y,z,maxAbs,length){let x=Math.abs(sigma)/maxAbs*length;return sigma<0?{start:[x,y,z],end:[0,y,z],kind:'compression'}:{start:[0,y,z],end:[x,y,z],kind:'tension'};}
function insideRing([x,y],p){let c=false;for(let i=0,j=p.length-1;i<p.length;j=i++){let a=p[i],b=p[j];if((a[1]>y)!==(b[1]>y)&&x<(b[0]-a[0])*(y-a[1])/(b[1]-a[1])+a[0])c=!c;}return c;}
function inside(q,rings){return insideRing(q,rings[0])&&!rings.slice(1).some(r=>insideRing(q,r));}
function sample(rings){let pts=rings.flat(),ys=pts.map(q=>q[0]),zs=pts.map(q=>q[1]),ymin=Math.min(...ys),ymax=Math.max(...ys),zmin=Math.min(...zs),zmax=Math.max(...zs),extent=Math.max(ymax-ymin,zmax-zmin),out=[];
for(let i=0;i<8;i++)for(let j=0;j<6;j++){let q=[ymin+(i+.5)/8*(ymax-ymin),zmin+(j+.5)/6*(zmax-zmin)];if(inside(q,rings))out.push(q);}
rings.forEach((r,ri)=>{let area=r.reduce((sum,a,i)=>{let b=r[(i+1)%r.length];return sum+a[0]*b[1]-b[0]*a[1]},0),sg=Math.sign(area)*(ri===0?1:-1),lengths=r.map((a,i)=>Math.hypot(a[0]-r[(i+1)%r.length][0],a[1]-r[(i+1)%r.length][1])),perimeter=lengths.reduce((a,b)=>a+b,0),count=ri===0?28:20;for(let j=0;j<count;j++){let dist=(j+.5)/count*perimeter,i=0;while(i<r.length-1&&dist>lengths[i]){dist-=lengths[i];i++;}let a=r[i],b=r[(i+1)%r.length],L=lengths[i],t=dist/L,y=a[0]+t*(b[0]-a[0]),z=a[1]+t*(b[1]-a[1]);for(let step=1e-4;step>=1e-10;step/=10){let e=extent*step,q=[y-sg*(b[1]-a[1])/L*e,z+sg*(b[0]-a[0])/L*e];if(inside(q,rings)){if(!out.some(p=>Math.hypot(p[0]-q[0],p[1]-q[1])<extent*.06))out.push(q);break;}}}});return out;}
// Piecewise-linear envelope of the free arrow ends, split at zero stress.
function envelope(rings,stress,maxAbs,length){
let lines=[],sides=[],eps=Math.max(maxAbs,1)*1e-10;
const free=q=>[Math.abs(stress.at(...q))/maxAbs*length,...q];
function segment(a,b,kind){let fa=stress.at(...a),fb=stress.at(...b);if(Math.abs(fa)<eps&&Math.abs(fb)<eps)return;let points=[a];if(fa*fb<0){let t=fa/(fa-fb);points.push([a[0]+t*(b[0]-a[0]),a[1]+t*(b[1]-a[1])]);}points.push(b);for(let i=0;i<points.length-1;i++){let u=points[i],v=points[i+1],sign=stress.at((u[0]+v[0])/2,(u[1]+v[1])/2)<0?'compression':'tension',a3=free(u),b3=free(v);lines.push({a:a3,b:b3,kind,sign});if(kind==='boundary')sides.push({points:[[0,...u],a3,b3,[0,...v]],sign});}}
rings.forEach(r=>{for(let i=0;i<r.length;i++)segment(r[i],r[(i+1)%r.length],'boundary');let stride=r.length>40?Math.ceil(r.length/12):1;for(let i=0;i<r.length;i+=stride){let q=r[i],sigma=stress.at(...q);if(Math.abs(sigma)>eps)lines.push({a:[0,...q],b:free(q),kind:'rail',sign:sigma<0?'compression':'tension'});}});
let pts=rings.flat();for(let axis=0;axis<2;axis++){let values=pts.map(q=>q[axis]),lo=Math.min(...values),hi=Math.max(...values),n=axis===0?8:6;
for(let j=0;j<n;j++){let coord=lo+(j+.5)/n*(hi-lo),hits=[];for(let ring of rings)for(let i=0;i<ring.length;i++){let a=ring[i],b=ring[(i+1)%ring.length];if((a[axis]<=coord&&b[axis]>coord)||(b[axis]<=coord&&a[axis]>coord)){let t=(coord-a[axis])/(b[axis]-a[axis]);hits.push(a[1-axis]+t*(b[1-axis]-a[1-axis]));}}
hits.sort((a,b)=>a-b);for(let i=0;i<hits.length-1;i++){let a=axis===0?[coord,hits[i]]:[hits[i],coord],b=axis===0?[coord,hits[i+1]]:[hits[i+1],coord],mid=[(a[0]+b[0])/2,(a[1]+b[1])/2];if(Math.hypot(a[0]-b[0],a[1]-b[1])>1e-9&&inside(mid,rings))segment(a,b,'grid');}}}
return {lines,sides};}
function angles(My,Mz,stress){let magnitude=Math.hypot(My,Mz),g=Math.hypot(stress.a,stress.b);let theta=magnitude<1e-12?null:Math.atan2(My,Mz)*180/Math.PI,beta=g<1e-14?null:((Math.atan2(stress.b,-stress.a)*180/Math.PI)%180+180)%180;return {magnitude,theta:theta===-180?180:theta,beta};}
// Smooth projected circular arcs. Each cubic spans at most 90 degrees;
// its endpoint tangent is exact, including oblique 3D projections.
function arc2D(center,u,v,start,end){
const at=t=>[center[0]+u[0]*Math.cos(t)+v[0]*Math.sin(t),center[1]+u[1]*Math.cos(t)+v[1]*Math.sin(t)];
const derivative=t=>[-u[0]*Math.sin(t)+v[0]*Math.cos(t),-u[1]*Math.sin(t)+v[1]*Math.cos(t)];
let delta=end-start,tip=at(end);if(Math.abs(delta)<1e-8)return {d:'',tip,tangent:[0,0],length:0};
let n=Math.ceil(Math.abs(delta)/(Math.PI/2)),d='M'+at(start).join(','),length=0,previous=at(start);
for(let i=0;i<n;i++){let a=start+delta*i/n,b=start+delta*(i+1)/n,k=4/3*Math.tan((b-a)/4),pa=at(a),pb=at(b),da=derivative(a),db=derivative(b);d+='C'+[pa[0]+k*da[0],pa[1]+k*da[1],pb[0]-k*db[0],pb[1]-k*db[1],...pb].join(',');}
for(let i=1;i<=96;i++){let q=at(start+delta*i/96);length+=Math.hypot(q[0]-previous[0],q[1]-previous[1]);previous=q;}
let t=derivative(end),speed=Math.hypot(...t),sign=Math.sign(delta);return {d,tip,tangent:t.map(x=>x/speed*sign),length};}
function momentCircle(axis,value,radius){let sign=Math.sign(value)||1;
// Moment circles are centred at the origin of their actual rotation axes.
// My: y=0 (x-z plane). Mz: z=0 (x-y plane).
return {center:[0,0,0],u:[radius,0,0],v:axis==='y'?[0,0,-radius]:[0,radius,0],start:-sign*(axis==='y'?1.10:1.25),end:sign*(axis==='y'?Math.PI/2:1.25)};}
function projectedCircle(circle,project){let c=project(circle.center),basis=q=>project(q.map((x,i)=>x+circle.center[i])).map((x,i)=>x-c[i]);return arc2D(c,basis(circle.u),basis(circle.v),circle.start,circle.end);}
root.ViewMath={camera,glyph,inside,sample,envelope,angles,arc2D,momentCircle,projectedCircle};if(typeof module!=='undefined')module.exports=root.ViewMath;
})(typeof window!=='undefined'?window:globalThis);
