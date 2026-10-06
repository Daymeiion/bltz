// Isolated, loopback-only design preview. No app routes or credentials.
const http=require('node:http'),fs=require('node:fs'),path=require('node:path');
const root=__dirname,port=Number(process.env.BLTZ_LAB_DESIGN_PORT||3138);
const types={'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.woff2':'font/woff2','.svg':'image/svg+xml','.jpg':'image/jpeg','.png':'image/png','.mp4':'video/mp4','.webm':'video/webm'};
http.createServer((req,res)=>{
 if(req.method!=='GET'&&req.method!=='HEAD'){res.writeHead(405);return res.end();}
 let pathname;try{pathname=decodeURIComponent(new URL(req.url,'http://127.0.0.1').pathname);}catch{res.writeHead(400);return res.end();}
 const file=path.resolve(root,'.'+(pathname==='/'?'/index.html':pathname)),extension=path.extname(file);
 if(!file.startsWith(root+path.sep)||!types[extension]){res.writeHead(404);return res.end('Not found');}
 fs.stat(file,(error,stat)=>{if(error||!stat.isFile()){res.writeHead(404);return res.end('Not found');}
  const headers={'Content-Type':types[extension],'Content-Length':stat.size,'Cache-Control':'no-store','X-Content-Type-Options':'nosniff','X-Robots-Tag':'noindex, nofollow','Content-Security-Policy':"default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data: blob: https://upload.wikimedia.org; media-src 'self' blob:; font-src 'self'; connect-src 'none'; frame-ancestors 'none'; base-uri 'self'"};
  const video=extension==='.mp4'||extension==='.webm';
  if(video)headers['Accept-Ranges']='bytes';
  let range;
  if(video&&req.headers.range){
   const match=/^bytes=(\d*)-(\d*)$/.exec(req.headers.range);
   let start=match?.[1]?Number(match[1]):0,end=match?.[2]?Number(match[2]):stat.size-1;
   if(match&&!match[1]&&match[2]){start=Math.max(0,stat.size-Number(match[2]));end=stat.size-1;}
   if(!match||(!match[1]&&!match[2])||(!match[1]&&Number(match[2])===0)||!Number.isSafeInteger(start)||!Number.isSafeInteger(end)||start<0||start>=stat.size||end<start){
    res.writeHead(416,{'Content-Range':`bytes */${stat.size}`,'Cache-Control':'no-store'});return res.end();
   }
   end=Math.min(end,stat.size-1);range={start,end};headers['Content-Range']=`bytes ${start}-${end}/${stat.size}`;headers['Content-Length']=end-start+1;
  }
  res.writeHead(range?206:200,headers);
  if(req.method==='HEAD')return res.end();fs.createReadStream(file,range).pipe(res);
 });
}).listen(port,'127.0.0.1',()=>console.log(`BLTZ selected design review: http://127.0.0.1:${port}/`));
