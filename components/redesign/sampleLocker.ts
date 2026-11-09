import type { LockerData } from "@/app/player/[slug]/LockerView";

// A fictional athlete for the scroll-through demo. School and team names are
// invented so the mockup doesn't lean on real marks. The photos are AI-generated;
// the hero video is still a placeholder.
export const sampleLocker: LockerData = {
  athleteId: null,
  slug: "redesign-sample",
  fullName: "Jordan Carter",
  hometown: "Los Angeles, CA",
  position: "DB",
  jersey: "#1",
  levelLabel: "College",
  headshotUrl: "/images/redesign/locker-headshot.png",
  heroVideoUrl: null,
  logoSrc: "/bltz-white-logo.svg",
  bio: "Jordan Carter built a career around preparation, leadership, and making the biggest plays when the moment demanded it.",
  athleteQuote: "The work becomes the legacy when every chapter has a home.",
  athleteQuoteAuthor: "Jordan Carter",
  heightDisplay: "6'1\"",
  weightLbs: 205,
  dobDisplay: "08-07-2003",
  age: 23,
  gamesPlayed: 39,
  highSchool: "Crenshaw High School",
  classOf: "2021",
  school: {
    name: "Westbrook",
    abbr: "WBU",
    primaryColor: "#0d1a5c",
    logoUrl: "/images/bltz-mark.svg",
  },
  nfl: null,
  schools: [{ label: "WBU", color: "#0d1a5c", logo: "/images/bltz-mark.svg" }],
  proTeams: [],
  awards: [
    { year: "2025", label: "First-Team All-Conference" },
    { year: "2024", label: "Team Defensive MVP" },
  ],
  videos: [
    { id: "rd-film-1", title: "Season Highlights", thumb: "/images/redesign/locker/breakaway.jpg" },
    { id: "rd-film-2", title: "Under the Lights", thumb: "/images/redesign/locker/night-catch.jpg" },
    { id: "rd-film-3", title: "Top Plays", thumb: "/images/redesign/locker/tackle.jpg" },
  ],
  photos: [
    { id: "rd-photo-1", url: "/images/redesign/locker/night-catch.jpg", title: "Under the Lights", credits: "Team Archive", sourceUrl: null, provenance: "cal_archive", licenseLabel: "TEAM ARCHIVE" },
    { id: "rd-photo-2", url: "/images/redesign/locker/sideline-portrait.jpg", title: "Game Day", credits: "BLTZ Archive", sourceUrl: null, provenance: "founder_archive", licenseLabel: "BLTZ CLEARED" },
    { id: "rd-photo-3", url: "/images/redesign/locker/breakaway.jpg", title: "Breakaway", credits: "Athlete Upload", sourceUrl: null, provenance: "athlete_uploaded", licenseLabel: "ATHLETE UPLOAD" },
    { id: "rd-photo-4", url: "/images/redesign/locker/warmups.jpg", title: "Pregame", credits: "Team Archive", sourceUrl: null, provenance: "cal_archive", licenseLabel: "TEAM ARCHIVE" },
    { id: "rd-photo-5", url: "/images/redesign/locker/tackle.jpg", title: "Built for the Moment", credits: "BLTZ Archive", sourceUrl: null, provenance: "founder_archive", licenseLabel: "BLTZ CLEARED" },
  ],
};
