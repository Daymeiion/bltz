import { act, StrictMode } from "react";
import { createRoot, type Root } from "react-dom/client";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { UpdatePasswordForm } from "@/components/update-password-form";
import AuthErrorPage from "@/app/auth/error/page";
import { ForgotPasswordForm } from "@/components/forgot-password-form";

const { initialize, getUser, updateUser, resetPasswordForEmail } = vi.hoisted(() => ({
  initialize: vi.fn(), getUser: vi.fn(), updateUser: vi.fn(), resetPasswordForEmail: vi.fn(),
}));
vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({ auth: { initialize, getUser, updateUser, resetPasswordForEmail } }),
}));
let host: HTMLDivElement;
let root: Root;
beforeEach(() => {
  vi.resetAllMocks();
  window.history.replaceState(null, "", "/auth/update-password");
  initialize.mockResolvedValue({ error: null });
  getUser.mockResolvedValue({ data: { user: { id: "test-user", email: "synthetic@bltz.invalid" } }, error: null });
  updateUser.mockResolvedValue({ data: { user: { id: "test-user" } }, error: null });
  host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
});
afterEach(async () => {
  await act(async () => root.unmount());
  host.remove();
});
const render = () => act(async () => root.render(<StrictMode><UpdatePasswordForm /></StrictMode>));
async function fillPassword() {
  const input = host.querySelector<HTMLInputElement>('input[type="password"]')!;
  await act(async () => {
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!.call(input, "synthetic-new-password");
    input.dispatchEvent(new Event("input", { bubbles: true }));
  });
}
const submit = () => act(async () => host.querySelector("form")!.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true })));

it("waits for PKCE initialization and Auth verification before accepting a password", async () => {
  let finish!: (value: { error: null }) => void;
  initialize.mockImplementation(() => new Promise(resolve => { finish = resolve; }));
  window.history.replaceState(null, "", "/auth/update-password?code=synthetic-code");
  await render();
  expect(host.querySelector("input")).toBeNull();
  expect(host.textContent).toContain("Verifying your session");
  expect(getUser).not.toHaveBeenCalled();
  await act(async () => {
    // The real SDK removes the code only after a successful exchange.
    window.history.replaceState(null, "", "/auth/update-password");
    finish({ error: null });
  });
  expect(initialize).toHaveBeenCalledTimes(1);
  expect(getUser).toHaveBeenCalledTimes(1);
  expect(host.querySelector("input")).not.toBeNull();
  expect(host.textContent).toContain("Updating password for synthetic@bltz.invalid");
});

it.each(["code=synthetic-code", "token_hash=synthetic-token", "error=private-detail"])(
  "rejects an unconsumed callback despite an older valid session: %s", async query => {
    window.history.replaceState(null, "", "/auth/update-password?" + query);
    await render();
    expect(host.querySelector("input")).toBeNull();
    expect(getUser).not.toHaveBeenCalled();
    expect(updateUser).not.toHaveBeenCalled();
    expect(window.location.search).toBe("");
    expect(host.textContent).not.toMatch(/synthetic-code|synthetic-token|private-detail/);
  },
);

it("does not treat a recovery URL flag as authentication", async () => {
  window.history.replaceState(null, "", "/auth/update-password?type=recovery");
  getUser.mockResolvedValue({ data: { user: null }, error: null });
  await render();
  expect(host.querySelector("input")).toBeNull();
  expect(host.querySelector('[role="alert"]')?.textContent).toContain("could not be verified");
  expect(updateUser).not.toHaveBeenCalled();
});

it.each(["returned", "thrown"])("handles %s initialization errors without exposing callback data", async kind => {
  window.history.replaceState(null, "", "/auth/update-password?code=synthetic-code#refresh_token=synthetic-refresh");
  if (kind === "returned") initialize.mockResolvedValue({ error: new Error("private-detail") });
  else initialize.mockRejectedValue(new Error("private-detail"));
  await render();
  expect(host.querySelector("input")).toBeNull();
  expect(getUser).not.toHaveBeenCalled();
  expect(window.location.search + window.location.hash).toBe("");
  expect(host.textContent).not.toMatch(/private-detail|synthetic/);
});

