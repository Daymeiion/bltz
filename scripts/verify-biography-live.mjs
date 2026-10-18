import { createServer } from 'vite';
import fs from 'node:fs/promises';
import path from 'node:path';
const server = await createServer({configFile:false,server:{middlewareMode:true},resolve:{alias:{'@':process.cwd(),'server-only':path.resolve('tests/stubs/server-only.ts')}}});
try {
  const {scrapeWikipedia} = await server.ssrLoadModule('/lib/pipeline/scrapers/wikipedia.ts');
  const result = await scrapeWikipedia({full_name:'Antoine Cason',school:'Arizona',position:'CB',level:'former'});
  const proof={ok:result.ok,reason:result.reason,dob:result.facts?.dob,highSchool:result.facts?.high_school,sources:result.urls};
  await fs.writeFile('../biography-live-proof.json',JSON.stringify(proof,null,2));
  console.log(JSON.stringify(proof,null,2));
} finally {await server.close();}
