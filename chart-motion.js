const running=new WeakMap();
const duration=280;
const svgNS='http://www.w3.org/2000/svg';
export function donutArc(start,end){
 const size=Math.max(0,end-start),at=t=>[100+70*Math.cos(t*2*Math.PI-Math.PI/2),100+70*Math.sin(t*2*Math.PI-Math.PI/2)].join(' ');
 if(size<.000001)return 'M '+at(start);
 if(size>=.999999)return 'M '+at(start)+' A 70 70 0 1 1 '+at(start+.5)+' A 70 70 0 1 1 '+at(start+1);
 return 'M '+at(start)+' A 70 70 0 '+(size>.5?1:0)+' 1 '+at(end);
}
export const chartEase=t=>1-Math.pow(1-Math.max(0,Math.min(1,t)),3);
const points=value=>value.trim().split(/\s+/).filter(Boolean).map(p=>p.split(',').map(Number));
const bars=root=>[...root.querySelectorAll('.ranking-track i,.share-track>span,.bar-space>span,.distribution .bar')].map((el,i)=>{const prop=el.closest('.bar-space')?'height':'width',scope=el.closest('[data-game]')?.dataset.game||el.closest('.hour-column')?.getAttribute('aria-label')||i;return {el,prop,key:el.parentElement.className+':'+scope};});
export function cancelChartMotion(root){const active=running.get(root);if(active){cancelAnimationFrame(active.frame);active.clean();running.delete(root);}}
export function captureChartState(root){
 const state={lines:new Map(),arcs:new Map(),numbers:new Map(),bars:new Map()};if(!root)return state;
 for(const svg of root.querySelectorAll('.line-chart'))state.lines.set(svg.id,{periods:svg.dataset.periods,series:new Map([...svg.querySelectorAll('polyline[data-chart-series]')].map(el=>[el.dataset.chartSeries,{points:points(el.getAttribute('points')),stroke:el.getAttribute('stroke'),opacity:Number(el.getAttribute('opacity')??1)}]))});
 for(const el of root.querySelectorAll('[data-donut-key]'))state.arcs.set(el.dataset.donutKey,{start:Number(el.dataset.currentStart??el.dataset.arcStart),end:Number(el.dataset.currentEnd??el.dataset.arcEnd),opacity:Number(el.getAttribute('opacity')??(el.dataset.arcVisible==='true'?1:0))});
 for(const el of root.querySelectorAll('[data-chart-number]'))state.numbers.set(el.dataset.chartNumber,Number(el.dataset.currentValue??el.dataset.chartValue));
 for(const b of bars(root))state.bars.set(b.key,parseFloat(b.el.style[b.prop])||0);
 cancelChartMotion(root);return state;
}
export function animateCharts(root,previous={lines:new Map(),arcs:new Map(),numbers:new Map(),bars:new Map()},translate=value=>value){
 if(!root)return;cancelChartMotion(root);
 if(matchMedia('(prefers-reduced-motion: reduce)').matches)return;
 const tasks=[],ghosts=[];
 for(const el of root.querySelectorAll('[data-donut-key]')){
  const start=Number(el.dataset.arcStart),end=Number(el.dataset.arcEnd),opacity=el.dataset.arcVisible==='true'?1:0,old=previous.arcs.get(el.dataset.donutKey)||{start,end:start,opacity:0};
  tasks.push(t=>{const a=old.start+(start-old.start)*t,b=old.end+(end-old.end)*t;el.setAttribute('d',donutArc(a,b));el.setAttribute('opacity',old.opacity+(opacity-old.opacity)*t);el.dataset.currentStart=a;el.dataset.currentEnd=b;});
 }
 for(const svg of root.querySelectorAll('.line-chart')){
  const old=previous.lines.get(svg.id),same=old?.periods===svg.dataset.periods,visible=new Set();
  for(const el of svg.querySelectorAll('polyline[data-chart-series]')){
   const key=el.dataset.chartSeries,target=points(el.getAttribute('points')),prior=same?old.series.get(key):null,from=prior?.points.length===target.length?prior.points:target.map(([x])=>[x,200]),dots=[...svg.querySelectorAll('circle[data-chart-series="'+key+'"]')];visible.add(key);
   tasks.push(t=>{const ps=target.map(([x,y],i)=>[from[i][0]+(x-from[i][0])*t,from[i][1]+(y-from[i][1])*t]);el.setAttribute('points',ps.map(p=>p.join(',')).join(' '));el.setAttribute('opacity',(prior?.opacity??0)+(1-(prior?.opacity??0))*t);dots.forEach((dot,i)=>{dot.setAttribute('cx',ps[i][0]);dot.setAttribute('cy',ps[i][1]);dot.setAttribute('opacity',(prior?.opacity??0)+(1-(prior?.opacity??0))*t);});});
  }
  if(same)for(const [key,prior] of old.series)if(!visible.has(key)){
   const el=document.createElementNS(svgNS,'polyline');el.dataset.chartSeries=key;el.setAttribute('fill','none');el.setAttribute('stroke',prior.stroke);el.setAttribute('stroke-width','2.5');el.setAttribute('aria-hidden','true');el.style.pointerEvents='none';svg.insertBefore(el,svg.firstChild);ghosts.push(el);
   tasks.push(t=>{el.setAttribute('points',prior.points.map(([x,y])=>x+','+(y+(200-y)*t)).join(' '));el.setAttribute('opacity',prior.opacity*(1-t));});
  }
 }
 for(const el of root.querySelectorAll('[data-chart-number]')){
  const key=el.dataset.chartNumber,to=Number(el.dataset.chartValue),from=previous.numbers.get(key)??0,decimals=Number(el.dataset.chartDecimals||0),suffix=translate(el.dataset.chartSuffix||'');
  tasks.push(t=>{const v=from+(to-from)*t;el.dataset.currentValue=v;el.textContent=v.toLocaleString('en-US',{minimumFractionDigits:decimals,maximumFractionDigits:decimals})+suffix;});
 }
 for(const b of bars(root)){const to=parseFloat(b.el.style[b.prop])||0,from=previous.bars.get(b.key)??0;tasks.push(t=>{b.el.style[b.prop]=(from+(to-from)*t)+'%';});}
 if(!tasks.length)return;
 const clean=()=>{ghosts.forEach(el=>el.remove());root.classList.remove('chart-is-animating');};
 const active={frame:0,clean},start=performance.now();root.classList.add('chart-is-animating');running.set(root,active);tasks.forEach(f=>f(0));
 const tick=now=>{if(running.get(root)!==active)return;const elapsed=Math.min(1,(now-start)/duration);tasks.forEach(f=>f(chartEase(elapsed)));if(elapsed<1&&root.isConnected)active.frame=requestAnimationFrame(tick);else{tasks.forEach(f=>f(1));clean();running.delete(root);}};
 active.frame=requestAnimationFrame(tick);
}
