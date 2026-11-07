// Every photo the redesign uses, in one place.
//
// The current files are TEMPORARY stand-ins from the existing site. Several
// show real team uniforms and logos, so they must be replaced before launch.
// Generate replacements with the prompts in docs/redesign/README.md, save
// them under public/images/redesign/, and point each entry below at its new
// file. (Watermarked Getty/Alamy images were deliberately left out.)
export const redesignPhotos = {
  highSchool: { src: "/images/dante-hughes/video-poster-01.jpg", position: "center" },
  college: { src: "/images/media-6.jpg", position: "68% center" },
  pro: { src: "/images/media-9.jpg", position: "55% center" },
  former: { src: "/images/dante-hughes/01-lott-trophy.jpg", position: "center 30%" },
  coaches: { src: "/images/dante-hughes/16-offseason-training.jpg", position: "40% center" },
} as const;

export type RedesignPhotoKey = keyof typeof redesignPhotos;

export const storyPhotos = {
  broadcast: { src: "/images/dante-hughes/video-poster-01.jpg", position: "center" },
  broadcast2: { src: "/images/dante-hughes/video-poster-02.jpg", position: "center" },
  college: { src: "/images/media-6.jpg", position: "62% center" },
  trophy: { src: "/images/dante-hughes/01-lott-trophy.jpg", position: "center 30%" },
  rookieCard: { src: "/images/dante-hughes/21-colts-rookie-card.jpg", position: "center" },
  autograph: { src: "/images/dante-hughes/22-colts-autograph-card.jpg", position: "center" },
  pro: { src: "/images/media-9.jpg", position: "55% center" },
  action: { src: "/images/media-5.jpg", position: "center" },
  training: { src: "/images/dante-hughes/16-offseason-training.jpg", position: "40% center" },
  headshot: { src: "/images/dante-hughes/13-chargers-profile.png", position: "center 20%" },
  helmet: { src: "/images/Media-4.avif", position: "center" },
  program: { src: "/images/dante-hughes/15-colts-tackle.jpg", position: "center" },
} as const;

// Enterprise page. Final files: see docs/redesign/ai-photo-prompts.md.
export const enterprisePhotos = {
  departments: { src: "/images/media-6.jpg", position: "center 35%" }, // program-athletic-departments.jpg
  collectives: { src: "/images/dante-hughes/16-offseason-training.jpg", position: "center 30%" }, // program-nil-collectives.jpg
  letterwinners: { src: "/images/dante-hughes/01-lott-trophy.jpg", position: "center 25%" }, // program-letterwinners.jpg
  boosters: { src: "/images/media-9.jpg", position: "center 30%" }, // program-booster-clubs.jpg
  foundations: { src: "/images/media-5.jpg", position: "center 30%" }, // program-foundations.jpg
  highSchool: { src: "/images/dante-hughes/video-poster-01.jpg", position: "center" }, // program-high-school.jpg
} as const;
