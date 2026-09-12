const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const ts = require('typescript');
function load(file, mocks = {}, cache = {}) {
  const full = path.resolve(file);
  if (cache[full]) return cache[full];
  const exports = {};
  cache[full] = exports;
  const code = ts.transpileModule(fs.readFileSync(full, 'utf8'), {compilerOptions:{module:ts.ModuleKind.CommonJS, esModuleInterop:true}}).outputText;
  const localRequire = name => mocks[name] ?? (name.startsWith('.') ? load(path.resolve(path.dirname(full), name + '.ts'), mocks, cache) : require(name));
  new Function('exports', 'require', code)(exports, localRequire);
  return exports;
}
module.exports = { load };
if (require.main === module) (async () => {
  const realFetch = global.fetch;
  let handler;
  let sent;
  const { installLocalDemoRelay } = load('lib/localDemoRelay.ts');
  await installLocalDemoRelay({route: async (_, callback) => {handler = callback;}}, new URL('http://localhost:3000/clone-portal/english-redelivery'));
  global.fetch = async (url, options) => {sent = {url, options}; return Response.json({ok:true});};
  const runRoute = async (url, method = 'GET') => {
    let result;
    await handler({request: () => ({url:()=>url, method:()=>method, headers:()=>({'content-type':'application/json'}), postData:()=>method === 'POST' ? '{"name":"Demo"}' : null}), fulfill:async data=>{result=data;}, abort:async()=>{result='aborted';}});
    return result;
  };
  try {
    assert.equal((await runRoute('http://localhost:3000/clone-portal/english-redelivery')).status, 200);
    assert.equal((await runRoute('http://localhost:3000/api/target-logs','POST')).status, 200);
    assert.equal(sent.options.body, '{"name":"Demo"}');
    assert.equal(await runRoute('http://localhost:3000/api/swarm/launch','POST'), 'aborted');
    assert.equal(await runRoute('http://localhost:9000/private'), 'aborted');
    assert.equal(await runRoute('https://example.com'), 'aborted');
  } finally {global.fetch = realFetch;}
  for (const fail of [false, true]) {
    let released = 0;
    let closed = 0;
    const nodes = new Map();
    const page = {goto:async()=>({ok:()=>!fail,status:()=>fail?404:200}), locator:()=>({waitFor:async()=>{}}), $:async()=>({fill:async()=>{},click:async()=>{}}), waitForTimeout:async()=>{}, url:()=> 'http://localhost:3000/target-portal', waitForResponse:async()=>({ok:()=>true})};
    const context = {route:async()=>{},pages:()=>[page]};
    const browser = {contexts:()=>[context],close:async()=>{closed++;}};
    class Steel {sessions={create:async options=>{assert.equal(options.useProxy,false);assert.equal(options.solveCaptcha,false);return {id:'test',debugUrl:'https://viewer.example',websocketUrl:'wss://connect.steel.dev?sessionId=test'};},release:async()=>{released++;}};}
    const runner = load('lib/steelRunner.ts', {'steel-sdk':Steel,'playwright-core':{chromium:{connectOverCDP:async url=>{assert.ok(new URL(url).searchParams.has('apiKey'));return browser;}}},'./swarmStore':{saveSwarmNode:node=>nodes.set(node.sessionId,{...node})}});
    await runner.launchSwarmSession('http://localhost:3000/target-portal',{fullName:'Demo',email:'demo@example.com',phone:'202-555-0100',address:'Example',notes:'Demo',creditCard:{number:'4242424242424242',exp:'12/30',cvv:'123'}},()=>{});
    for(let i=0;i<100 && !nodes.get('test')?.ended;i++) await new Promise(resolve=>setImmediate(resolve));
    assert.equal(nodes.get('test').status, fail?'failed':'submitted');
    assert.equal(nodes.get('test').ended,true);
    assert.equal(released,1);
    assert.equal(closed,1);
    if(fail) assert.match(nodes.get('test').error,/404/);
  }
  console.log('PASS: localhost relay GET/POST, blocked unrelated requests, confirmed submission, HTTP failure, session status and cleanup');
})().catch(error=>{console.error(error);process.exitCode=1;});
