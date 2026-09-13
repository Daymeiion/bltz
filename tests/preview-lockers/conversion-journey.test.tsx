import {act} from "react";
import {createRoot,type Root} from "react-dom/client";
import {beforeEach,afterEach,it,expect,vi} from "vitest";
import Journey from "@/components/preview-lockers/ConversionJourney";
let host:HTMLDivElement;let root:Root;const fetcher=vi.fn();
const id="00000000-0000-4000-8000-000000000001";
beforeEach(()=>{host=document.createElement("div");document.body.append(host);root=createRoot(host);vi.stubGlobal("fetch",fetcher);fetcher.mockReset();fetcher.mockImplementation(async()=>new Response(JSON.stringify({saved:true})));});
afterEach(async()=>{await act(async()=>root.unmount());host.remove();vi.unstubAllGlobals();});
async function click(text:string){await act(async()=>{[...host.querySelectorAll("button")].find(b=>b.textContent===text)!.click();});}
async function fill(selector:string,value:string){const element=host.querySelector<HTMLInputElement>(selector)!;await act(async()=>{Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,"value")!.set!.call(element,value);element.dispatchEvent(new Event("input",{bubbles:true}));});}
it("keeps claim clicks separate, retains failed form contents and reveals next steps only after persistence",async()=>{
  await act(async()=>root.render(<Journey previewId={id} bookingUrl="https://example.test/booking"/>));
  await click("Claim my Locker");expect(fetcher.mock.calls.some(c=>JSON.parse(c[1].body).action==="claim_click")).toBe(true);
  expect(host.textContent).not.toContain("Invite a teammate");
  await fill('input[type="email"]',"athlete@example.test");
  await act(async()=>{host.querySelector<HTMLInputElement>('input[type="checkbox"]')!.click();host.querySelectorAll<HTMLInputElement>('input[type="checkbox"]')[1].click();});
  fetcher.mockResolvedValueOnce(new Response(JSON.stringify({error:"unavailable"}),{status:503}));
  await act(async()=>host.querySelector("form")!.dispatchEvent(new Event("submit",{bubbles:true,cancelable:true})));
  expect(host.textContent).toContain("Your entries are retained");expect(host.querySelector<HTMLInputElement>('input[type="email"]')!.value).toBe("athlete@example.test");
  const first=JSON.parse(fetcher.mock.calls.at(-1)![1].body);expect(first.data.dashboard_interest).toBe(true);
  await act(async()=>host.querySelector("form")!.dispatchEvent(new Event("submit",{bubbles:true,cancelable:true})));
  expect(JSON.parse(fetcher.mock.calls.at(-1)![1].body).request_id).toBe(first.request_id);
  expect(host.textContent).toContain("Your interest is saved");expect(host.textContent).toContain("ownership still requires verification");expect(host.textContent).toContain("Invite a teammate");
});
it("saves a decline without a required reason",async()=>{
  await act(async()=>root.render(<Journey previewId={id}/>));await click("Not interested");
  expect(host.querySelector("textarea")?.required).toBe(false);
  await act(async()=>host.querySelector("form")!.dispatchEvent(new Event("submit",{bubbles:true,cancelable:true})));
  expect(JSON.parse(fetcher.mock.calls.at(-1)![1].body).action).toBe("declined");expect(host.textContent).toContain("Your response is saved");
});
it("hides conversion controls for an authorized but unenrolled preview",async()=>{
  fetcher.mockImplementation(async(_url,options)=>new Response(JSON.stringify(JSON.parse(options.body).action==="state"?{available:false}:{})));
  await act(async()=>root.render(<Journey previewId={id}/>));
  expect(host.textContent).toBe("");
});
