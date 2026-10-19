import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { beforeEach, afterEach, expect, it, vi } from "vitest";
import PreviewLockerForm from "@/app/admin/preview-lockers/PreviewLockerForm";
import { previewContent } from "@/lib/preview-lockers/validation";
const discovery=vi.hoisted(()=>({read:vi.fn()}));
vi.mock("@/lib/preview-lockers/stream-client",()=>({readDiscovery:discovery.read}));
const record={...previewContent.parse({slug:"fixture-player",full_name:"Fixture Player"}),id:"00000000-0000-4000-8000-000000000001",revision:3,created_at:"",updated_at:""};
let host:HTMLDivElement,root:Root,fetcher:ReturnType<typeof vi.fn>;
beforeEach(()=>{vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT",true);host=document.createElement("div");document.body.append(host);root=createRoot(host);fetcher=vi.fn();vi.stubGlobal("fetch",fetcher);discovery.read.mockReset();});
afterEach(async()=>{await act(async()=>root.unmount());host.remove();vi.unstubAllGlobals();});
async function click(text:string){const button=[...host.querySelectorAll('button')].find(item=>item.textContent===text)!;expect(button,text).toBeTruthy();await act(async()=>button.click());}
async function fill(label:string,value:string){const input=host.querySelector<HTMLInputElement>(`[aria-label="${label}"]`)!;expect(input,label).toBeTruthy();await act(async()=>{Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value')!.set!.call(input,value);input.dispatchEvent(new Event('input',{bubbles:true}));});}
async function select(label:string,value:string){const input=host.querySelector<HTMLSelectElement>(`[aria-label="${label}"]`)!;await act(async()=>{input.value=value;input.dispatchEvent(new Event('change',{bubbles:true}));});}
it("saves two separately sourced events, survives scraper replacement/fallback and reload, and supports explicit removal",async()=>{
  await act(async()=>root.render(<PreviewLockerForm record={record} gtmLinked/>));
  await click('Stats');await click('Add Combine or Pro Day event');
  await fill('Event 1 year','2008');await fill('Event 1 source','https://league.example.com/fixture');await select('Event 1 timing','official');
  await fill('Event 1 40-yard dash','4.55');await fill('Event 1 Bench press','0');await fill('Event 1 broad jump feet','10');await fill('Event 1 broad jump inches','2');
  await fill('Event 1 Broad jump source','https://school.example.com/fixture-jump');
  await click('Add Combine or Pro Day event');await select('Event 2 type','pro_day');await fill('Event 2 year','2008');await fill('Event 2 source','https://school.example.com/pro-day');await fill('Event 2 40-yard dash','4.49');
  fetcher.mockResolvedValueOnce(Response.json({id:record.id,slug:record.slug,revision:4}));await click('Save draft');
  const saved=JSON.parse(fetcher.mock.calls.at(-1)![1].body).content;
  expect(saved.combine_results).toHaveLength(2);
  expect(saved.combine_results[0].measurements).toContainEqual({metric:'broad_jump',value:122,sourceUrl:'https://school.example.com/fixture-jump'});
  expect(saved.combine_results[0].measurements).toContainEqual({metric:'bench',value:0,sourceUrl:null});
  const malicious=previewContent.parse({...saved,combine_results:[]});
  discovery.read.mockResolvedValue({draft:malicious,message:'Suggestions ready'});fetcher.mockResolvedValueOnce(new Response(''));
  await click('Info');await click('Build with web scraper');
  fetcher.mockResolvedValueOnce(Response.json({id:record.id,slug:record.slug,revision:5}));await click('Save draft');
  expect(JSON.parse(fetcher.mock.calls.at(-1)![1].body).content.combine_results).toEqual(saved.combine_results);
  await act(async()=>root.render(<PreviewLockerForm key="reloaded" record={{...record,...saved,revision:5}} gtmLinked/>));
  await click('Stats');expect(host.querySelector<HTMLInputElement>('[aria-label="Event 1 40-yard dash"]')!.value).toBe('4.55');
  expect(host.querySelector<HTMLInputElement>('[aria-label="Event 1 broad jump feet"]')!.value).toBe('10');
  expect(host.querySelector<HTMLInputElement>('[aria-label="Event 2 40-yard dash"]')!.value).toBe('4.49');
  await click('Remove event 2');fetcher.mockResolvedValueOnce(Response.json({id:record.id,slug:record.slug,revision:6}));await click('Save draft');
  expect(JSON.parse(fetcher.mock.calls.at(-1)![1].body).content.combine_results).toEqual([saved.combine_results[0]]);
});
it("blocks saving unsourced results and invalid bench repetitions while retaining the draft",async()=>{
  await act(async()=>root.render(<PreviewLockerForm record={record}/>));await click('Add Combine or Pro Day event');await fill('Event 1 Bench press','1.5');
  await click('Save draft');expect(fetcher).not.toHaveBeenCalled();expect(host.textContent).toContain('whole repetitions');expect(host.textContent).toContain('Add an event source');
  expect(host.querySelector<HTMLInputElement>('[aria-label="Event 1 Bench press"]')!.value).toBe('1.5');
});
it("keeps discovery separate from saving and persists only explicitly reviewed blank measurements",async()=>{
 const manual={id:'manual',eventType:'combine',year:2008,timing:'not_recorded',sourceUrl:'https://school.example.com/manual',measurements:[{metric:'forty',value:4.6,sourceUrl:null},{metric:'bench',value:0,sourceUrl:null}]} as const;
 await act(async()=>root.render(<PreviewLockerForm record={{...record,combine_results:[{...manual,measurements:[...manual.measurements]}]}}/>));
 const event={...manual,id:'source',sourceUrl:'https://en.wikipedia.org/wiki/Fixture_Player',measurements:[{metric:'forty',value:4.45,sourceUrl:null},{metric:'vertical',value:35.5,sourceUrl:null}]};
 fetcher.mockResolvedValueOnce(Response.json({revision:3,result:{status:'complete',sources:[],suggestions:[{id:'candidate',sourceLabel:'Wikipedia',event}]}}));
 await click('Search Combine & Pro Day results');expect(fetcher).toHaveBeenCalledTimes(1);
 const checkbox=host.querySelector<HTMLInputElement>('[aria-label="Review Vertical jump 35.5 from Wikipedia combine 2008"]')!;await act(async()=>checkbox.click());
 await click('Add selected measurements to draft');expect(fetcher).toHaveBeenCalledTimes(1);
 fetcher.mockResolvedValueOnce(Response.json({id:record.id,slug:record.slug,revision:4}));await click('Save draft');
 const saved=JSON.parse(fetcher.mock.calls.at(-1)![1].body).content;
 expect(saved.combine_results[0]).toMatchObject({id:'manual',sourceUrl:manual.sourceUrl});
 expect(saved.combine_results[0].measurements).toEqual([...manual.measurements,{metric:'vertical',value:35.5,sourceUrl:event.sourceUrl}]);
});
