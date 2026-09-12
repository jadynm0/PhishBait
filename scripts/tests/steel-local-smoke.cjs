// Explicit opt-in smoke test: creates one paid Steel browser, no Anthropic call.
const { load } = require('./swarm-runner.cjs');
require('dotenv').config({path:'.env.local'});
(async()=>{
  const origin = process.env.TEST_APP_URL || 'http://localhost:3000';
  const target = origin + '/clone-portal/english-redelivery';
  const preflight = await fetch(target);
  if(!preflight.ok) throw new Error('Local demo preflight failed; start npm run dev first.');
  const {launchSwarmSession} = load('lib/steelRunner.ts');
  const {swarmNodes} = load('lib/swarmStore.ts');
  const persona = {fullName:'Steel Connection Test',email:'steel-test@example.com',phone:'202-555-0142',address:'123 Example Street',ssnOrId:'000-00-0000',notes:'Fictional connection check',creditCard:{number:'4242424242424242',exp:'12/30',cvv:'123',label:'Test'}};
  const session = await launchSwarmSession(target,persona,status=>console.log('Node status:',status));
  for(let i=0;i<150;i++) {
    await new Promise(resolve=>setTimeout(resolve,1000));
    const node = swarmNodes.get(session.sessionId);
    if(node?.ended) {
      if(node.status!=='submitted') throw new Error(node.error || 'Steel session failed');
      console.log('PASS: real Steel browser reached localhost and saved the demo submission; cleanup finished.');
      return;
    }
  }
  throw new Error('Smoke test timed out. Check Steel dashboard for session cleanup.');
})().catch(error=>{console.error('Smoke test failed:',error.status || error.message);process.exitCode=1;});
