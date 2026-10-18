import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import PreviewLockerForm from "@/app/admin/preview-lockers/PreviewLockerForm";
import { previewContent } from "@/lib/preview-lockers/validation";
import type { PlayerArticle } from "@/lib/enrichment/news";
const storage=vi.hoisted(()=>({upload:vi.fn(),sign:vi.fn()}));
vi.mock("@/lib/supabase/client",()=>({createClient:()=>({storage:{from:()=>({uploadToSignedUrl:storage.upload,createSignedUrl:storage.sign})}})}));
const id="00000000-0000-4000-8000-000000000001",path=`${id}/photos/00000000-0000-4000-8000-000000000002.png`;
const defaultUrl="https://publisher.example.com/scraped.png",uploadedUrl="https://storage.example.com/uploaded.png";
const article={headline:"Fixture Player football career",publisher:"Sports Press",article_url:"https://publisher.example.com/career",canonical_url:"https://publisher.example.com/career",thumbnail_url:defaultUrl,summary:"A football career.",published_at:null} as PlayerArticle;
const record={...previewContent.parse({slug:"fixture-player",full_name:"Fixture Player"}),id,revision:1,created_at:"",updated_at:""};
let host:HTMLDivElement,root:Root,fetcher:ReturnType<typeof vi.fn>;
beforeEach(()=>{vi.resetAllMocks();host=document.createElement("div");document.body.append(host);root=createRoot(host);fetcher=vi.fn();vi.stubGlobal("fetch",fetcher);storage.upload.mockResolvedValue({error:null});storage.sign.mockResolvedValue({data:{signedUrl:uploadedUrl},error:null});});
afterEach(async()=>{await act(async()=>root.unmount());host.remove();vi.unstubAllGlobals();});
const image=()=>host.querySelector<HTMLImageElement>('img[alt="Fixture Player football career image"]');
async function click(text:string){await act(async()=>[...host.querySelectorAll('button')].find(button=>button.textContent===text)!.click());}
async function upload(label='Scraped article 1',file=new File(['image'],'replacement.png',{type:'image/png'})){
 const input=host.querySelector<HTMLInputElement>(`[aria-label="${label} upload image"]`)!;
 Object.defineProperty(input,'files',{configurable:true,value:[file]});
 await act(async()=>input.dispatchEvent(new Event('change',{bubbles:true})));
}
it("uploads directly to a scraped article, saves the private override, and restores only the image after reload",async()=>{
 await act(async()=>root.render(<PreviewLockerForm record={record} initialArticles={[article]}/>));expect(image()?.src).toBe(defaultUrl);
 fetcher.mockResolvedValueOnce(Response.json({path,token:'ticket',bucket:'preview-locker-photos'}));await upload();expect(image()?.src).toBe(uploadedUrl);
 expect(JSON.parse(fetcher.mock.calls[0][1].body).kind).toBe('article');
 fetcher.mockResolvedValueOnce(Response.json({id,slug:record.slug,revision:2}));await click('Save draft');
 const payload=JSON.parse(fetcher.mock.calls[1][1].body);
 expect(payload.content.article_edits).toHaveLength(1);expect(payload.content.article_edits[0]).toMatchObject({sourceUrl:article.article_url,imageUrl:defaultUrl,imageStoragePath:path});
 expect(JSON.stringify(payload)).not.toContain(uploadedUrl);expect(payload.content.photos).toEqual([]);
 await act(async()=>root.render(<PreviewLockerForm key="reload" record={{...record,...payload.content,revision:2}} initialArticles={[article]} initialImageUrls={{[path]:uploadedUrl}}/>));expect(image()?.src).toBe(uploadedUrl);
 const input=host.querySelector<HTMLInputElement>('[aria-label="Scraped article 1 headline"]')!;
 await act(async()=>{Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value')!.set!.call(input,'Reviewed headline');input.dispatchEvent(new Event('input',{bubbles:true}));});
 await click('Use default image');expect(input.value).toBe('Reviewed headline');expect(host.querySelector<HTMLImageElement>('img[alt="Reviewed headline image"]')?.src).toBe(defaultUrl);
 fetcher.mockResolvedValueOnce(Response.json({id,slug:record.slug,revision:3}));await click('Save draft');
 expect(JSON.parse(fetcher.mock.calls.at(-1)![1].body).content.article_edits[0]).toMatchObject({headline:'Reviewed headline',imageUrl:defaultUrl,imageStoragePath:null});
});
it("keeps the scraped image and creates no edit on failed or invalid uploads",async()=>{
 await act(async()=>root.render(<PreviewLockerForm record={record} initialArticles={[article]}/>));
 await upload('Scraped article 1',new File(['bad'],'bad.mp4',{type:'video/mp4'}));expect(fetcher).not.toHaveBeenCalled();
 const huge=new File(['x'],'large.png',{type:'image/png'});Object.defineProperty(huge,'size',{value:10485761});await upload('Scraped article 1',huge);expect(fetcher).not.toHaveBeenCalled();
 fetcher.mockResolvedValueOnce(Response.json({path,token:'ticket',bucket:'preview-locker-photos'}));storage.upload.mockResolvedValueOnce({error:{message:'failed'}});await upload();
 expect(host.querySelector('[role="alert"]')?.textContent).toContain('current image is unchanged');expect(image()?.src).toBe(defaultUrl);
 expect(host.querySelector('[aria-label="Scraped article 1 headline"]')).toBeNull();
});
it("also uploads an image for a manually added article with no scraped image",async()=>{
 const edit={id:'manual',sourceUrl:null,headline:article.headline,publisher:article.publisher,articleUrl:article.article_url,imageUrl:null,summary:'',publishedAt:null,visible:true};
 await act(async()=>root.render(<PreviewLockerForm record={{...record,article_edits:[edit]}}/>));
 fetcher.mockResolvedValueOnce(Response.json({path,token:'ticket',bucket:'preview-locker-photos'}));await upload('Added article 1');expect(image()?.src).toBe(uploadedUrl);
 fetcher.mockResolvedValueOnce(Response.json({id,slug:record.slug,revision:2}));await click('Save draft');
 expect(JSON.parse(fetcher.mock.calls[1][1].body).content.article_edits).toEqual([expect.objectContaining({id:'manual',imageUrl:null,imageStoragePath:path})]);
});
