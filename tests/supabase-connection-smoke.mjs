import assert from 'node:assert/strict';
import nextEnv from '@next/env';
nextEnv.loadEnvConfig(process.cwd());
const url=process.env.NEXT_PUBLIC_SUPABASE_URL;
const key=process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
assert.ok(url && key,'Configure the public Supabase URL and key first.');
const headers={apikey:key};
const auth=await fetch(`${url}/auth/v1/settings`,{headers});
assert.equal(auth.status,200,'Public auth settings should be reachable with this key.');
const settings=await auth.json();
assert.notEqual(settings.disable_signup,true,'Project signups must be enabled.');
assert.notEqual(settings.external?.email,false,'Email authentication must be enabled.');
for(const path of ['practice_sessions?select=id&limit=1','practice_answers?select=question_id&limit=1']) {
  const response=await fetch(`${url}/rest/v1/${path}`,{headers});
  assert.ok([401,403].includes(response.status),'Anonymous callers must be denied private student records.');
  const error=await response.json();
  assert.equal(error.code,'42501');
}
console.log('Live Supabase checks passed: auth reachable, signup enabled, anonymous student-data access denied. No accounts, emails, or practice records were created.');