it.each(["expired", "changed"])("rechecks the session and blocks writes if it %s before submission", async reason => {
  await render();
  await fillPassword();
  getUser.mockResolvedValue({ data: { user: reason === "expired" ? null : { id: "different-user" } }, error: null });
  await submit();
  expect(updateUser).not.toHaveBeenCalled();
  expect(host.querySelector("input")).toBeNull();
  expect(host.textContent).not.toContain("synthetic-new-password");
});

it("saves once, clears the password and shows explicit success without legacy navigation", async () => {
  await render();
  await fillPassword();
  let finish!: (value: unknown) => void;
  updateUser.mockImplementation(() => new Promise(resolve => { finish = resolve; }));
  await submit();
  await submit();
  expect(updateUser).toHaveBeenCalledExactlyOnceWith({ password: "synthetic-new-password" });
  expect(host.querySelector("button")!.disabled).toBe(true);
  await act(async () => finish({ data: { user: { id: "test-user" } }, error: null }));
  expect(host.querySelector('[role="status"]')?.textContent).toContain("Password updated");
  expect(host.querySelector("input")).toBeNull();
  expect(host.querySelector('a[href="/auth/admin"]')).not.toBeNull();
  expect(window.location.pathname).toBe("/auth/update-password");
  expect(host.innerHTML).not.toMatch(/synthetic-new-password|\/protected/);
});

it.each(["returned", "thrown"])("reports %s save failures safely and permits retry", async kind => {
  await render();
  await fillPassword();
  if (kind === "returned") updateUser.mockResolvedValueOnce({ data: { user: null }, error: { message: "private-detail synthetic-new-password" } });
  else updateUser.mockRejectedValueOnce(new Error("private-detail synthetic-new-password"));
  await submit();
  expect(host.querySelector('[role="alert"]')?.textContent).toContain("Could not update");
  expect(host.textContent).not.toMatch(/private-detail|synthetic-new-password/);
  expect(host.querySelector("button")!.disabled).toBe(false);
  await submit();
  expect(host.querySelector('[role="status"]')?.textContent).toContain("Password updated");
});

it("never reflects arbitrary callback errors and offers a fresh reset link", async () => {
  const html = renderToStaticMarkup(await AuthErrorPage({ searchParams: Promise.resolve({ error: "private-upstream-token" }) }));
  expect(html).not.toContain("private-upstream-token");
  expect(html).toContain("/auth/forgot-password");
});

it("disables the form if the session expires at the actual password write", async () => {
  await render();
  await fillPassword();
  updateUser.mockResolvedValue({ data: { user: null }, error: { status: 401, message: "private-detail" } });
  await submit();
  expect(host.querySelector("input")).toBeNull();
  expect(host.querySelector('[role="alert"]')?.textContent).toContain("could not be verified");
});

it("keeps the released server recovery callback target and hides upstream failures", async () => {
  resetPasswordForEmail.mockResolvedValueOnce({ error: new Error("private-detail") });
  resetPasswordForEmail.mockResolvedValueOnce({ error: null });
  await act(async () => root.render(<ForgotPasswordForm />));
  await act(async () => {
    const input = host.querySelector<HTMLInputElement>('input[type="email"]')!;
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!.call(input, "synthetic@bltz.invalid");
    input.dispatchEvent(new Event("input", { bubbles: true }));
  });
  await submit();
  expect(resetPasswordForEmail).toHaveBeenCalledExactlyOnceWith("synthetic@bltz.invalid", {
    redirectTo: window.location.origin + "/auth/callback?next=%2Fauth%2Fupdate-password",
  });
  expect(host.querySelector('[role="alert"]')?.textContent).toBe("Unable to send a reset email right now. Please try again.");
  expect(host.textContent).not.toContain("private-detail");
  await submit();
  expect(host.textContent).toContain("If you registered");
});
