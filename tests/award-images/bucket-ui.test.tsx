import { act } from "react";
import { createRoot } from "react-dom/client";
import { expect, it, vi } from "vitest";
import BucketAwardImages from "@/app/admin/award-images/BucketAwardImages";
it("imports an existing bucket batch, retains successes and continues after an individual failure",async()=>{
 const host=document.createElement("div");document.body.append(host);const root=createRoot(host),reload=vi.fn(async()=>{}),busy=vi.fn();
 const fetcher=vi.fn(async(_url:string,options?:RequestInit)=>{
  if(!options?.method)return Response.json({files:[{filename:"one.png",size:20},{filename:"two.png",size:20},{filename:"three.png",size:20}]});
  const {filename}=JSON.parse(options.body as string);return filename==="two.png"?Response.json({error:"failed"},{status:503}):Response.json(filename==="three.png"?{duplicate:true,id:"one"}:{id:"one"});
 });vi.stubGlobal("fetch",fetcher);
 try{
  await act(async()=>root.render(<BucketAwardImages busy={false} onBusyChange={busy} onReload={reload}/>));
  const button=[...host.querySelectorAll("button")].find(row=>row.textContent==="Import bucket images (3)")!;
  await act(async()=>button.click());
  expect(host.textContent).toContain("1 images imported · 1 already saved · 1 failed");expect(reload).toHaveBeenCalledOnce();expect(busy.mock.calls).toEqual([[true],[false]]);
 }finally{await act(async()=>root.unmount());host.remove();vi.unstubAllGlobals();}
});
