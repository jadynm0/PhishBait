import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';

const code = ts.transpileModule(fs.readFileSync('lib/persona.ts', 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS },
}).outputText;
const persona = { fullName: 'Alex Example', email: 'alex@example.com', phone: '202-555-0142', address: '123 Example Street', ssnOrId: '000-00-0000', notes: 'Demo' };
function load(fetch, env = { ANTHROPIC_API_KEY: 'test-key' }) {
  const exports = {};
  new Function('exports', 'fetch', 'process', code)(exports, fetch, { env });
  return exports.generateVictimPersonas;
}
const generate = load(async (url, options) => {
  assert.equal(url, 'https://api.anthropic.com/v1/messages');
  assert.equal(options.headers['x-api-key'], 'test-key');
  assert.equal(options.headers['anthropic-version'], '2023-06-01');
  const body = JSON.parse(options.body);
  assert.equal(body.model, 'claude-sonnet-4-6');
  assert.ok(body.max_tokens > 0);
  return Response.json({ content: [{ type: 'text', text: JSON.stringify([persona]) }], stop_reason: 'end_turn' });
});
const result = await generate('http://localhost:3000/target-portal', 1);
assert.equal(result[0].fullName, persona.fullName);
assert.ok(['4242424242424242', '4000056655665556', '5555555555554444', '378282246310005', '6011111111111117'].includes(result[0].creditCard.number));
await assert.rejects(load(() => { throw new Error('Should not call API'); }, {})('local', 1), /missing ANTHROPIC_API_KEY/);
await assert.rejects(generate('local', 1.5), /integer/);
await assert.rejects(load(async () => new Response('', { status: 401 }))('local', 1), /Anthropic API error \(401\)/);
await assert.rejects(load(async () => new Response('', { status: 429 }))('local', 1), /rate limit/);
for (const text of ['not json', '{}', '[]', '[{}]']) {
  await assert.rejects(load(async () => Response.json({ content: [{ type: 'text', text }] }))('local', 1), /invalid persona JSON|incomplete persona records/);
}
await assert.rejects(load(async () => Response.json({ stop_reason: 'max_tokens' }))('local', 1), /cut short/);
console.log('PASS: Anthropic request, response mapping, missing key, count validation, authentication/rate errors, malformed and truncated responses');
