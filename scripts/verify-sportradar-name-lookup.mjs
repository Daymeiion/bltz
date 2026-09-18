import { PGlite } from '../output/sportradar-validation/node_modules/@electric-sql/pglite/dist/index.js';
import fs from 'node:fs';import assert from 'node:assert/strict';
const db=new PGlite();
await db.exec(`create role anon;create role authenticated;create role service_role bypassrls;create schema auth;
create table auth.users(id uuid primary key);create table players(id uuid primary key);
create table preview_lockers(id uuid primary key,updated_at timestamptz);
create table player_season_stats(player_id uuid,source text,level text,season smallint,season_type text,team text,stats jsonb,last_synced_at timestamptz);
create table audit_logs(action text,entity_type text,entity_id text,actor_user_id uuid,new_values jsonb);`);
await db.exec(fs.readFileSync('supabase/migrations/20260910224813_sportradar_player_stats.sql','utf8'));
await db.exec(fs.readFileSync('supabase/migrations/20260918200430_sportradar_name_lookup.sql','utf8'));
const player='00000000-0000-4000-8000-000000000001';const endpoint='/nfl/official/trial/v7/en/league/teams.json';
await db.query('insert into players values ($1)',[player]);
await db.exec('set role service_role');
const args=[player,null,endpoint,'trial',20];
await db.query('select reserve_sportradar_request($1,$2,$3,$4,$5)',args);
await db.exec("update provider_request_logs set requested_at=now()-interval '2 seconds'");
await assert.rejects(db.query('select reserve_sportradar_request($1,$2,$3,$4,$5)',args),/request_in_progress/);
await assert.rejects(db.query('select reserve_sportradar_request($1,$2,$3,$4,$5)',[...args.slice(0,4),1]),/trial_budget_exhausted/);
await db.exec("update provider_request_logs set completed_at=now(),response_status=429");
await assert.rejects(db.query('select reserve_sportradar_request($1,$2,$3,$4,$5)',args),/provider_cooldown/);
await db.query('insert into sportradar_lookup_cache(endpoint,payload,expires_at) values ($1,$2,now())',[endpoint,'{}']);
await db.exec('reset role;set role anon');await assert.rejects(db.query('select * from sportradar_lookup_cache'),/permission denied/);
await db.exec('reset role;set role authenticated');await assert.rejects(db.query('select * from sportradar_lookup_cache'),/permission denied/);
await assert.rejects(db.query('select reserve_sportradar_request($1,$2,$3,$4,$5)',args),/permission denied/);
await db.exec('reset role');
if(process.argv.includes('--generate-types')){
 const {rows}=await db.query("select column_name,data_type,is_nullable,column_default from information_schema.columns where table_schema='public' and table_name='sportradar_lookup_cache' order by ordinal_position");
 const fields=(mode)=>rows.map(c=>`          ${c.column_name}${mode==='Update'||mode==='Insert'&&(c.column_default!==null||c.is_nullable==='YES')?'?':''}: ${c.data_type==='jsonb'?'Json':'string'}${c.is_nullable==='YES'?' | null':''}`).join('\n');
 const block=`      sportradar_lookup_cache: {\n        Row: {\n${fields('Row')}\n        }\n        Insert: {\n${fields('Insert')}\n        }\n        Update: {\n${fields('Update')}\n        }\n        Relationships: []\n      }\n`;
 const p='types/database.generated.ts';let text=fs.readFileSync(p,'utf8');if(!text.includes('      sportradar_lookup_cache:'))text=text.replace('    Tables: {','    Tables: {\n'+block);
 const nullable=(await db.query("select is_nullable from information_schema.columns where table_schema='public' and table_name='provider_request_logs' and column_name='provider_player_id'")).rows[0].is_nullable;assert.equal(nullable,'YES');
 const start=text.indexOf('      provider_request_logs:');const end=text.indexOf('\n      ',text.indexOf('        Relationships:',start));
 const next=text.indexOf('\n      ',end+1);
 // Update only the three provider_request_logs column declarations.
 const chunk=text.slice(start,text.indexOf('        Relationships:',start));const adjusted=chunk.replace(/provider_player_id(\??): string(?: \| null)?/g,(_,optional)=>`provider_player_id${optional}: string | null`).replace(/(Insert: \{[\s\S]*?)provider_player_id: string/, '$1provider_player_id?: string');text=text.slice(0,start)+adjusted+text.slice(start+chunk.length);
 text=text.replace(/(reserve_sportradar_request: \{[\s\S]*?p_provider_id: )string(?: \| null)?/,'$1string | null');fs.writeFileSync(p,text);
}
await db.close();console.log('PASS: lookup cache isolation, null-provider quota reservations, endpoint deduplication, quota budget and cooldown preservation.');
