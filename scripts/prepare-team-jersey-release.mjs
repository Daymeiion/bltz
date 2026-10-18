import {execFileSync} from 'node:child_process';
import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
const output=process.argv[2]; assert.ok(output,'Supply an explicit output SQL file');
const file='supabase/migrations/20261018015519_preview_team_jersey_numbers.sql';
const committed=execFileSync('git',['show',`HEAD:${file}`],{encoding:'utf8'}).replace(/\r\n/g,'\n');
assert.equal(readFileSync(file,'utf8').replace(/\r\n/g,'\n'),committed,'Migration differs from committed release');
const body=committed.replace(/^begin;\n/,'').replace(/commit;\s*$/,'');
const sql=`-- BLTZ Production drxtzxnwdtgxwueiqygf; guarded migration only, no player updates.
-- SHA256 ${createHash('sha256').update(committed).digest('hex')}
begin;
set local lock_timeout='5s';
set local statement_timeout='30s';
select pg_advisory_xact_lock(hashtextextended('bltz:jerseys:20261018015519',0));
lock table supabase_migrations.schema_migrations in share row exclusive mode;
do $preflight$
begin
 if (select max(version) from supabase_migrations.schema_migrations) <> '20261017075740'
 or md5(pg_get_functiondef('private.preview_items_valid(text,jsonb)'::regprocedure)) <> 'f75e98521b8692c8cf83aaf6362acc52'
 then raise exception 'Production baseline changed; inspect before applying'; end if;
end;
$preflight$;
${body}
insert into supabase_migrations.schema_migrations(version,name,statements)
values('20261018015519','preview_team_jersey_numbers',array[$source$${body}$source$]);
select '20261018015519' as migration,private.preview_items_valid('team','[{"label":"San Diego Chargers","color":"#000080","logo":null,"jerseyNumbers":["20"],"jerseyColor":"#000080","jerseyBorderColor":"#FFD700","jerseyStatus":"reviewed"}]'::jsonb) as jersey_validation,
has_schema_privilege('authenticated','private','usage') as private_schema_access;
commit;
`;
writeFileSync(output,sql); console.log(`Wrote guarded release packet: ${output}`);
