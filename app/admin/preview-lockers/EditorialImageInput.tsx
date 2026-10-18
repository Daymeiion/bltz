"use client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function EditorialImageInput({label,title,kind,defaultUrl,storagePath,imageUrls,saved,busy,disabled=false,error,onUpload,onDefault}: {
  label:string; title:string; kind:"article"|"merchandise"|"school logo"; defaultUrl:string|null; storagePath?:string|null;
  imageUrls:Record<string,string>; saved:boolean; busy:boolean; disabled?:boolean; error?:string;
  onUpload:(file:File|undefined)=>void; onDefault:()=>void;
}) {
  const imageUrl=storagePath?imageUrls[storagePath]:defaultUrl;
  return <div className="space-y-3 sm:col-span-2">
    {imageUrl?<img src={imageUrl} alt={`${title || label} image`} className="h-40 w-full rounded border object-contain p-2"/>:<p className="text-sm text-muted-foreground">{storagePath?"Uploaded image preview unavailable. You can replace it or use the default.":"No default image. Upload one below."}</p>}
    <p className="text-xs text-muted-foreground">{storagePath?"Uploaded image":"Default image"} · {kind === "school logo" ? "The scraped logo is the default. Later searches keep your uploaded replacement." : "The scraped image is used until you upload a replacement."}</p>
    <label className="grid gap-2 text-sm">{storagePath||defaultUrl?`Replace ${kind}${kind === "school logo" ? "" : " image"}`:`Upload ${kind}${kind === "school logo" ? "" : " image"}`}<Input aria-label={`${label} upload image`} type="file" accept="image/jpeg,image/png,image/webp" disabled={!saved||busy||disabled} onChange={event=>{onUpload(event.target.files?.[0]);event.target.value="";}}/><span className="text-xs text-muted-foreground">JPG, PNG or WebP. Up to 10 MB. Save the draft to keep your image.</span></label>
    {!saved&&<p className="text-sm text-muted-foreground">Save the draft once before uploading images.</p>}
    {disabled&&<p className="text-sm text-muted-foreground">The draft has reached its article limit. Remove an added article before uploading a replacement here.</p>}
    {storagePath&&<Button type="button" variant="outline" disabled={busy} onClick={onDefault}>Use default image</Button>}
    {error&&<p role="alert" className="text-sm text-red-400">{error}</p>}
  </div>;
}
