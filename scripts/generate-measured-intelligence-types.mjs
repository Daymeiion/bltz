import { PGlite } from '@electric-sql/pglite';
import fs from 'node:fs/promises';

// Catalog-derived additive types. Never overwrite the existing staging snapshot.
const db = new PGlite();
const tables = ['analytics_delivery_batches','analytics_delivery_outbox','intelligence_engine_runs','intelligence_feature_snapshots'];
try {
  await db.exec(`create role anon; create role authenticated; create role service_role;
    create schema auth;create table auth.users(id uuid primary key);
    create table public.players(id uuid primary key);create table public.moments(id uuid primary key);
    create table public.analytics_events(id uuid primary key default gen_random_uuid(),client_event_id uuid unique not null,event_name text not null,
      user_id uuid,athlete_id uuid,session_id uuid,source text,page text,properties jsonb,occurred_at timestamptz);`);
  await db.exec(await fs.readFile('supabase/migrations/20261005183837_intelligence_measured_delivery.sql','utf8'));
  await db.exec(await fs.readFile('supabase/migrations/20261009003442_analytics_delivery_transport.sql','utf8'));
  await db.exec(await fs.readFile('supabase/migrations/20261009003448_analytics_delivery_production_environment.sql','utf8'));
  const {rows} = await db.query("select table_name,column_name,data_type,is_nullable,column_default from information_schema.columns where table_schema='public' order by table_name,ordinal_position");
  const functions = (await db.query(`select p.proname as name,p.proargnames as arg_names,oidvectortypes(p.proargtypes) as arg_types,format_type(p.prorettype,null) as return_type from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname not like 'guard_%' order by p.proname`)).rows;
  const typeFor=(type)=>type==='jsonb'?'MeasuredIntelligenceJson':['integer','bigint','smallint','numeric'].includes(type)?'number':type==='boolean'?'boolean':'string';
  let output='// GENERATED from isolated executable PostgreSQL migration catalog. Not a deployed schema attestation.\n';
  output+='export type MeasuredIntelligenceJson = string | number | boolean | null | { [key: string]: MeasuredIntelligenceJson | undefined } | MeasuredIntelligenceJson[];\n\nexport interface MeasuredIntelligenceTables {\n';
  for(const table of tables){output+=`  ${table}: {\n`;for(const operation of ['Row','Insert','Update']){output+=`    ${operation}: {\n`;for(const c of rows.filter(row=>row.table_name===table)){const optional=operation==='Update'||operation==='Insert'&&(c.is_nullable==='YES'||c.column_default!==null);output+=`      ${c.column_name}${optional?'?':''}: ${typeFor(c.data_type)}${c.is_nullable==='YES'?' | null':''};\n`;}output+='    };\n';}output+='  };\n';}output+='}\n\nexport interface MeasuredIntelligenceFunctions {\n';
  for(const fn of functions){output+=`  ${fn.name}: { Args: {\n`;const args=fn.arg_types.split(', ');for(const [index,name] of fn.arg_names.entries())output+=`    ${name}: ${typeFor(args[index])};\n`;output+=`  }; Returns: ${typeFor(fn.return_type)} };\n`;}output+='}\n';
  const path='types/measured-intelligence.generated.ts';
  if(process.argv.includes('--check')){if(await fs.readFile(path,'utf8')!==output)throw new Error('Measured Intelligence generated types differ');console.log('Measured Intelligence migration types verified');}
  else {await fs.writeFile(path,output);console.log('Measured Intelligence migration types generated');}
} finally {await db.close();}
