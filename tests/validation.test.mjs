import test from 'node:test';
import assert from 'node:assert/strict';
import { answersSchema, generationSchema, safeNext, uploadTypeMatches, normalizeAnswer } from '../lib/validation.js';
import { providerFailure } from '../lib/provider-errors.js';

const id='11111111-1111-4111-8111-111111111111';
test('answer input rejects oversized values, unknown ID formats and excessive batches',()=>{
  assert.equal(answersSchema.safeParse({[id]:'\\frac{1}{2}'}).success,true);
  assert.equal(answersSchema.safeParse({[id]:'x'.repeat(4001)}).success,false);
  assert.equal(answersSchema.safeParse({score:100}).success,false);
  assert.equal(answersSchema.safeParse(Object.fromEntries(Array.from({length:31},(_,i)=>[`${String(i).padStart(8,'0')}-1111-4111-8111-111111111111`,'x']))).success,false);
});
test('generation is schema validated, including topic and difficulty',()=>{
  const q={question:'Differentiate x².',solution:'$2x$',topic:'Derivative rules',difficulty:'Easy'};
  assert.equal(generationSchema.safeParse({questions:[q]}).success,true);
  assert.equal(generationSchema.safeParse({questions:[]}).success,false);
  assert.equal(generationSchema.safeParse({questions:[{...q,difficulty:'Guaranteed'}]}).success,false);
  assert.equal(generationSchema.safeParse({questions:[{question:'x',solution:2}]}).success,false);
});
test('redirects stay on approved local routes',()=>{
  for(const value of ['https://evil.example','//evil.example','/\\evil.example','/dashboard/../../evil','/signup','javascript:alert(1)']) assert.equal(safeNext(value),'/dashboard');
  assert.equal(safeNext('/exam?course=Calculus%20II'),'/exam?course=Calculus%20II');
  assert.equal(safeNext('/reset-password'),'/reset-password');
});
test('upload bytes must match an allowed declared media type',()=>{
  assert.equal(uploadTypeMatches(Buffer.from('%PDF-1.7'),'application/pdf'),true);
  assert.equal(uploadTypeMatches(Buffer.from('fake'),'application/pdf'),false);
  assert.equal(uploadTypeMatches(Buffer.from([137,80,78,71,13,10,26,10]),'image/png'),true);
  assert.equal(uploadTypeMatches(Buffer.from([255,216,255]),'image/jpeg'),true);
  assert.equal(uploadTypeMatches(Buffer.from('GIF89a'),'image/gif'),false);
  assert.equal(uploadTypeMatches(Buffer.alloc(0),'image/jpeg'),false);
});
test('text normalization preserves case and does not pretend to check equivalence',()=>{
  assert.equal(normalizeAnswer(' $2 x$ '),'2x');
  assert.notEqual(normalizeAnswer('X'),normalizeAnswer('x'));
  assert.notEqual(normalizeAnswer('x+x'),normalizeAnswer('2x'));
});
test('depleted Gemini credits have a specific safe message, without raw provider output',()=>{
  const result=providerFailure({status:402,message:'private provider output with a secret'});
  assert.equal(result.status,503); assert.match(result.message,/credits are depleted/);
  assert.doesNotMatch(result.message,/private provider|secret/);
  assert.equal(providerFailure({status:429}).status,429);
  assert.equal(providerFailure({status:403}).status,503);
  assert.equal(providerFailure({name:'AbortError'}).status,504);
});
