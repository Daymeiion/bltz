async (page) => {
  const session = await page.context().newCDPSession(page);
  await session.send("Emulation.clearDeviceMetricsOverride");
  await session.send("Emulation.setPageScaleFactor", { pageScaleFactor: 1 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.setViewportSize({ width: 375, height: 900 });
  await page.goto("http://localhost:3013/organization/preview/executive?evidence=assignment-drawer-tab-wrap");
  await page.locator("nextjs-portal").evaluateAll((nodes) => nodes.forEach((node) => { node.style.display = "none"; }));
  await page.locator("[data-evidence-drawer-trigger]").focus();
  const triggerOutline = await page.locator("[data-evidence-drawer-trigger]").evaluate((element) => ({ style: getComputedStyle(element).outlineStyle, width: getComputedStyle(element).outlineWidth, color: getComputedStyle(element).outlineColor }));
  await page.locator("[data-evidence-drawer-trigger]").click();
  await page.getByRole("dialog").waitFor();
  const reducedMotion = await page.getByRole("dialog").evaluate((element) => ({ transitionDuration: getComputedStyle(element).transitionDuration, animationDuration: getComputedStyle(element).animationDuration, transform: getComputedStyle(element).transform }));
  const drawerFocus = await page.evaluate(() => ({ inside: Boolean(document.activeElement?.closest('[role="dialog"]')), tag: document.activeElement?.tagName.toLowerCase() }));

  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.goto("http://localhost:3013/organization/preview/executive?evidence=workflow-lists-responsive");
  await page.locator("nextjs-portal").evaluateAll((nodes) => nodes.forEach((node) => { node.style.display = "none"; }));
  const responsive = await page.evaluate(() => {
    const targets = [...document.querySelectorAll("main button, main input, main select, main textarea")].filter((element) => {
      const style = getComputedStyle(element); return style.display !== "none" && style.visibility !== "hidden";
    }).map((element) => { const rect = element.getBoundingClientRect(); return { tag: element.tagName.toLowerCase(), label: element.getAttribute("aria-label") || element.textContent?.trim() || "form control", width: Math.round(rect.width), height: Math.round(rect.height) }; });
    return { viewport: document.documentElement.clientWidth, scrollWidth: document.documentElement.scrollWidth, targets, undersized: targets.filter((target) => target.width < 44 || target.height < 44) };
  });
  if (!drawerFocus.inside) throw new Error("Reduced-motion drawer did not move focus inside");
  if (Number.parseFloat(reducedMotion.transitionDuration) > 0.02 || Number.parseFloat(reducedMotion.animationDuration) > 0.02) throw new Error(`Reduced-motion drawer duration is not minimized: ${JSON.stringify(reducedMotion)}`);
  if (responsive.scrollWidth > responsive.viewport) throw new Error(`375px workflow overflow: ${responsive.scrollWidth}px in ${responsive.viewport}px`);
  if (responsive.undersized.length) throw new Error(`Undersized touch targets: ${JSON.stringify(responsive.undersized)}`);
  return { browser: await page.evaluate(() => navigator.userAgent), triggerOutline, reducedMotion, drawerFocus, responsive };
}
