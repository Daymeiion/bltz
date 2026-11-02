async (page) => {
  const output = "C:/Users/Administrator/bltz-worktrees/crm-ui-system-executive-gate3c-evidence/output/enterprise-crm/ui-system-wave2/gate-3c-evidence/";
  const shots = [
    ["navigation-filters-search-default-1440-bltz.png", "navigation-filters-search-default", 1440, 900, "bltz", ""],
    ["navigation-filters-search-long-labels-375-bltz.png", "navigation-filters-search-long-labels", 375, 900, "bltz", ""],
    ["data-table-default-focus-1440-bltz.png", "data-table-default-focus", 1440, 900, "bltz", "sort"],
    ["data-table-loading-768-bltz.png", "data-table-loading", 768, 900, "bltz", ""],
    ["data-table-empty-375-bltz.png", "data-table-empty", 375, 900, "bltz", ""],
    ["data-table-filtered-empty-375-bltz.png", "data-table-filtered-empty", 375, 900, "bltz", ""],
    ["data-table-error-768-bltz.png", "data-table-error", 768, 900, "bltz", ""],
    ["data-table-restricted-1440-bltz.png", "data-table-restricted", 1440, 900, "bltz", ""],
    ["data-table-responsive-actions-375-bltz.png", "data-table-responsive-actions", 375, 900, "bltz", "action"],
    ["workflow-lists-actions-focus-1440-bltz.png", "workflow-lists-actions-focus", 1440, 1000, "bltz", "workflow"],
    ["workflow-lists-responsive-375-bltz.png", "workflow-lists-responsive", 375, 1000, "bltz", ""],
    ["domain-primitives-default-1440-bltz.png", "domain-primitives-default", 1440, 1000, "bltz", ""],
    ["domain-primitives-responsive-375-bltz.png", "domain-primitives-responsive", 375, 1000, "bltz", ""],
    ["intelligence-meanings-provenance-1440-bltz.png", "intelligence-meanings-provenance", 1440, 1200, "bltz", ""],
    ["intelligence-restricted-non-inference-375-bltz.png", "intelligence-restricted-non-inference", 375, 900, "bltz", ""],
    ["component-board-school-theme-1440.png", "component-board-school-theme", 1440, 1000, "school", ""],
    ["component-board-reflow-320-bltz.png", "component-board-reflow", 320, 1000, "bltz", ""],
  ];

  for (const [filename, scene, width, height, theme, focus] of shots) {
    await page.setViewportSize({ width, height });
    await page.goto(`http://localhost:3013/organization/preview/executive?evidence=${scene}`);
    await page.evaluate((mode) => localStorage.setItem("bltz-enterprise-theme", mode), theme);
    await page.reload();
    await page.waitForTimeout(250);
    await page.locator("nextjs-portal").evaluateAll((nodes) => nodes.forEach((node) => { node.style.display = "none"; }));
    if (focus === "sort") await page.locator("th button").first().focus();
    if (focus === "action") await page.getByRole("button", { name: "View Morgan Lee" }).focus();
    if (focus === "workflow") await page.getByRole("button", { name: "Open task" }).focus();
    await page.screenshot({ path: `${output}${filename}`, fullPage: true, scale: "css" });
  }
  return shots.length;
}
