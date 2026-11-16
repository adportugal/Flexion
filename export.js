(function(root){
'use strict';
const SVG_NS='http://www.w3.org/2000/svg';
let active=null;
const urls=new Set();
const byId=id=>document.getElementById(id);
function releaseLater(url){setTimeout(()=>{URL.revokeObjectURL(url);urls.delete(url);},60000);}
function triggerDownload(url,name){
 const link=document.createElement('a');
 link.href=url;link.download=name;link.rel='noopener';link.style.display='none';
 document.body.appendChild(link);
 try{link.click();}finally{setTimeout(()=>link.remove(),1000);}
}
function serializeSvg(element){
 if(!element||element.namespaceURI!==SVG_NS)throw new Error('La figura todavía no está disponible.');
 const svg=element.cloneNode(true),box=element.viewBox.baseVal;
 if(!(box.width>0&&box.height>0))throw new Error('La figura no tiene dimensiones válidas.');
 svg.setAttribute('xmlns',SVG_NS);
 svg.setAttribute('width',String(Math.ceil(box.width)));
 svg.setAttribute('height',String(Math.ceil(box.height)));
 svg.setAttribute('preserveAspectRatio','xMidYMid meet');
 svg.setAttribute('version','1.1');
 svg.setAttribute('color','#111111');
 svg.setAttribute('style','overflow:hidden;isolation:isolate');
 svg.querySelectorAll('[id="probe-face"],[id="load-probe-face"]').forEach(node=>node.remove());
 // Geometry, colours and MathJax glyph paths are already embedded in the SVG.
 // Remove app-only metadata; gradients, clip paths and marker IDs stay intact.
 for(const node of [svg,...svg.querySelectorAll('*')]){
  for(const attr of [...node.attributes])if(attr.name.startsWith('data-'))node.removeAttribute(attr.name);
 }
 const source='<?xml version="1.0" encoding="UTF-8"?>\n'+new XMLSerializer().serializeToString(svg);
 const parsed=new DOMParser().parseFromString(source,'image/svg+xml');
 if(parsed.querySelector('parsererror'))throw new Error('No se ha podido generar un SVG válido.');
 return {source,width:Math.ceil(box.width),height:Math.ceil(box.height)};
}
function closePanel(){
 const panel=byId('svg-export-panel');if(panel)panel.hidden=true;
 if(active){releaseLater(active.url);active=null;}
 const image=byId('svg-export-preview');if(image){image.onload=null;image.onerror=null;image.removeAttribute('src');}
}
function showSvg(name,source,width,height){
 if(active)releaseLater(active.url);
 const blob=new Blob([source],{type:'image/svg+xml;charset=utf-8'}),url=URL.createObjectURL(blob);
 urls.add(url);active={url,name};
 const panel=byId('svg-export-panel'),save=byId('svg-save-link'),open=byId('svg-open-link'),image=byId('svg-export-preview'),status=byId('svg-export-state');
 byId('svg-export-name').textContent=name;
 byId('svg-export-size').textContent=`${width} × ${height} px · SVG vectorial`;
 save.href=url;save.download=name;open.href=url;
 status.textContent='SVG preparado';
 image.hidden=false;
 image.onload=()=>{status.textContent='SVG listo para guardar';};
 image.onerror=()=>{image.hidden=true;status.textContent='SVG preparado. Puedes guardarlo o abrirlo.';};
 image.src=url;panel.hidden=false;
 // Keep this URL alive while the panel is visible so native links remain usable.
 triggerDownload(url,name);
}
function saveFigure(id,name){
 try{const figure=serializeSvg(byId(id));showSvg(name,figure.source,figure.width,figure.height);}
 catch(error){const alert=byId('error');alert.textContent=error.message;alert.hidden=false;}
}
function downloadData(name,data,type){
 const url=URL.createObjectURL(new Blob([data],{type}));urls.add(url);
 triggerDownload(url,name);releaseLater(url);
}
function init(){
 byId('svg-export-close').addEventListener('click',closePanel);
 byId('svg-save-link').addEventListener('click',()=>{byId('svg-export-state').textContent='Descarga solicitada';});
 document.addEventListener('keydown',event=>{if(event.key==='Escape'&&!byId('svg-export-panel').hidden)closePanel();});
 window.addEventListener('pagehide',()=>{for(const url of urls)URL.revokeObjectURL(url);urls.clear();});
}
root.FigureExport={init,serializeSvg,saveFigure,downloadData,closePanel};
})(window);
