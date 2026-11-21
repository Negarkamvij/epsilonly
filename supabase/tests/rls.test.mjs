import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';

const A='11111111-1111-4111-8111-111111111111';
const B='22222222-2222-4222-8222-222222222222';
const q=[{question:'Differentiate x squared.',solution:'$2x$',topic:'Derivative rules',difficulty:'Easy'},
  {question:'Integrate 2x.',solution:'$x^2+C$',topic:'Basic antiderivatives',difficulty:'Medium'}];

test('PostgreSQL migrations enforce private, transactional learning records',async()=>{
  const db=new PGlite();
  const step=async(_name,run)=>run();
  try {
    // Simulate only Supabase's auth schema/roles. All application SQL is the real migration.
    await db.exec(`create role anon; create role authenticated; create role service_role bypassrls;
      create schema auth; create table auth.users(id uuid primary key);
      create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
      grant usage on schema auth to anon,authenticated,service_role;
      grant execute on function auth.uid() to anon,authenticated,service_role;`);
    await db.exec(await readFile(new URL('../migrations/202611200001_accounts_progress.sql',import.meta.url),'utf8'));
    await db.query('insert into auth.users(id) values ($1),($2)',[A,B]);
    const user=async(id)=>{await db.exec('reset role');await db.query("select set_config('request.jwt.claim.sub',$1,false)",[id||'']);await db.exec('set role authenticated');};
    const service=async()=>{await db.exec('reset role; set role service_role');};
    const create=async(id)=>{await service();return (await db.query('select public.create_practice_session($1,$2,$3::jsonb) id',[id,'Calculus I',JSON.stringify(q)])).rows[0].id;};
    const rpc=async(name,args)=>db.query(`select public.${name}(${args.map((_,i)=>`$${i+1}`).join(',')}) result`,args);
    const sid=await create(A),bid=await create(B);
    await user(A);
    const questions=(await db.query('select * from public.practice_questions order by position')).rows;
    const first=questions[0].id,second=questions[1].id;

    await step('students see only their own sessions and no answer keys',async()=>{
      assert.equal((await db.query('select count(*)::int n from public.practice_sessions')).rows[0].n,1);
      assert.equal(questions.length,2);assert.ok(questions.every(x=>x.user_id===A));
      await assert.rejects(()=>db.query('select * from private.question_answers'),/permission denied/);
      await assert.rejects(()=>rpc('create_practice_session',[A,'Calculus I',JSON.stringify(q)]),/permission denied/);
      await assert.rejects(()=>db.query('update public.practice_sessions set matched_count=100'),/permission denied/);
      await assert.rejects(()=>db.query('insert into public.practice_attempts default values'),/permission denied/);
    });
    await step('draft answers persist, but another student cannot read, change or review them',async()=>{
      await rpc('save_practice_answers',[sid,JSON.stringify({[first]:'x'})]);
      assert.equal((await db.query('select answer from public.practice_answers')).rows[0].answer,'x');
      await user(B);
      assert.equal((await db.query('select count(*)::int n from public.practice_answers')).rows[0].n,0);
      await assert.rejects(()=>rpc('save_practice_answers',[sid,JSON.stringify({[first]:'forged'})]),/Session not found/);
      await assert.rejects(()=>rpc('get_practice_review',[sid]),/Completed session not found/);
      await user(A);
      await assert.rejects(()=>rpc('get_practice_review',[sid]),/Completed session not found/);
    });
    await step('invalid question IDs roll back the entire draft save',async()=>{
      const unknown='99999999-9999-4999-8999-999999999999';
      await assert.rejects(()=>rpc('save_practice_answers',[sid,JSON.stringify({[first]:'changed',[unknown]:'bad'})]),/Question not found/);
      assert.equal((await db.query('select answer from public.practice_answers')).rows[0].answer,'x');
    });
    await step('submission stores latest answers once and calculates text matches on the server',async()=>{
      const answers={[first]:'2 x',[second]:'2x'};
      const review=(await rpc('submit_practice_session',[sid,JSON.stringify(answers)])).rows[0].result;
      assert.equal(review.matched_count,1);assert.equal(review.questions[0].solution,'$2x$');
      assert.equal(review.questions[1].grading_status,'needs_review');
      const attempts=(await db.query('select * from public.practice_attempts')).rows;
      assert.equal(attempts.length,2);assert.ok(attempts.every(x=>x.is_correct===null));
      const retry=(await rpc('submit_practice_session',[sid,JSON.stringify({[first]:'wrong'})])).rows[0].result;
      assert.equal(retry.matched_count,1);assert.equal((await db.query('select count(*)::int n from public.practice_attempts')).rows[0].n,2);
      await assert.rejects(()=>rpc('save_practice_answers',[sid,JSON.stringify(answers)]),/already submitted/);
    });
    await step('progress aggregates only the current student and distinguishes matches from correctness',async()=>{
      const progress=(await rpc('get_practice_progress',[])).rows[0].result;
      assert.equal(progress.answered,2);assert.equal(progress.matched,1);assert.equal(progress.completed,1);assert.equal(progress.topics.length,2);
      await user(B);const b=(await rpc('get_practice_progress',[])).rows[0].result;assert.equal(b.answered,0);
      await assert.rejects(()=>rpc('get_practice_review',[sid]),/Completed session not found/);
      await db.exec('reset role; set role anon');
      await assert.rejects(()=>db.query('select * from public.practice_sessions'),/permission denied/);
      await assert.rejects(()=>rpc('get_practice_progress',[]),/permission denied/);
      await assert.rejects(()=>rpc('submit_practice_session',[sid,'{}']),/permission denied/);
    });
    await step('provider request quotas cannot be bypassed by a student',async()=>{
      await user(A);await assert.rejects(()=>rpc('reserve_generation_request',[A]),/permission denied/);
      await service();for(let i=0;i<5;i++)assert.equal((await rpc('reserve_generation_request',[A])).rows[0].result,true);
      assert.equal((await rpc('reserve_generation_request',[A])).rows[0].result,false);
    });
    await step('clearing history removes private keys and attempts without touching another student',async()=>{
      await user(A);await rpc('clear_practice_history',[]);
      assert.equal((await db.query('select count(*)::int n from public.practice_sessions')).rows[0].n,0);
      await service();assert.equal((await db.query('select count(*)::int n from private.question_answers')).rows[0].n,2);
      await user(B);assert.equal((await db.query('select id from public.practice_sessions')).rows[0].id,bid);
      await db.exec('reset role');await db.query('delete from auth.users where id=$1',[B]);
      assert.equal((await db.query('select count(*)::int n from public.practice_sessions')).rows[0].n,0);
      assert.equal((await db.query('select count(*)::int n from private.question_answers')).rows[0].n,0);
    });
  } finally {await db.close();}
});
