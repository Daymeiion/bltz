import {act} from "react";
import {createRoot,type Root} from "react-dom/client";
import {beforeEach,afterEach,it,expect,vi} from "vitest";
import Journey from "@/components/preview-lockers/ConversionJourney";
let host:HTMLDivElement;let root:Root;const fetcher=vi.fn();
const id="00000000-0000-4000-8000-000000000001";
beforeEach(()=>{host=document.createElement("div");document.body.append(host);root=createRoot(host);vi.stubGlobal("fetch",fetcher);fetcher.mockReset();fetcher.mockImplementation(async()=>new Response(JSON.stringify({saved:true})));});
afterEach(async()=>{await act(async()=>root.unmount());host.remove();vi.unstubAllGlobals();});
async function click(text:string){await act(async()=>{[...document.body.querySelectorAll("button")].find(b=>b.textContent?.includes(text))!.click();});}
async function fill(selector:string,value:string){const element=document.body.querySelector<HTMLInputElement>(selector)!;await act(async()=>{Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,"value")!.set!.call(element,value);element.dispatchEvent(new Event("input",{bubbles:true}));});}
it("keeps claim clicks separate, retains failed form contents and reveals next steps only after persistence",async()=>{
  await act(async()=>root.render(<Journey previewId={id} bookingUrl="https://example.test/booking"/>));
  await click("Claim the locker");expect(fetcher.mock.calls.some(c=>JSON.parse(c[1].body).action==="claim_click")).toBe(true);
  expect(document.body.textContent).not.toContain("Invite a teammate");
  await fill('input[type="email"]',"athlete@example.test");
  await act(async()=>{document.body.querySelector<HTMLInputElement>('input[type="checkbox"]')!.click();});
  fetcher.mockResolvedValueOnce(new Response(JSON.stringify({error:"unavailable"}),{status:503}));
  await act(async()=>document.body.querySelector("form")!.dispatchEvent(new Event("submit",{bubbles:true,cancelable:true})));
  expect(document.body.textContent).toContain("Your entries are retained");expect(document.body.querySelector<HTMLInputElement>('input[type="email"]')!.value).toBe("athlete@example.test");
  const first=JSON.parse(fetcher.mock.calls.at(-1)![1].body);expect(first.data).not.toHaveProperty("dashboard_interest");
  await act(async()=>document.body.querySelector("form")!.dispatchEvent(new Event("submit",{bubbles:true,cancelable:true})));
  expect(JSON.parse(fetcher.mock.calls.at(-1)![1].body).request_id).toBe(first.request_id);
  expect(document.body.textContent).toContain("Your interest is saved");expect(document.body.textContent).toContain("ownership still requires verification");expect(document.body.textContent).toContain("Invite a teammate");
});
it("saves a decline without a required reason",async()=>{
  await act(async()=>root.render(<Journey previewId={id}/>));await click("Claim the locker");await click("Not interested");
  expect(document.body.querySelector("textarea")?.required).toBe(false);
  await act(async()=>document.body.querySelector("form")!.dispatchEvent(new Event("submit",{bubbles:true,cancelable:true})));
  expect(JSON.parse(fetcher.mock.calls.at(-1)![1].body).action).toBe("declined");expect(document.body.textContent).toContain("Your response is saved");
});
it("explains unavailable requests without removing the bottom claim section",async()=>{
  fetcher.mockImplementation(async(_url,options)=>new Response(JSON.stringify(JSON.parse(options.body).action==="state"?{available:false}:{})));
  await act(async()=>root.render(<Journey previewId={id}/>));
  await click("Claim the locker");expect(document.body.textContent).toContain("Requests are not available");
});
it("confirms valid player entries into a removable list before claim submission",async()=>{
  await act(async()=>root.render(<Journey previewId={id}/>));
  await click("Claim the locker"); await click("Add a player");
  const confirm=()=>document.body.querySelector<HTMLButtonElement>('[aria-label="Add player to referral list"]')!;
  await act(async()=>confirm().click());
  expect(document.body.textContent).toContain("Enter the player’s name");
  await fill('[aria-label="Player name"]',"Test Player");
  await fill('[aria-label="Player email"]',"player@example.test");
  await act(async()=>confirm().click());
  expect(document.body.querySelector('[aria-label="Players to refer"]')?.textContent).toContain("Test Player");
  expect(document.body.querySelector('[aria-label="Player name"]')).toBeNull();
  await act(async()=>document.body.querySelector<HTMLButtonElement>('[aria-label="Remove Test Player"]')!.click());
  expect(document.body.querySelector('[aria-label="Players to refer"]')).toBeNull();
});
it("reveals the mobile scrollbar on scrolling and hides it after inactivity",async()=>{
  await act(async()=>root.render(<Journey previewId={id}/>));
  await click("Claim the locker");
  const scroller=document.body.querySelector<HTMLElement>(".preview-claim-scroll")!;
  expect(scroller.dataset.scrolling).toBe("false");
  vi.useFakeTimers();
  try {
    await act(async()=>scroller.dispatchEvent(new Event("scroll")));
    expect(scroller.dataset.scrolling).toBe("true");
    await act(async()=>vi.advanceTimersByTime(900));
    expect(scroller.dataset.scrolling).toBe("false");
  } finally { vi.useRealTimers(); }
});
