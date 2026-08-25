async (page) => {
  const output = "C:/Users/Administrator/bltz-worktrees/crm-ui-system-executive-gate3c-evidence/output/enterprise-crm/ui-system-wave2/gate-3c-evidence/";
  const focusLog = [];
  const describeFocus = () => page.evaluate(() => {
    const element = document.activeElement;
    if (!(element instanceof HTMLElement)) return "none";
    return `${element.tagName.toLowerCase()}|${element.getAttribute("aria-label") || element.textContent?.trim() || element.getAttribute("name") || "unnamed"}`;
  });
  const open = async (scene, width, height) => {
    await page.setViewportSize({ width, height });
    await page.goto(`http://localhost:3013/organization/preview/executive?evidence=${scene}`);
    await page.evaluate(() => localStorage.setItem("bltz-enterprise-theme", "bltz"));
    await page.reload();
    await page.locator("nextjs-portal").evaluateAll((nodes) => nodes.forEach((node) => { node.style.display = "none"; }));
    const trigger = page.locator("[data-evidence-drawer-trigger]");
    await trigger.focus();
    const before = await describeFocus();
    await trigger.click();
    await page.getByRole("dialog").waitFor();
    await page.waitForTimeout(550);
    const after = await describeFocus();
    focusLog.push({ scene, step: "open", before, after });
  };
  const screenshot = (filename) => page.screenshot({ path: `${output}${filename}`, fullPage: false });

  await open("assignment-drawer-tab-wrap", 1440, 1000);
  const tabOrder = [];
  const focusableCount = await page.getByRole("dialog").locator("button:not([disabled]), select:not([disabled]), input:not([disabled]), textarea:not([disabled])").count();
  for (let index = 0; index <= focusableCount; index += 1) {
    tabOrder.push(await describeFocus());
    await page.keyboard.press("Tab");
  }
  tabOrder.push(await describeFocus());
  focusLog.push({ scene: "assignment-drawer-tab-wrap", step: "tab cycle", focusableCount, tabOrder, stayedInside: await page.evaluate(() => Boolean(document.activeElement?.closest('[role="dialog"]'))) });
  await screenshot("assignment-drawer-tab-wrap-1440-bltz.png");

  await open("assignment-drawer-shift-tab-wrap", 375, 900);
  const shiftOrder = [await describeFocus()];
  await page.keyboard.press("Shift+Tab"); shiftOrder.push(await describeFocus());
  await page.keyboard.press("Shift+Tab"); shiftOrder.push(await describeFocus());
  focusLog.push({ scene: "assignment-drawer-shift-tab-wrap", step: "shift tab cycle", shiftOrder, stayedInside: await page.evaluate(() => Boolean(document.activeElement?.closest('[role="dialog"]'))) });
  await screenshot("assignment-drawer-shift-tab-wrap-375-bltz.png");

  await open("assignment-drawer-unsaved-focus", 375, 900);
  await page.getByRole("combobox", { name: "Assign owner" }).selectOption("morgan");
  await page.keyboard.press("Escape");
  await page.getByRole("alertdialog", { name: "Unsaved assignment changes" }).waitFor();
  focusLog.push({ scene: "assignment-drawer-unsaved-focus", step: "escape dirty", focused: await describeFocus(), draft: await page.getByRole("combobox", { name: "Assign owner" }).inputValue() });
  await screenshot("assignment-drawer-unsaved-focus-375-bltz.png");
  await page.getByRole("button", { name: "Keep editing" }).click();
  await page.waitForTimeout(100);
  const keepEditingFocus = await describeFocus();
  const retainedDraft = await page.getByRole("combobox", { name: "Assign owner" }).inputValue();
  await page.getByRole("button", { name: "Close" }).click();
  await page.getByRole("button", { name: "Discard changes" }).click();
  await page.getByRole("dialog").waitFor({ state: "hidden" });
  const discardReturn = await describeFocus();
  focusLog.push({ scene: "assignment-drawer-unsaved-focus", step: "keep/discard", keepEditingFocus, retainedDraft, discardReturn });

  const stateShots = [
    ["assignment-drawer-submitting", 1440, 1000, "assignment-drawer-submitting-1440-bltz.png"],
    ["assignment-drawer-error", 1440, 1000, "assignment-drawer-error-1440-bltz.png"],
    ["assignment-drawer-success", 1440, 1000, "assignment-drawer-success-1440-bltz.png"],
    ["assignment-drawer-restricted", 375, 900, "assignment-drawer-restricted-375-bltz.png"],
  ];
  for (const [scene, width, height, filename] of stateShots) {
    await open(scene, width, height);
    if (scene === "assignment-drawer-submitting") {
      const mutationDisabled = await page.getByRole("dialog").locator("select, input, textarea, button[type=submit]").evaluateAll((controls) => controls.every((control) => control.disabled));
      focusLog.push({ scene, step: "submitting controls", mutationDisabled, focused: await describeFocus() });
    }
    await screenshot(filename);
    if (scene === "assignment-drawer-success" || scene === "assignment-drawer-restricted") {
      await page.getByRole("button", { name: "Close" }).click();
      await page.getByRole("dialog").waitFor({ state: "hidden" });
      focusLog.push({ scene, step: "close return", focused: await describeFocus() });
    }
  }
  return focusLog;
}
