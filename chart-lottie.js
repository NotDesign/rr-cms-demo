// The local light player renders chart geometry; labels and hit targets stay native.
export const LOTTIE_FRAMES=30;
const fixed=k=>({a:0,k});
const animated=(from,to)=>({a:1,k:[{t:0,s:[from],e:[to],o:{x:.333,y:.333},i:{x:.667,y:.667}},{t:LOTTIE_FRAMES,s:[to]}]});
const shape=vertices=>({v:vertices,i:vertices.map(()=>[0,0]),o:vertices.map(()=>[0,0]),c:false});
const shapeTween=(from,to)=>({a:1,k:[{t:0,s:[shape(from)],e:[shape(to)],o:{x:.333,y:.333},i:{x:.667,y:.667}},{t:LOTTIE_FRAMES,s:[shape(to)]}]});
const stroke=(color,width)=>({ty:'st',c:fixed(color),o:fixed(100),w:fixed(width),lc:2,lj:2,ml:4});
const layer=(name,shapes,opacity)=>({ty:4,nm:name,sr:1,st:0,ip:0,op:LOTTIE_FRAMES+1,ks:{o:opacity,r:fixed(0),p:fixed([0,0,0]),a:fixed([0,0,0]),s:fixed([100,100,100])},shapes});
export function lineLayer(name,from,to,color,fromOpacity=0,toOpacity=1){
 return layer(name,[{ty:'sh',ks:shapeTween(from,to)},stroke(color,2.5)],animated(fromOpacity*100,toOpacity*100));
}
export function arcLayer(name,from,to,color){
 // A closed clockwise circle starts at 12 o'clock, matching donutArc().
 const k=70*.5522847498307936,circle={v:[[100,30],[170,100],[100,170],[30,100]],i:[[-k,0],[0,-k],[k,0],[0,k]],o:[[k,0],[0,k],[-k,0],[0,-k]],c:true};
 return layer(name,[{ty:'sh',ks:fixed(circle)},{...stroke(color,24),lc:1},{ty:'tm',s:animated(from.start*100,to.start*100),e:animated(from.end*100,to.end*100),o:fixed(0),m:1}],animated(from.opacity*100,to.opacity*100));
}
export function chartAnimation(width,height,layers){
 return {v:'5.13.0',fr:60,ip:0,op:LOTTIE_FRAMES+1,w:width,h:height,nm:'R&R data chart',ddd:0,assets:[],layers};
}
export function chartColor(element){
 const rgb=getComputedStyle(element).stroke.match(/[\d.]+/g);
 return rgb?.length>=3?rgb.slice(0,3).map(v=>Number(v)/255):[0,207/255,123/255];
}
export function mountLottieChart(svg,layers,elements,player=globalThis.lottie){
 if(!player?.loadAnimation||!layers.length||!svg?.isConnected)return null;
 const box=svg.viewBox.baseVal;if(!box.width||!box.height)return null;
 const fo=document.createElementNS('http://www.w3.org/2000/svg','foreignObject');
 fo.setAttribute('x',box.x);fo.setAttribute('y',box.y);fo.setAttribute('width',box.width);fo.setAttribute('height',box.height);fo.setAttribute('aria-hidden','true');fo.classList.add('chart-lottie-layer');
 const host=document.createElementNS('http://www.w3.org/1999/xhtml','div');host.className='chart-lottie-host';host.style.opacity='0';fo.append(host);svg.insertBefore(fo,elements[0]);
 let animation,disposed=false,ready=false,progress=0;
 const original=elements.map(el=>({el,value:el.style.getPropertyValue('opacity'),priority:el.style.getPropertyPriority('opacity')}));
 const destroy=()=>{
  if(disposed)return;disposed=true;
  for(const {el,value,priority} of original)value?el.style.setProperty('opacity',value,priority):el.style.removeProperty('opacity');
  animation?.removeEventListener('DOMLoaded',loaded);animation?.removeEventListener('data_failed',destroy);animation?.removeEventListener('error',destroy);animation?.destroy();fo.remove();
 };
 const render=t=>{progress=t;if(ready&&!disposed)try{animation.goToAndStop(Math.max(0,Math.min(1,t))*LOTTIE_FRAMES,true);}catch{destroy();}};
 const loaded=()=>{
  if(disposed||!svg.isConnected){destroy();return;}ready=true;render(progress);if(disposed)return;
  original.forEach(({el})=>el.style.setProperty('opacity','0'));host.style.opacity='1';svg.dataset.chartMotion='lottie';
 };
 try{
  animation=player.loadAnimation({container:host,renderer:'svg',loop:false,autoplay:false,animationData:chartAnimation(box.width,box.height,layers),rendererSettings:{preserveAspectRatio:'none',progressiveLoad:false,focusable:false}});
  animation.setSubframe(true);animation.addEventListener('DOMLoaded',loaded);animation.addEventListener('data_failed',destroy);animation.addEventListener('error',destroy);if(animation.isLoaded)loaded();
 }catch{destroy();return null;}
 return {render,destroy};
}
