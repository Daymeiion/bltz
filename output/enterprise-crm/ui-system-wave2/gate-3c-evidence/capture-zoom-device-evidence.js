async (page) => {
  const session = await page.context().newCDPSession(page);
  await session.send("Emulation.clearDeviceMetricsOverride");
  await page.setViewportSize({ width: 1280, height: 1000 });
  await page.goto("http://localhost:3013/organization/preview/executive?evidence=component-board-zoom");
  await session.send("Emulation.setPageScaleFactor", { pageScaleFactor: 2 });
  await page.locator("nextjs-portal").evaluateAll((nodes) => nodes.forEach((node) => { node.style.display = "none"; }));
  const dimensions = await page.evaluate(() => ({ viewport: document.documentElement.clientWidth, scrollWidth: document.documentElement.scrollWidth, visualScale: window.visualViewport?.scale }));
  await page.screenshot({ path: "C:/Users/Administrator/bltz-worktrees/crm-ui-system-executive-gate3c-evidence/output/enterprise-crm/ui-system-wave2/gate-3c-evidence/component-board-zoom-200-percent-1280-bltz.png", fullPage: false, scale: "css" });
  await session.send("Emulation.setPageScaleFactor", { pageScaleFactor: 1 });
  return dimensions;
}
