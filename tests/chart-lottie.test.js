import {test} from 'node:test';
import assert from 'node:assert/strict';
import {LOTTIE_FRAMES,lineLayer,arcLayer,chartAnimation,mountLottieChart} from '../chart-lottie.js';

test('line animation preserves exact previous and filtered geometry, including negative values',()=>{
 const from=[[52,200],[103.25,167.125]],to=[[52,200],[103.25,-4.75]];
 const line=lineLayer('payout',from,to,[0,.8,.5],.65,1),frames=line.shapes[0].ks.k;
 assert.deepEqual(frames[0].s[0].v,from);assert.deepEqual(frames[1].s[0].v,to);
 assert.equal(frames[1].t,LOTTIE_FRAMES);assert.equal(line.ks.o.k[0].s[0],65);assert.equal(line.ks.o.k[1].s[0],100);
 assert.equal(lineLayer('removed',to,from,[1,1,1],1,0).ks.o.k[1].s[0],0);
});
test('donut animation recalculates zero, partial and full-circle trims without rounding shares',()=>{
 for(const end of [0,1/3,1]){
  const arc=arcLayer('share',{start:.1,end:.2,opacity:.5},{start:0,end,opacity:end?1:0},[1,.75,.4]),trim=arc.shapes.find(s=>s.ty==='tm');
  assert.equal(trim.s.k[1].s[0],0);assert.equal(trim.e.k[1].s[0],end*100);
  assert.equal(arc.shapes.find(s=>s.ty==='st').lc,1);assert.ok(arc.shapes[0].ks.k.c);
 }
 const data=chartAnimation(720,232,[lineLayer('players',[[0,200]],[[0,42]],[1,1,1])]);
 assert.equal(data.w,720);assert.equal(data.h,232);assert.deepEqual(data.assets,[]);assert.doesNotMatch(JSON.stringify(data),/NaN|Infinity/);
});

function fixture(){
 const nodes=[],frames=[],handlers=new Map();let destroyed=0,options;
 const node=()=>({style:{opacity:''},setAttribute(){},classList:{add(){}},append(){},remove(){this.removed=true;}});
 const values=new Map([['opacity',['.8','important']]]),style={getPropertyValue:k=>values.get(k)?.[0]||'',getPropertyPriority:k=>values.get(k)?.[1]||'',setProperty:(k,v,p='')=>values.set(k,[v,p]),removeProperty:k=>values.delete(k)};
 const el={style},svg={isConnected:true,viewBox:{baseVal:{x:0,y:0,width:200,height:200}},dataset:{},insertBefore:n=>nodes.push(n)};
 const doc={createElementNS:()=>node()},animation={isLoaded:false,setSubframe(){},addEventListener:(n,f)=>handlers.set(n,f),removeEventListener:(n,f)=>{if(handlers.get(n)===f)handlers.delete(n);},goToAndStop:(...v)=>frames.push(v),destroy:()=>destroyed++};
 const player={loadAnimation:value=>{options=value;return animation;}},layers=[arcLayer('a',{start:0,end:0,opacity:0},{start:0,end:1,opacity:1},[1,1,1])];
 return {doc,svg,el,player,animation,layers,nodes,frames,handlers,get destroyed(){return destroyed;},get options(){return options;}};
}
function withDocument(f,run){const old=globalThis.document;globalThis.document=f.doc;try{return run();}finally{if(old===undefined)delete globalThis.document;else globalThis.document=old;}}
test('local player shares chart progress, is non-looping and restores native SVG on cleanup',()=>{
 const f=fixture();withDocument(f,()=>{
  const motion=mountLottieChart(f.svg,f.layers,[f.el],f.player);
  assert.equal(f.options.loop,false);assert.equal(f.options.autoplay,false);assert.equal(f.options.renderer,'svg');
  motion.render(.4);assert.equal(f.el.style.getPropertyValue('opacity'),'.8');
  f.handlers.get('DOMLoaded')();assert.equal(f.el.style.getPropertyValue('opacity'),'0');assert.deepEqual(f.frames.at(-1),[12,true]);
  motion.render(1);assert.deepEqual(f.frames.at(-1),[30,true]);
  motion.destroy();motion.destroy();assert.equal(f.destroyed,1);assert.equal(f.el.style.getPropertyValue('opacity'),'.8');assert.equal(f.el.style.getPropertyPriority('opacity'),'important');assert.ok(f.nodes[0].removed);assert.equal(f.handlers.size,0);
 });
});
test('missing or failing player keeps a usable native chart without hidden paths',()=>{
 const f=fixture();assert.equal(mountLottieChart(f.svg,f.layers,[f.el],{}),null);
 withDocument(f,()=>{
  const motion=mountLottieChart(f.svg,f.layers,[f.el],f.player);f.handlers.get('DOMLoaded')();f.handlers.get('data_failed')();
  assert.equal(f.el.style.getPropertyValue('opacity'),'.8');assert.equal(f.destroyed,1);motion.destroy();assert.equal(f.destroyed,1);
  assert.equal(mountLottieChart(f.svg,f.layers,[f.el],{loadAnimation(){throw Error('unavailable');}}),null);
  assert.equal(f.el.style.getPropertyValue('opacity'),'.8');assert.ok(f.nodes.every(n=>n.removed));
 });
});
test('cancelling before load prevents a late ready callback from hiding native paths',()=>{
 const f=fixture();withDocument(f,()=>{
  const motion=mountLottieChart(f.svg,f.layers,[f.el],f.player),loaded=f.handlers.get('DOMLoaded');motion.destroy();loaded();
  assert.equal(f.destroyed,1);assert.equal(f.el.style.getPropertyValue('opacity'),'.8');assert.equal(f.svg.dataset.chartMotion,undefined);
 });
});
test('frame rendering failures immediately restore native paths and stop the failed player',()=>{
 const f=fixture();withDocument(f,()=>{
  f.animation.goToAndStop=()=>{throw Error('renderer stopped');};
  const motion=mountLottieChart(f.svg,f.layers,[f.el],f.player);assert.doesNotThrow(()=>f.handlers.get('DOMLoaded')());
  motion.render(.8);assert.equal(f.destroyed,1);assert.equal(f.el.style.getPropertyValue('opacity'),'.8');assert.ok(f.nodes[0].removed);
 });
});
