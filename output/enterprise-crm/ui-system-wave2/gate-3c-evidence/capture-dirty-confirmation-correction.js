async (page) => {
  const output = "C:/Users/Administrator/bltz-worktrees/crm-ui-system-executive-gate3c-correction/output/enterprise-crm/ui-system-wave2/gate-3c-evidence/";
  const results = [];
  const describeFocus = () => page.evaluate(() => {
    const element = document.activeElement;
    if (!(element instanceof HTMLElement)) return "none";
    return `${element.tagName.toLowerCase()}|${element.getAttribute("aria-label") || element.textContent?.trim() || element.getAttribute("name") || "unnamed"}`;
  });
  const openDirtyConfirmation = async (width, height) => {
    await page.setViewportSize({ width, height });
    await page.goto("http://localhost:3013/organization/preview/executive?evidence=assignment-drawer-unsaved-focus");
    await page.evaluate(() => localStorage.setItem("bltz-enterprise-theme", "bltz"));
    await page.reload();
    await page.locator("nextjs-portal").evaluateAll((nodes) => nodes.forEach((node) => { node.style.display = "none"; }));
    const trigger = page.locator("[data-evidence-drawer-trigger]");
    await trigger.focus();
    await trigger.click();
    await page.getByRole("dialog", { name: "Assign owner" }).waitFor();
    await page.getByRole("combobox", { name: "Assign owner" }).selectOption("morgan");
    await page.keyboard.press("Escape");
    const confirmation = page.getByRole("alertdialog", { name: "Discard unsaved changes?" });
    await confirmation.waitFor();
    await page.waitForTimeout(150);
    return { trigger, confirmation };
  };

  {
    const { trigger, confirmation } = await openDirtyConfirmation(375, 900);
    const initialFocus = await describeFocus();
    const ariaModal = await confirmation.getAttribute("aria-modal");
    const labelledBy = await confirmation.getAttribute("aria-labelledby");
    const describedBy = await confirmation.getAttribute("aria-describedby");
    const focusInside = await confirmation.evaluate((node) => node.contains(document.activeElement));
    if (!focusInside || ariaModal !== "true" || !labelledBy || !describedBy) throw new Error(`Dirty confirmation did not receive announced modal focus: ${JSON.stringify({ initialFocus, focusInside, ariaModal, labelledBy, describedBy })}`);
    await page.screenshot({ path: `${output}assignment-drawer-dirty-confirmation-focus-375-bltz.png`, fullPage: false });
    const order = [initialFocus];
    await page.keyboard.press("Shift+Tab"); order.push(await describeFocus());
    await page.keyboard.press("Tab"); order.push(await describeFocus());
    await page.keyboard.press("Tab"); order.push(await describeFocus());
    const trapped = await confirmation.evaluate((node) => node.contains(document.activeElement));
    if (!trapped) throw new Error(`Dirty confirmation focus escaped: ${JSON.stringify(order)}`);
    await page.getByRole("button", { name: "Keep editing" }).click();
    const draft = await page.getByRole("combobox", { name: "Assign owner" }).inputValue();
    const keepFocus = await describeFocus();
    if (draft !== "morgan" || !keepFocus.includes("Assign owner")) throw new Error(`Keep Editing failed: ${JSON.stringify({ draft, keepFocus })}`);
    await page.keyboard.press("Escape");
    await page.getByRole("button", { name: "Discard changes" }).click();
    await page.getByRole("dialog", { name: "Assign owner" }).waitFor({ state: "hidden" });
    const returnFocus = await describeFocus();
    const exactReturn = await trigger.evaluate((node) => node === document.activeElement);
    if (!exactReturn) throw new Error(`Discard did not return to exact opener: ${returnFocus}`);
    results.push({ viewport: "375x900", initialFocus, ariaModal, labelledBy, describedBy, order, trapped, draft, keepFocus, returnFocus, exactReturn });
  }

  {
    const { confirmation } = await openDirtyConfirmation(1440, 1000);
    const accessibleName = await confirmation.getAttribute("aria-labelledby");
    const accessibleDescription = await confirmation.getAttribute("aria-describedby");
    const initialFocus = await describeFocus();
    await page.screenshot({ path: `${output}assignment-drawer-dirty-confirmation-announcement-1440-bltz.png`, fullPage: false });
    await page.keyboard.press("Escape");
    await confirmation.waitFor({ state: "hidden" });
    const draft = await page.getByRole("combobox", { name: "Assign owner" }).inputValue();
    const escapeFocus = await describeFocus();
    if (!accessibleName || !accessibleDescription || draft !== "morgan" || !escapeFocus.includes("Assign owner")) throw new Error(`Escape/announcement evidence failed: ${JSON.stringify({ accessibleName, accessibleDescription, initialFocus, draft, escapeFocus })}`);
    results.push({ viewport: "1440x1000", accessibleName, accessibleDescription, initialFocus, draft, escapeFocus });
  }

  return results;
}
