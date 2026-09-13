// Isolated PostgreSQL validation. Install @electric-sql/pglite under
// output/sportradar-validation; this script never connects to a remote database.
import { PGlite } from '../output/sportradar-validation/node_modules/@electric-sql/pglite/dist/index.js';
import fs from 'node:fs';
import assert from 'node:assert/strict';
const db = new PGlite();
await db.exec(`
  create role anon; create role authenticated; create role service_role bypassrls;
  create schema auth; create table auth.users(id uuid primary key);
  create table public.players(id uuid primary key);
  create table public.preview_lockers(id uuid primary key, updated_at timestamptz default now());
  create table public.player_season_stats(id bigserial primary key, player_id uuid references players(id), source text, level text,
    season smallint,season_type text,team text,stats jsonb,last_synced_at timestamptz,
    unique(player_id,source,season,season_type));
  create table public.audit_logs(id bigserial primary key,action text,entity_type text,entity_id text,actor_user_id uuid,new_values jsonb);
`);
await db.exec(fs.readFileSync('supabase/migrations/20260910224813_sportradar_player_stats.sql','utf8'));
const player = '03570d21-b56b-43ec-aa85-f95883c65b6b';
const other = 'a086931d-4ca5-4bf7-80ef-47d9ddc9072b';
const provider = '3069db07-aa43-4503-ab11-2ae5c0002721';
const preview = '768c92aa-75ff-4a43-bcc0-f2798c2e1724';
await db.query('insert into players values ($1),($2)',[player,other]);
await db.query('insert into preview_lockers(id) values ($1)',[preview]);
await db.query("insert into player_season_stats(player_id,source,season,season_type,stats) values ($1,'nflverse',2023,'REG','{}')",[player]);
const season = {year:2023,seasonType:'REG',team:'Test Team',providerTeamId:provider,position:'DE',gamesPlayed:17,gamesStarted:17,statistics:{sacks:7.5}};
const review = (await db.query(`insert into player_stat_ingestions(player_id,provider_player_id,league,status,raw_profile,normalized)
 values ($1,$2,'nfl','MANUAL_REVIEW','{}',$3) returning id`,[player,provider,JSON.stringify({seasons:[season]})])).rows[0].id;
await db.query('select import_sportradar_stats($1,$2,null)',[review,preview]);
await db.query('select import_sportradar_stats($1,$2,null)',[review,preview]);
assert.equal((await db.query('select count(*)::int n from player_season_stats')).rows[0].n,2,'idempotent import and scraper preservation');
assert.equal((await db.query('select count(*)::int n from player_external_ids')).rows[0].n,1);
assert.equal((await db.query('select player_id from preview_lockers')).rows[0].player_id,player);
assert.equal((await db.query('select count(*)::int n from audit_logs')).rows[0].n,2);
const conflictingReview=(await db.query(`insert into player_stat_ingestions(player_id,provider_player_id,league,status,raw_profile,normalized)
 values ($1,$2,'nfl','MANUAL_REVIEW','{}',$3) returning id`,[other,provider,JSON.stringify({seasons:[season]})])).rows[0].id;
await assert.rejects(db.query('select import_sportradar_stats($1,$2,null)',[conflictingReview,preview]),/preview_identity_conflict/);
assert.equal((await db.query('select count(*)::int n from player_external_ids')).rows[0].n,1,'failed import rolls back');
const args=[player,provider,'/nfl/official/trial/v7/en/players/'+provider+'/profile.json','trial',1];
const request=(await db.query('select reserve_sportradar_request($1,$2,$3,$4,$5) id',args)).rows[0].id;
await assert.rejects(db.query('select reserve_sportradar_request($1,$2,$3,$4,$5)',args),/trial_budget_exhausted/);
await db.query("update provider_request_logs set requested_at=now()-interval '5 seconds' where id=$1",[request]);
await assert.rejects(db.query('select reserve_sportradar_request($1,$2,$3,$4,20)',args.slice(0,4)),/request_in_progress/);
await db.query('update provider_request_logs set response_status=429,completed_at=now() where id=$1',[request]);
await assert.rejects(db.query('select reserve_sportradar_request($1,$2,$3,$4,20)',args.slice(0,4)),/provider_cooldown/);
await db.exec('set role anon');
await assert.rejects(db.query('select * from player_stat_ingestions'),/permission denied/);
await assert.rejects(db.query('select * from player_external_ids'),/permission denied/);
await assert.rejects(db.query('select import_sportradar_stats($1,$2,null)',[review,preview]),/permission denied/);
await db.exec('reset role; set role authenticated');
await assert.rejects(db.query('select * from provider_request_logs'),/permission denied/);
await assert.rejects(db.query('select reserve_sportradar_request($1,$2,$3,$4,20)',args.slice(0,4)),/permission denied/);
await db.close();
console.log('PASS: migration, atomic/idempotent import, scraper preservation, mapping conflict rollback, quota, deduplication, 429 cooldown, private-table and RPC access controls.');
