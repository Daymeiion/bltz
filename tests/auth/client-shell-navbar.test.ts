import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const shell = readFileSync(resolve("app/client-shell.tsx"), "utf8");

describe("ClientShell navbar visibility", () => {
  it("hides the global navbar on auth routes", () => {
    expect(shell).toContain('pathname?.startsWith("/auth")');
  });
});
