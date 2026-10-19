import { act, useState } from "react";
import { createRoot, type Root } from "react-dom/client";
import { beforeEach,afterEach,expect,it,vi } from "vitest";
import CombineSearchReview from "@/app/admin/preview-lockers/CombineSearchReview";
import type { CombineResult } from "@/lib/player/combine";
const event:CombineResult={id:'source',eventType:'combine',year:2008,timing:'not_recorded',sourceUrl:'https://en.wikipedia.org/wiki/Fixture_Player',measurements:[{metric:'forty',value:4.45,sourceUrl:null},{metric:'bench',value:20,sourceUrl:null}]};
const result={status:'complete',sources:[],suggestions:[{id:'one',sourceLabel:'Wikipedia',event},{id:'two',sourceLabel:'NFL',event:{...event,sourceUrl:'https://www.nfl.com/news/fixture',measurements:[{metric:'forty',value:4.5,sourceUrl:null}]}}]};
let host:HTMLDivElement,root:Root,fetcher:ReturnType<typeof vi.fn>;
beforeEach(()=>{vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT',true);host=document.createElement('div');document.body.append(host);root=createRoot(host);fetcher=vi.fn();vi.stubGlobal('fetch',fetcher);});
afterEach(async()=>{await act(async()=>root.unmount());host.remove();vi.unstubAllGlobals();});
async function click(text:string){const button=[...host.querySelectorAll('button')].find(item=>item.textContent===text)!;expect(button,text).toBeTruthy();await act(async()=>button.click());}
it("requires selection and explicit add, keeps conflicts visible and preserves existing measurements",async()=>{
 let saved:CombineResult[]=[];
 function Harness(){const[value,setValue]=useState<CombineResult[]>([{...event,id:'manual',measurements:[{metric:'bench',value:0,sourceUrl:null}]}]);saved=value;return <CombineSearchReview value={value} onChange={setValue} preview={{id:'id',revision:3}} identityKey='fixture' searchDisabled={false} onBusyChange={()=>{}}/>;}
 await act(async()=>root.render(<Harness/>));fetcher.mockResolvedValueOnce(Response.json({revision:3,result}));await click('Search Combine results');
 expect(saved[0].measurements).toHaveLength(1);expect(host.textContent).toContain('Sources disagree');
 const checkboxes=[...host.querySelectorAll<HTMLInputElement>('input[type="checkbox"]')];expect(checkboxes[1].disabled).toBe(true);
 await act(async()=>checkboxes[0].click());await act(async()=>checkboxes[2].click());expect(checkboxes[0].checked).toBe(false);
 await click('Add selected measurements to draft');expect(saved[0].measurements).toEqual([{metric:'bench',value:0,sourceUrl:null},{metric:'forty',value:4.5,sourceUrl:'https://www.nfl.com/news/fixture'}]);
 expect(fetcher).toHaveBeenCalledTimes(1);expect(host.textContent).toContain('Save draft to keep');
});
it("appends and deduplicates searches, retains review on failure and invalidates it for another identity",async()=>{
 const props={value:[],onChange:vi.fn(),preview:{id:'id',revision:3},identityKey:'fixture',searchDisabled:false,onBusyChange:vi.fn()};
 await act(async()=>root.render(<CombineSearchReview {...props}/>));fetcher.mockResolvedValueOnce(Response.json({revision:3,result}));await click('Search Combine results');
 fetcher.mockResolvedValueOnce(Response.json({revision:3,result}));await click('Search Combine results');expect(host.querySelectorAll('input[type="checkbox"]')).toHaveLength(3);
 fetcher.mockResolvedValueOnce(Response.json({error:'search_not_configured'},{status:503}));await click('Search Combine results');expect(host.querySelectorAll('input[type="checkbox"]')).toHaveLength(3);expect(host.textContent).toContain('retained');
 await act(async()=>root.render(<CombineSearchReview {...props} identityKey='another'/>));expect(host.querySelectorAll('input[type="checkbox"]')).toHaveLength(0);
});
it("excludes Pro Day suggestions from an older response",async()=>{
 const props={value:[],onChange:vi.fn(),preview:{id:'id',revision:3},identityKey:'fixture',searchDisabled:false,onBusyChange:vi.fn()};
 await act(async()=>root.render(<CombineSearchReview {...props}/>));
 fetcher.mockResolvedValueOnce(Response.json({revision:3,result:{...result,suggestions:[{id:'legacy-pro',sourceLabel:'NFL',event:{...event,eventType:'pro_day'}}]}}));
 await click('Search Combine results');expect(host.querySelectorAll('input[type="checkbox"]')).toHaveLength(0);expect(host.textContent).not.toContain('Pro Day');
 expect(props.onChange).not.toHaveBeenCalled();
});
