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
    const announcement = await confirmation.evaluate((node) => ({ name: document.getElementById(node.getAttribute("aria-labelledby") || "")?.textContent, description: document.getElementById(node.getAttribute("aria-describedby") || "")?.textContent }));
    const focusInside = await confirmation.evaluate((node) => node.contains(document.activeElement));
    if (!focusInside || ariaModal !== "true" || announcement.name !== "Discard unsaved changes?" || announcement.description !== "Your assignment details have not been submitted.") throw new Error(`Dirty confirmation did not receive announced modal focus: ${JSON.stringify({ initialFocus, focusInside, ariaModal, labelledBy, describedBy, announcement })}`);
    await page.screenshot({ path: `${output}assignment-drawer-dirty-confirmation-focus-375-bltz.png`, fullPage: false });
    const order = [initialFocus];
    await page.keyboard.press("Shift+Tab"); order.push(await describeFocus());
    await page.keyboard.press("Tab"); order.push(await describeFocus());
    await page.keyboard.press("Tab"); order.push(await describeFocus());
    const trapped = await confirmation.evaluate((node) => node.contains(document.activeElement));
    if (!trapped) throw new Error(`Dirty confirmation focus escaped: ${JSON.stringify(order)}`);
    await page.getByRole("button", { name: "Keep editing" }).click();
    const owner = page.getByRole("combobox", { name: "Assign owner" });
    const draft = await owner.inputValue();
    const keepFocus = await describeFocus();
    const keepFocusIsOwner = await owner.evaluate((node) => node === document.activeElement);
    if (draft !== "morgan" || !keepFocusIsOwner) throw new Error(`Keep Editing failed: ${JSON.stringify({ draft, keepFocus, keepFocusIsOwner })}`);
    await page.keyboard.press("Escape");
    await page.getByRole("button", { name: "Discard changes" }).click();
    await page.getByRole("dialog", { name: "Assign owner" }).waitFor({ state: "hidden" });
    await page.waitForTimeout(550);
    const returnFocus = await describeFocus();
    const exactReturn = await trigger.evaluate((node) => node === document.activeElement);
    if (!exactReturn) throw new Error(`Discard did not return to exact opener: ${returnFocus}`);
    results.push({ viewport: "375x900", initialFocus, ariaModal, labelledBy, describedBy, announcement, order, trapped, draft, keepFocus, keepFocusIsOwner, returnFocus, exactReturn });
  }

  {
    const { confirmation } = await openDirtyConfirmation(1440, 1000);
    const accessibleName = await confirmation.getAttribute("aria-labelledby");
    const accessibleDescription = await confirmation.getAttribute("aria-describedby");
    const announcement = await confirmation.evaluate((node) => ({ name: document.getElementById(node.getAttribute("aria-labelledby") || "")?.textContent, description: document.getElementById(node.getAttribute("aria-describedby") || "")?.textContent }));
    const initialFocus = await describeFocus();
    await page.screenshot({ path: `${output}assignment-drawer-dirty-confirmation-announcement-1440-bltz.png`, fullPage: false });
    await page.keyboard.press("Escape");
    await confirmation.waitFor({ state: "hidden" });
    const owner = page.getByRole("combobox", { name: "Assign owner" });
    const draft = await owner.inputValue();
    const escapeFocus = await describeFocus();
    const escapeFocusIsOwner = await owner.evaluate((node) => node === document.activeElement);
    if (!accessibleName || !accessibleDescription || announcement.name !== "Discard unsaved changes?" || announcement.description !== "Your assignment details have not been submitted." || draft !== "morgan" || !escapeFocusIsOwner) throw new Error(`Escape/announcement evidence failed: ${JSON.stringify({ accessibleName, accessibleDescription, announcement, initialFocus, draft, escapeFocus, escapeFocusIsOwner })}`);
    results.push({ viewport: "1440x1000", accessibleName, accessibleDescription, announcement, initialFocus, draft, escapeFocus, escapeFocusIsOwner });
  }

  return results;
}
