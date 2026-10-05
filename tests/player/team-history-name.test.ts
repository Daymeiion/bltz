import { describe, expect, it } from "vitest";
import { proHistoryName, schoolHistoryName } from "@/lib/player/team-history-name";

describe("Team History full names", () => {
  it("omits current and historical Syracuse nicknames", () => {
    expect(schoolHistoryName("Syracuse Orangemen")).toBe("Syracuse");
    expect(schoolHistoryName("Syracuse Orange")).toBe("Syracuse");
  });
  it("removes the directory mascot without shortening the school", () => {
    expect(schoolHistoryName("Oregon Ducks", "Ducks")).toBe("Oregon");
    expect(schoolHistoryName("Texas Tech Red Raiders", "Red Raiders")).toBe("Texas Tech");
    expect(schoolHistoryName("Miami (OH)")).toBe("Miami (OH)");
  });
  it("expands pro locations while retaining historical location distinctions", () => {
    expect(proHistoryName("LA")).toBe("Los Angeles");
    expect(proHistoryName("NYG")).toBe("New York");
    expect(proHistoryName("SD")).toBe("San Diego");
    expect(proHistoryName("STL")).toBe("St. Louis");
  });
});
