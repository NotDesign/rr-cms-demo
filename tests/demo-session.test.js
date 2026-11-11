import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

const source=readFileSync(new URL('../login-demo/demo-session.js',import.meta.url),'utf8');
function browser({page='cms',url='https://example.com/rr-cms-demo/',base='/rr-cms-demo/',storage=new Map(),blocked=false}={}){
  const events={},attributes=new Set(['data-demo-session-pending']),redirects=[];
  const location={href:url,hash:new URL(url).hash,replace(value){redirects.push(value);this.href=value;this.hash=new URL(value).hash;}};
  const context={URL,location,sessionStorage:{
    getItem(key){if(blocked)throw Error('blocked');return storage.get(key)??null;},
    setItem(key,value){if(blocked)throw Error('blocked');storage.set(key,value);},
    removeItem(key){if(blocked)throw Error('blocked');storage.delete(key);}
  },document:{currentScript:{src:'https://example.com'+base+'login-demo/demo-session.js?v=1',dataset:{page}},documentElement:{
    setAttribute(name){attributes.add(name);},removeAttribute(name){attributes.delete(name);}
  }}};
  context.window={addEventListener(name,listener){events[name]=listener;}};
  vm.runInNewContext(source,context);
  return {session:context.window.RRDemoSession,events,attributes,redirects,storage,location};
}
test('unauthenticated CMS redirects to its own login, retaining the requested report',()=>{
  const b=browser({url:'https://example.com/rr-cms-demo/#slots'});
  assert.equal(b.redirects[0],'https://example.com/rr-cms-demo/login-demo/?v=14.6.4&view=%23slots');
  assert.equal(b.attributes.has('data-demo-session-pending'),true);
});
test('login saves only a per-project marker and returns to the requested CMS report',()=>{
  const b=browser({page:'login',url:'https://example.com/rr-cms-demo/login-demo/?v=14.6.4&view=%23slots'});
  assert.equal(b.session.start(),true);b.session.enter();
  assert.deepEqual([...b.storage],[['rr-cms-demo-session:/rr-cms-demo/','active']]);
  assert.equal(b.redirects.at(-1),'https://example.com/rr-cms-demo/?v=14.6.4#slots');
});
test('a return value cannot navigate outside the CMS',()=>{
  for(const view of ['https://example.org/','//example.org/','javascript:alert(1)','../']){
    const b=browser({page:'login',url:'https://example.com/rr-cms-demo/login-demo/?view='+encodeURIComponent(view)});
    b.session.enter();assert.equal(b.redirects[0],'https://example.com/rr-cms-demo/?v=14.6.4');
  }
});
test('refresh and BFCache recheck the session; logout keeps unrelated preferences',()=>{
  const storage=new Map([['rr-cms-demo-session:/rr-cms-demo/','active'],['preference','keep']]);
  const b=browser({storage});assert.equal(b.redirects.length,0);assert.equal(b.attributes.size,0);
  b.events.pagehide();assert.equal(b.attributes.has('data-demo-session-pending'),true);
  b.events.pageshow();assert.equal(b.attributes.size,0);
  b.session.logout();assert.equal(storage.get('preference'),'keep');assert.equal(b.session.hasSession(),false);
  assert.equal(b.redirects.at(-1),'https://example.com/rr-cms-demo/login-demo/?v=14.6.4');
  b.events.pageshow();assert.equal(b.attributes.has('data-demo-session-pending'),true);
});
test('blocked storage does not pretend login succeeded or throw',()=>{
  const b=browser({page:'login',blocked:true});assert.equal(b.session.start(),false);assert.equal(b.session.hasSession(),false);
  assert.equal(b.redirects.length,0);
});
test('root hosting works and separate projects do not share demo sessions',()=>{
  const root=browser({page:'login',base:'/',url:'https://example.com/login-demo/'});
  root.session.start();root.session.enter();assert.equal(root.redirects[0],'https://example.com/?v=14.6.4');
  const other=browser({storage:root.storage});assert.equal(other.session.hasSession(),false);
});
test('opening a downloaded CMS file redirects to the hosted login and retains the report',()=>{
  const b=browser({url:'file:///tmp/rr-cms-demo/index.html#slots',blocked:true});
  assert.deepEqual(b.redirects,['https://notdesign.github.io/rr-cms-demo/login-demo/?v=14.6.4&view=%23slots']);
  assert.equal(b.session.start(),false);
  assert.equal(b.storage.size,0);
});
test('opening the downloaded login uses GitHub and ignores external return targets',()=>{
  for(const [view,expected] of [['%23slots','&view=%23slots'],['https%3A%2F%2Fexample.org','']]){
    const b=browser({page:'login',url:'file:///tmp/rr-cms-demo/login-demo/index.html?view='+view,blocked:true});
    assert.equal(b.redirects[0],'https://notdesign.github.io/rr-cms-demo/login-demo/?v=14.6.4'+expected);
    assert.equal(b.session.hasSession(),false);
  }
});
