const fs=require('fs');const {createClient}=require('@supabase/supabase-js');const assert=require('assert/strict');
(async()=>{const c=JSON.parse(fs.readFileSync('output/conversion/local-config.json'));const f=JSON.parse(fs.readFileSync('output/conversion/fixtures.json'));if(c.API_URL!=='http://127.0.0.1:62321')throw Error('local only');
const client=(role)=>createClient(c.API_URL,c.ANON_KEY,{global:{headers:{Authorization:`Bearer ${f.sessions[role].access_token}`}},auth:{persistSession:false}});
const a=client('admin');const o=client('outsider');const id=crypto.randomUUID();const contact=crypto.randomUUID();
async function ok(r){if(r.error)throw r.error;return r.data;}
await ok(await a.from('gtm_contacts').insert({id:contact,display_name:'Concurrency Fixture',email:f.users.outsider.email,created_by:f.users.admin.id}));await ok(await a.from('preview_lockers').insert({id,slug:'concurrency-'+id,full_name:'Concurrency Fixture'}));await ok(await a.rpc('assign_preview_locker_viewer',{p_preview_locker_id:id,p_email:f.users.outsider.email}));
const rpc=(cl,action,data={},p=id)=>cl.rpc('preview_conversion',{p_preview:p,p_action:action,p_request:crypto.randomUUID(),p_session:crypto.randomUUID(),p_data:data});
await ok(await rpc(a,'enroll',{contact_id:contact,campaign:'concurrency',source:'synthetic',channel:'email',relationship:'cold'}));
const results=await Promise.all(Array.from({length:16},()=>rpc(o,'claim_submit',{email:f.users.outsider.email,consent:true,dashboard_interest:true})));results.forEach(r=>assert.equal(r.error,null));
const responses=await ok(await a.from('preview_conversion_responses').select('*').eq('preview_id',id));assert.equal(responses.length,1);
const events=await ok(await a.from('preview_conversion_events').select('kind').eq('preview_id',id));assert.equal(events.length,3);assert.deepEqual(events.map(e=>e.kind).sort(),['accepted','claim_submit','dashboard_interest']);
assert.equal((await rpc(client('decline'),'view',{},id)).error.code,'42501');assert.equal((await rpc(a,'view')).data.excluded,true);
const parent=await ok(await a.from('preview_conversion_campaigns').select('referral_token').eq('preview_id',f.previews.athlete.id).single());
const intake=await ok(await a.from('preview_conversion_referrals').select('*').single());assert.equal(intake.preview_id,intake.reserved_preview_id);
const rr=await Promise.all(Array.from({length:12},()=>rpc(client('referral'),'referral_intake',{token:parent.referral_token,email:f.users.referral.email,full_name:'Repeated name',consent:true},null)));rr.forEach(r=>assert.equal(r.error,null));
assert.equal((await ok(await a.from('preview_conversion_referrals').select('*'))).length,1);
console.log('PASS: 16 concurrent claims -> one response / three atomic events; 12 concurrent referral retries -> one original intake; unauthorized denial and admin exclusion.');
fs.writeFileSync('output/conversion/concurrency-proof.json',JSON.stringify({concurrentClaimRequests:16,responseRows:1,eventRows:3,referralRetries:12,intakeRows:1,reservedPreviewId:intake.reserved_preview_id,preparedPreviewId:intake.preview_id}));
})().catch(e=>{console.error(e.message);process.exit(1)});
