import assert from 'node:assert/strict';
const base=process.env.TEST_BASE_URL || 'http://127.0.0.1:3000';
const id='11111111-1111-4111-8111-111111111111';
let checks=0;
for(const path of ['/dashboard','/exam']) {
  const response=await fetch(`${base}${path}`,{redirect:'manual'});
  assert.equal(response.status,307);
  assert.match(response.headers.get('location'),/\/login\?next=/);
  checks++;
}
for(const [path,method,body] of [['/api/generate','POST',{}],[`/api/practice/${id}`,'PATCH',{answers:{}}],[`/api/practice/${id}`,'POST',{answers:{}}],['/api/account','DELETE',{action:'clear-history'}]]) {
  const response=await fetch(`${base}${path}`,{method,headers:{'Origin':base,'Content-Type':'application/json'},body:JSON.stringify(body)});
  assert.equal(response.status,401,`${method} ${path} denies anonymous access`);checks++;
}
const denied=await fetch(`${base}/api/generate`,{method:'POST',headers:{Origin:'https://untrusted.example'}});
assert.equal(denied.status,403);checks++;
for(const path of ['/signup','/login','/math-editor']) {
  const response=await fetch(`${base}${path}`);
  assert.equal(response.status,200);checks++;
}
const callback=await fetch(`${base}/auth/callback?next=https://untrusted.example`,{redirect:'manual'});
assert.equal(callback.status,307);assert.equal(new URL(callback.headers.get('location'),base).origin,base);checks++;
console.log(`${checks} HTTP smoke checks passed; no paid API requests were made.`);
