const fs=require('fs');const {execFileSync}=require('child_process');const {createClient}=require('@supabase/supabase-js');
(async()=>{
const cfg=JSON.parse(fs.readFileSync('output/conversion/local-config.json','utf8'));if(cfg.API_URL!=='http://127.0.0.1:62321')throw Error('local only');
const service=createClient(cfg.API_URL,cfg.SERVICE_ROLE_KEY,{auth:{persistSession:false}});const users={};
for(const role of ['admin','athlete','referral','decline','outsider']){const email=`conversion-${role}@example.test`;const password='Synthetic-local-only-2026!';const r=await service.auth.admin.createUser({email,password,email_confirm:true});if(r.error)throw r.error;users[role]={id:r.data.user.id,email,password};}
const sql=`insert into public.platform_role_assignments(user_id,role,assignment_reason) values('${users.admin.id}','super_admin','Synthetic conversion verification');`;
execFileSync('docker',['--context','desktop-linux','exec','-i','supabase_db_bltz-conversion-20260911','psql','-U','postgres','-v','ON_ERROR_STOP=1'],{input:sql,stdio:['pipe','pipe','pipe']});
const sessions={};for(const [role,u] of Object.entries(users)){const c=createClient(cfg.API_URL,cfg.ANON_KEY,{auth:{persistSession:false}});const r=await c.auth.signInWithPassword(u);if(r.error)throw r.error;sessions[role]=r.data.session;}
const admin=createClient(cfg.API_URL,cfg.ANON_KEY,{global:{headers:{Authorization:`Bearer ${sessions.admin.access_token}`}},auth:{persistSession:false}});
const fixtures={users,sessions,previews:{}};
for(const role of ['athlete','decline']){
const id=crypto.randomUUID();const contact=crypto.randomUUID();
execFileSync('docker',['--context','desktop-linux','exec','-i','supabase_db_bltz-conversion-20260911','psql','-U','postgres','-v','ON_ERROR_STOP=1'],{input:`select set_config('request.jwt.claim.sub','${users.admin.id}',false);insert into public.gtm_contacts(id,display_name,email,created_by) values('${contact}','Synthetic ${role}','${users[role].email}','${users.admin.id}');`,stdio:['pipe','pipe','pipe']});
const ins=await admin.from('preview_lockers').insert({id,slug:`conversion-${role}`,full_name:`Synthetic ${role}`,bio:'A synthetic career recovery preview for local verification.'});if(ins.error)throw ins.error;
for(const [name,args] of [['assign_preview_locker_viewer',{p_preview_locker_id:id,p_email:users[role].email}],['preview_conversion',{p_preview:id,p_action:'enroll',p_request:crypto.randomUUID(),p_session:crypto.randomUUID(),p_data:{contact_id:contact,campaign:'local90',source:'synthetic',channel:'email',relationship:'warm'}}],['preview_conversion',{p_preview:id,p_action:'sent',p_request:crypto.randomUUID(),p_session:crypto.randomUUID(),p_data:{}}]]){const r=await admin.rpc(name,args);if(r.error)throw r.error;}
fixtures.previews[role]={id,contact,slug:`conversion-${role}`};
}
fs.writeFileSync('output/conversion/fixtures.json',JSON.stringify(fixtures));
console.log('Created five synthetic accounts and two assigned, enrolled private previews in the isolated stack.');
})().catch(e=>{console.error(e.message);process.exit(1)});
