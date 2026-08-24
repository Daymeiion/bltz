import { describe, expect, it, vi } from "vitest";
import {
  colorContrast,
  resolveEnterpriseSchoolTheme,
  type ExactSchoolIdentityResult,
  type ExactSchoolThemeAdapter,
} from "@/lib/enterprise-crm/theme/resolver";
import { EXECUTIVE_TEST_IDS } from "@/lib/enterprise-crm/fixtures/executive-test-fixtures";

function adapter(result: ExactSchoolIdentityResult): ExactSchoolThemeAdapter {
  return { resolveExactIdentity: vi.fn().mockResolvedValue(result) };
}

function exact(overrides: Partial<Extract<ExactSchoolIdentityResult, { kind: "exact" }>["record"]> = {}): ExactSchoolIdentityResult {
  return {
    kind: "exact",
    record: {
      schoolId: EXECUTIVE_TEST_IDS.organization,
      directoryRecordId: "directory-123",
      linkEvidence: "approved_typed_link",
      linkVersion: "identity-v1",
      primaryColor: "#003262",
      secondaryColor: "#fdb515",
      logoUrl: "https://example.test/logo.svg",
      ...overrides,
    },
  };
}

describe("exact-link-only school theme resolution", () => {
  it("returns a contrast-safe theme only from exact approved evidence", async () => {
    await expect(
      resolveEnterpriseSchoolTheme({
        schoolId: EXECUTIVE_TEST_IDS.organization,
        adapter: adapter(exact()),
      }),
    ).resolves.toEqual({
      mode: "school",
      accent: "#003262",
      highlight: "#fdb515",
      logoUrl: "https://example.test/logo.svg",
      identityVersion: "identity-v1",
      directoryRecordId: "directory-123",
    });
    expect(colorContrast("#003262", "#ffffff")).toBeGreaterThanOrEqual(3);
    expect(colorContrast("#fdb515", "#171a21")).toBeGreaterThanOrEqual(3);
  });

  it.each([
    { kind: "missing" as const },
    { kind: "ambiguous" as const },
    { kind: "unsafe" as const },
  ])("returns BLTZ Default for $kind identity", async (result) => {
    await expect(
      resolveEnterpriseSchoolTheme({
        schoolId: EXECUTIVE_TEST_IDS.organization,
        adapter: adapter(result),
      }),
    ).resolves.toEqual({
      mode: "bltz",
      accent: "#2952ff",
      highlight: "#d6a500",
      logoUrl: null,
      identityVersion: "bltz-default",
    });
  });

  it("rejects cross-school link evidence and unsafe colors", async () => {
    for (const result of [
      exact({ schoolId: EXECUTIVE_TEST_IDS.otherOrganization }),
      exact({ primaryColor: "#ffffff" }),
      exact({ secondaryColor: "not-a-color" }),
      exact({ linkVersion: "" }),
      exact({ logoUrl: "javascript:alert(1)" }),
    ]) {
      await expect(
        resolveEnterpriseSchoolTheme({
          schoolId: EXECUTIVE_TEST_IDS.organization,
          adapter: adapter(result),
        }),
      ).resolves.toMatchObject({ mode: "bltz", identityVersion: "bltz-default" });
    }
  });

  it("never invokes the directory adapter when the organization has no school link", async () => {
    const themeAdapter = adapter(exact());
    await expect(
      resolveEnterpriseSchoolTheme({ schoolId: null, adapter: themeAdapter }),
    ).resolves.toMatchObject({ mode: "bltz" });
    expect(themeAdapter.resolveExactIdentity).not.toHaveBeenCalled();
  });

  it("never invokes the directory adapter for an invalid school identifier", async () => {
    const themeAdapter = adapter(exact());
    await expect(
      resolveEnterpriseSchoolTheme({ schoolId: "not-an-id", adapter: themeAdapter }),
    ).resolves.toMatchObject({ mode: "bltz" });
    expect(themeAdapter.resolveExactIdentity).not.toHaveBeenCalled();
  });
});
