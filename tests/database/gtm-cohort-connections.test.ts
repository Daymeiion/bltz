// @vitest-environment node
import { PGlite } from "@electric-sql/pglite";
import { readFileSync } from "node:fs";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

const admin="00000000-0000-4000-8000-000000000001";
const other="00000000-0000-4000-8000-000000000002";
const baseline=readFileSync("supabase/migrations/20260701000000_production_schema_baseline.sql","utf8");
let db:PGlite;

beforeAll(async()=>{
  db=new PGlite();
  await db.exec(`create role anon;create role authenticated;create role service_role;create schema private;create schema auth;
    create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
    create function public.is_internal_admin() returns boolean language sql stable as $$select auth.uid()='${admin}'::uuid$$;
    grant usage on schema private,auth to authenticated;`);
  for(const name of ["nfl_players","players"]){
    const start=baseline.indexOf(`CREATE TABLE IF NOT EXISTS "public"."${name}" (`);
    await db.exec(baseline.slice(start,baseline.indexOf("\n);",start)+3));
  }
  await db.exec(`alter table public.players add primary key(id);alter table public.nfl_players add primary key(gsis_id);
    create table public.gtm_player_prospects(gsis_id text primary key references nfl_players,selected_by uuid not null,selected_at timestamptz default now(),archived boolean default false,archived_at timestamptz,archived_by uuid);
    create table public.gtm_contacts(id uuid primary key default gen_random_uuid(),player_master_gsis_id text references nfl_players,contact_type text,sport text,league_level text,source text,source_record_id text,pipeline_stage text,do_not_automate boolean,created_by uuid,updated_by uuid,archived boolean default false);
    create unique index on public.gtm_contacts(player_master_gsis_id) where player_master_gsis_id is not null;
    create table public.gtm_contact_players(contact_id uuid references gtm_contacts,player_id uuid references players,match_type text,match_confidence numeric,verified boolean default false,verified_by uuid,verified_at timestamptz,created_by uuid,constraint gtm_contact_players_contact_player_key unique(contact_id,player_id));
    create table public.preview_lockers(id uuid primary key,slug text unique,full_name text,position text,level text,school text,jersey text,height_in int,weight_lbs int,headshot_url text,bio text,revision int default 1,player_id uuid references players,updated_at timestamptz,public_enabled boolean default false,created_by uuid,created_at timestamptz,hometown text,athlete_quote text,athlete_quote_author text);
    create table public.gtm_player_preview_lockers(gsis_id text primary key references gtm_player_prospects,preview_locker_id uuid unique references preview_lockers,completed_revision int,linked_by uuid);
    create table public.audit_logs(actor_user_id uuid,action text,entity_type text,entity_id text,actor_role_scope text,risk_level text,new_values jsonb,request_metadata jsonb);
    create function private.preview_url_valid(text) returns boolean language sql immutable as $$select true$$;`);
  const previewMigration=readFileSync("supabase/migrations/20260908182448_link_gtm_prospects_to_private_previews.sql","utf8");
  const previewBase=readFileSync("supabase/migrations/20260831161831_private_preview_lockers.sql","utf8");
  await db.exec(previewBase.slice(previewBase.indexOf("create function private.preview_stamp()"),previewBase.indexOf("-- Definer is scoped")));
  await db.exec(previewMigration.slice(previewMigration.indexOf("create function private.open_or_create_gtm_player_preview"),previewMigration.indexOf("create function private.complete_gtm_player_preview")));
  await db.exec(readFileSync("supabase/migrations/20261022190320_connect_gtm_player_cohort.sql","utf8"));
  await db.exec(`insert into nfl_players(gsis_id,display_name) values('00-0000001','New Athlete'),('00-0000002','Existing Athlete'),('00-0000003','Same Name'),('00-0000004','Rollback Athlete'),('00-0000005','Duplicate Athlete'),('00-0000006','Archived Contact'),('00-0000007','Conflicting Contact');`);
},30000);
afterAll(async()=>{await db?.close();});
beforeEach(async()=>{await db.exec("reset role");});

