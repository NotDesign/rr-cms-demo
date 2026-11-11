import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

const context=vm.createContext({});
vm.runInContext(readFileSync(new URL('../login-demo/scene-framing.js',import.meta.url),'utf8'),context);
const {fit}=context.RR_SCENE_FRAMING;
const scenes=[{imageWidth:1672,imageHeight:941,subject:[0,0,.68,1]}];
for(const [width,height] of [[1820,1187],[1920,1080],[1662,1239],[1440,900],[1366,768],[1100,900],[834,1112],[390,844],[320,568]]) {
  test(`portal character bounds fit outside the form at ${width}x${height}`,()=>{
    const stacked=width<1100;
    const cardLeft=width-32-Math.min(400,Math.max(360,width*.28));
    const inset=width<600?16:24,headerBottom=width<600?56:72;
    const sceneHeight=Math.round(Math.max(404,Math.min(680,width*.68+60)));
    const area=stacked
      ?{left:inset,top:headerBottom+16,width:width-inset*2,height:sceneHeight-headerBottom-96}
      :{left:0,top:0,width:cardLeft-16,height};
    for(const scene of scenes){
      const frame=fit({...scene,area}),[left,top,right,bottom]=scene.subject;
      const bounds={left:frame.left+frame.width*left,top:frame.top+frame.height*top,right:frame.left+frame.width*right,bottom:frame.top+frame.height*bottom};
      assert.ok(bounds.left>=area.left-1e-6);
      assert.ok(bounds.top>=area.top-1e-6);
      assert.ok(bounds.right<=area.left+area.width+1e-6);
      assert.ok(bounds.bottom<=area.top+area.height+1e-6);
      assert.ok(Math.abs(frame.width/frame.height-scene.imageWidth/scene.imageHeight)<1e-9,'art must not stretch');
      if(!stacked)assert.ok(bounds.right<=cardLeft-16+1e-6,'keep 16px before the login card');
      if(width===1820)assert.ok(bounds.top<28&&height-bounds.bottom<28,'keep top and bottom space below 28px at the reported viewport');
    }
  });
}
