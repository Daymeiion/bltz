import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const page = readFileSync(resolve("app/auth/admin/page.tsx"), "utf8");

describe("admin login responsive shell", () => {
  it("fills the viewport after auth routes hide the global navbar", () => {
    expect(page).toContain("min-h-svh");
    expect(page).not.toContain("min-h-[calc(100svh-3.5rem)]");
  });

  it("keeps description text clear of the CardHeader border", () => {
    expect(page).toContain('CardHeader className="border-b border-neutral-800 pb-6"');
  });
});
