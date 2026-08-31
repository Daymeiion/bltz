import { renderToStaticMarkup } from "react-dom/server";
import { expect, it } from "vitest";
import AdminLoginPage from "@/app/auth/admin/page";

it.each([
  ["authentication_unavailable", /service is temporarily unavailable/i],
  ["invalid_credentials", /unable to sign in with those credentials/i],
  ["rate_limited", /wait before trying again/i],
  ["authorization_unavailable", /access could not be verified/i],
  ["not_admin", /does not have BLTZ administrator access/i],
])("renders actionable, safe feedback for %s", async (error, message) => {
  const host = document.createElement("div");
  host.innerHTML = renderToStaticMarkup(await AdminLoginPage({ searchParams: Promise.resolve({ error }) }));
  expect(host.querySelector('[role="alert"]')?.textContent).toMatch(message);
  expect(host.querySelector('input[name="password"]')?.getAttribute("value")).toBeNull();
  expect(host.querySelector("form")?.getAttribute("action")).toBe("/api/admin/login");
});

it("does not echo arbitrary upstream or query-string error text", async () => {
  const html = renderToStaticMarkup(await AdminLoginPage({ searchParams: Promise.resolve({ error: "private-upstream-detail" }) }));
  expect(html).not.toContain("private-upstream-detail");
  expect(html).toContain("Administrator sign in failed.");
});
