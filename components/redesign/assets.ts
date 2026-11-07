// Every photo the redesign uses, in one place.
//
// The current files are TEMPORARY stand-ins from the existing landing page.
// Several show real team uniforms and logos, so they must be replaced before
// launch. Generate replacements with the prompts in
// docs/redesign/ai-photo-prompts.md, save them under public/images/redesign/,
// and point each entry below at its new file.
export const redesignPhotos = {
  highSchool: { src: "/images/Media-4.avif", position: "center" },
  college: { src: "/images/media-6.jpg", position: "68% center" },
  pro: { src: "/images/media-5.jpg", position: "52% center" },
  former: { src: "/images/media-9.jpg", position: "55% center" },
  coaches: { src: "/images/Headshot.png", position: "center 16%" },
} as const;

export type RedesignPhotoKey = keyof typeof redesignPhotos;