async function connect(ids:string[],select=true){return (await db.query<{result:Record<string,unknown>}>("select public.connect_gtm_player_cohort($1,$2) as result",[ids,select])).rows[0].result;}
async function actor(id:string){await db.exec(`reset role;set role authenticated;select set_config('request.jwt.claim.sub','${id}',false)`);}
async function count(table:string){return (await db.query<{n:number}>(`select count(*)::int n from public.${table}`)).rows[0].n;}

describe.sequential("atomic GTM cohort connections",()=>{
  it("rejects anonymous and non-admin callers without mutations",async()=>{
    await db.exec("set role anon");await expect(connect(["00-0000001"])).rejects.toThrow(/permission denied/);
    await actor(other);await expect(connect(["00-0000001"])).rejects.toThrow(/GTM access denied/);
    await db.exec("reset role");expect(await count("gtm_player_prospects")).toBe(0);
  });
  it("creates one private unclaimed Career ID, contact and preview, then reuses them on retry",async()=>{
    await actor(admin);const first=await connect(["00-0000001"]);const second=await connect(["00-0000001"]);
    expect(first).toMatchObject({selectedCount:1,createdCount:1,previewCreatedCount:1,careerCreatedCount:1,linkedPlayerCount:1,reviewRequired:[]});
    expect(second).toMatchObject({selectedCount:0,createdCount:0,previewCreatedCount:0,careerCreatedCount:0,linkedPlayerCount:1});
    expect(second.connections).toEqual(first.connections);
    await db.exec("reset role");expect(await count("players")).toBe(1);expect(await count("gtm_contact_players")).toBe(1);
    const row=(await db.query<Record<string, unknown>>("select is_public,visibility,is_verified,user_id from players")).rows[0];
    expect(row).toEqual({is_public:false,visibility:false,is_verified:false,user_id:null});
    expect((await db.query<Record<string, unknown>>("select public_enabled from preview_lockers")).rows[0].public_enabled).toBe(false);
    expect((await db.query<Record<string, unknown>>("select revision from preview_lockers")).rows[0].revision).toBe(1);
    expect((await db.query<Record<string, unknown>>("select count(*)::int n from audit_logs where action='gtm.cohort_connected'")).rows[0].n).toBe(2);
  });
  it("reuses an exact GSIS identity without changing its claim or publication",async()=>{
    await db.exec(`insert into players(slug,name,gsis_id,is_public,user_id) values('existing','Existing Athlete','00-0000002',true,'${other}')`);
    await actor(admin);expect(await connect(["00-0000002"])).toMatchObject({careerCreatedCount:0,linkedPlayerCount:1});
    await db.exec("reset role");expect((await db.query<Record<string, unknown>>("select user_id,is_public from players where gsis_id='00-0000002'")).rows[0]).toEqual({user_id:other,is_public:true});
  });
  it("preserves content revisions during identity connection while real content edits still increment",async()=>{
    await actor(admin);
    await db.exec("reset role");
    const id=(await db.query<Record<string, unknown>>("select preview_locker_id from gtm_player_preview_lockers where gsis_id='00-0000001'")).rows[0];
    // No direct table grants are needed by the connection API; make the edit as fixture owner.
    await db.exec("reset role");
    await db.query<Record<string, unknown>>("update preview_lockers set bio='Reviewed content edit' where id=$1",[id.preview_locker_id]);
    expect((await db.query<Record<string, unknown>>("select revision from preview_lockers where id=$1",[id.preview_locker_id])).rows[0].revision).toBe(2);
    await actor(admin);await connect(["00-0000001"]);await db.exec("reset role");
    expect((await db.query<Record<string, unknown>>("select revision from preview_lockers where id=$1",[id.preview_locker_id])).rows[0].revision).toBe(2);
  });
  it("keeps name-only identities in review without creating a duplicate",async()=>{
    await db.exec("insert into players(slug,name,full_name) values('same-name','Same Name','Same Name')");
    await actor(admin);expect(await connect(["00-0000003"])).toMatchObject({careerCreatedCount:0,linkedPlayerCount:0,reviewRequired:[{gsisId:"00-0000003",reason:"existing_athlete_requires_review"}]});
    await db.exec("reset role");expect((await db.query<Record<string, unknown>>("select count(*)::int n from players where name='Same Name'")).rows[0].n).toBe(1);
  });
  it("rolls back the entire batch when an unexpected write fails",async()=>{
    await db.exec(`create function private.fail_fixture() returns trigger language plpgsql as $$begin if new.gsis_id='00-0000004' then raise exception 'fixture_write_failure';end if;return new;end$$;create trigger fail_fixture before insert on players for each row execute function private.fail_fixture();`);
    await actor(admin);await expect(connect(["00-0000004"])).rejects.toThrow(/fixture_write_failure/);
    await db.exec("reset role");expect((await db.query<Record<string, unknown>>("select count(*)::int n from gtm_player_prospects where gsis_id='00-0000004'")).rows[0].n).toBe(0);
    expect((await db.query<Record<string, unknown>>("select count(*)::int n from gtm_contacts where player_master_gsis_id='00-0000004'")).rows[0].n).toBe(0);
  });
  it("refuses duplicate canonical GSIS rows instead of choosing the first",async()=>{
    await db.exec("insert into players(slug,name,gsis_id) values('dup-a','Duplicate Athlete','00-0000005'),('dup-b','Duplicate Athlete','00-0000005')");
    await actor(admin);expect(await connect(["00-0000005"])).toMatchObject({linkedPlayerCount:0,reviewRequired:[{gsisId:"00-0000005",reason:"duplicate_athlete_identity"}]});await db.exec("reset role");
  });
  it("does not reactivate archived contacts or overwrite a conflicting verified match",async()=>{
    await db.exec(`insert into gtm_contacts(player_master_gsis_id,archived) values('00-0000006',true),('00-0000007',false);
      insert into gtm_contact_players(contact_id,player_id,verified) select c.id,p.id,true from gtm_contacts c cross join players p where c.player_master_gsis_id='00-0000007' and p.gsis_id='00-0000001';`);
    await actor(admin);const result=await connect(["00-0000006","00-0000007"]);
    expect(result.linkedPlayerCount).toBe(0);expect(result.reviewRequired).toEqual([{gsisId:"00-0000006",reason:"contact_archived_requires_review"},{gsisId:"00-0000007",reason:"contact_identity_conflict"}]);await db.exec("reset role");
  });
  it("validates the whole selection and preserves existing-only promotion boundaries",async()=>{
    await actor(admin);await expect(connect(["00-0000001","00-9999999"])).rejects.toThrow(/not found/);
    await expect(connect(["00-0000001","00-0000001"])).rejects.toThrow(/distinct/);
    await expect(connect(["00-0000004"],false)).rejects.toThrow(/active selected/);await db.exec("reset role");
  });
  it("regenerates the new RPC declaration from the applied database signature",async()=>{
    const row=(await db.query<Record<string, unknown>>("select proargnames,pronargdefaults,prorettype::regtype::text result from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname='connect_gtm_player_cohort'")).rows[0];
    expect(row).toMatchObject({proargnames:["p_gsis_ids","p_select"],pronargdefaults:1,result:"jsonb"});
  });

  it("backfills the nine audited players, preserves legacy identities and previews, and safely repeats",async()=>{
    const legacy=[
      ["00-0023459","2da688ae-c133-493d-be4c-703a7ad21f9b","Aaron Rodgers","Cal Berkeley",null,"California; Butte College"],
      ["00-0023479","2824b1ee-7768-4992-8ebd-8f0d2374c023","J.J. Arrington","Cal Berkeley",null,"California; College of the Canyons"],
      ["00-0025579","4ca1fa4c-c4dc-480d-9d47-3f0e220fcfa3","Desmond Bishop","Cal Berkeley",null,"California; City College (SF)"],
      ["00-0026167","c48b4f20-bd48-4fda-a21e-b4514495cd6b","Antoine Cason",null,"University of Arizona","Arizona"],
      ["00-0026266","5d5155b8-8bc3-4549-a959-8daafadebc62","Lavelle Hawkins","Cal Berkeley",null,"California; City College (SF)"],
    ];
    for(const [gsis,id,name,school,team,college] of legacy){
      await db.query<Record<string, unknown>>("insert into nfl_players(gsis_id,display_name,college_name) values($1,$2,$3)",[gsis,name,college]);
      await db.query<Record<string, unknown>>("insert into players(id,slug,name,full_name,school,team,user_id,is_public,is_verified) values($1,$2,$3,$3,$4,$5,$6,true,false)",[id,`legacy-${gsis}`,name,school,team,team ? other : null]);
    }
    await db.exec(`insert into nfl_players(gsis_id,display_name) values('00-0004866','Omar Ellison'),('00-0017924','Roland Williams'),('00-0022714','Kris Wilson'),('00-0026149','Keith Rivers');
      insert into players(id,slug,name,gsis_id,is_public,visibility) values('c5dae871-a277-4256-9a0c-17a40940ad3f','keith-career','Keith Rivers','00-0026149',false,false);
      insert into gtm_player_prospects(gsis_id,selected_by) select gsis_id,'${admin}' from nfl_players where gsis_id in ('00-0004866','00-0017924','00-0022714','00-0023459','00-0023479','00-0025579','00-0026149','00-0026167','00-0026266');
      select set_config('request.jwt.claim.sub','${admin}',false);`);
    const ids=[...legacy.map(row=>row[0]),"00-0017924","00-0022714","00-0026149"];
    // Seven previews already exist; Aaron and Omar have no preview yet.
    for(const gsis of ids.filter(id=>id!=="00-0023459"))await db.query<Record<string, unknown>>("select public.open_or_create_gtm_player_preview($1)",[gsis]);
    await db.exec("update preview_lockers set bio='Preserve reviewed content',revision=8,public_enabled=true,player_id='c5dae871-a277-4256-9a0c-17a40940ad3f' where id=(select preview_locker_id from gtm_player_preview_lockers where gsis_id='00-0026149')");
    const before=(await db.query<Record<string, unknown>>("select id,slug,bio,revision,public_enabled from preview_lockers where bio='Preserve reviewed content'")).rows[0];
    const careerCount=await count("players");
    const migration=readFileSync("supabase/migrations/20261022190727_backfill_selected_gtm_player_connections.sql","utf8");
    await db.exec(migration);
    expect(await count("players")).toBe(careerCount+3);
    const linked=await db.query<{gsis_id:string}>("select p.gsis_id from gtm_player_prospects p join gtm_contacts c on c.player_master_gsis_id=p.gsis_id join gtm_player_preview_lockers l using(gsis_id) join preview_lockers v on v.id=l.preview_locker_id join gtm_contact_players cp on cp.contact_id=c.id and cp.player_id=v.player_id and cp.verified join players a on a.id=cp.player_id and a.gsis_id=p.gsis_id where p.gsis_id=any($1)",[["00-0004866","00-0017924","00-0022714","00-0023459","00-0023479","00-0025579","00-0026149","00-0026167","00-0026266"]]);
    expect(linked.rows).toHaveLength(9);
    expect((await db.query<Record<string, unknown>>("select id,slug,bio,revision,public_enabled from preview_lockers where bio='Preserve reviewed content'")).rows[0]).toEqual(before);
    expect((await db.query<Record<string, unknown>>("select user_id,is_public,is_verified from players where id='c48b4f20-bd48-4fda-a21e-b4514495cd6b'")).rows[0]).toEqual({user_id:other,is_public:true,is_verified:false});
    await db.exec(migration);expect(await count("players")).toBe(careerCount+3);
  });
});
