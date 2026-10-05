// @vitest-environment node
import { expect, it } from "vitest";
import { previewContent, previewSocial, previewRecord } from "@/lib/preview-lockers/validation";
import { socialEmbedUrl } from "@/lib/preview-lockers/social";
import { previewLockerData } from "@/lib/preview-lockers/mapper";
const social={id:"s1",title:"Training",platform:"Instagram",kind:"short",format:"portrait",sourceUrl:"https://www.instagram.com/reel/fixture/",caption:"Training today",handle:"@athlete",photoId:"p1",videoId:"v1"};
it("validates platform links and refuses injected fields, schemes, and oversized captions", () => {
 expect(previewSocial.safeParse(social).success).toBe(true);
 for(const patch of [{sourceUrl:"javascript:alert(1)"},{sourceUrl:"https://instagram.com.evil.com/reel/123"},{platform:"X"},{caption:"x".repeat(2001)},{html:"<script>"},{photoId:"../other"}]) expect(previewSocial.safeParse({...social,...patch}).success).toBe(false);
 expect(previewContent.safeParse({slug:"test-player",full_name:"Test Player",social:[social,social]}).success).toBe(false);
});
it("only constructs known provider embeds, leaving unsupported links as originals", () => {
 expect(socialEmbedUrl("Instagram",social.sourceUrl,"short")).toBe("https://www.instagram.com/reel/fixture/embed/");
 expect(socialEmbedUrl("Facebook","https://www.facebook.com/reel/123","short")).toContain("https://www.facebook.com/plugins/video.php?href=");
 expect(socialEmbedUrl("X","https://x.com/athlete/status/123","post")).toBeNull();
 expect(socialEmbedUrl("Instagram","https://evil.com/p/a","post")).toBeNull();
});
it("resolves award and social media from the preview photos and videos", () => {
 const row=previewRecord.parse({id:"00000000-0000-4000-8000-000000000001",slug:"test-player",full_name:"Test Player",revision:1,created_at:"",updated_at:"",social:[social],awards:[{year:"2020",label:"Honor",photoId:"p1",description:"Season honor"}],photos:[{id:"p1",title:"Trophy",url:"https://example.com/trophy.png",level:"off-field"}],videos:[{id:"v1",title:"Training",url:"https://example.com/training.mp4",thumb:null}]});
 const data=previewLockerData(row);
 expect(data.awards[0]).toMatchObject({imageUrl:"https://example.com/trophy.png",description:"Season honor"});
 expect(data.social?.[0]).toMatchObject({imageUrl:"https://example.com/trophy.png",videoUrl:"https://example.com/training.mp4"});
 expect(previewLockerData({...row,photos:[],videos:[]}).social?.[0]).toMatchObject({imageUrl:null,videoUrl:null});
});
