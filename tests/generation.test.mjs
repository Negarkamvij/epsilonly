import test from 'node:test';
import assert from 'node:assert/strict';
import {generateStoredSession} from '../lib/generation-service.js';
const id='11111111-1111-4111-8111-111111111111';
const question={question:'Compute $\\int_0^1 x^2\\,dx$.',solution:'$\\frac{1}{3}$',topic:'Definite integrals',difficulty:'Easy'};
test('mock AI generation validates LaTeX once and returns only an owned session ID',async()=>{
  let saved;
  const result=await generateStoredSession({userId:id,course:'Calculus II',generate:async()=>JSON.stringify({questions:[question]}),store:async(payload)=>{saved=payload;return id;}});
  assert.deepEqual(result,{session_id:id});assert.equal(saved.userId,id);assert.equal(saved.questions[0].solution,question.solution);
  assert.equal(JSON.stringify(result).includes('solution'),false);
});
test('malformed AI responses never reach persistent storage',async()=>{
  let writes=0;const store=async()=>{writes++;return id;};
  for(const payload of ['invalid JSON',JSON.stringify({questions:[]}),JSON.stringify({questions:[{...question,solution:null}]})]) {
    await assert.rejects(()=>generateStoredSession({userId:id,course:'Calculus II',generate:async()=>payload,store}),e=>e.kind==='invalid_generation');
  }
  assert.equal(writes,0);
});
test('failed storage never reports a successfully generated session',async()=>{
  await assert.rejects(()=>generateStoredSession({userId:id,course:'Calculus II',generate:async()=>JSON.stringify({questions:[question]}),store:async()=>null}),e=>e.kind==='storage');
});
