import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const views = [
  "app/player/[slug]/LockerView.tsx",
  "app/player/[slug]/videos/FilmRoomView.tsx",
  "app/player/[slug]/photos/PhotoRoomView.tsx",
  "app/player/[slug]/videos/[videoId]/VideoDetailView.tsx",
];

describe("public locker analytics targets", () => {
  it.each(views)("passes athleteSlug from %s", (file) => {
    const source = readFileSync(resolve(file), "utf8");
    expect(source).toContain("athleteSlug: data.slug");
  });
});
