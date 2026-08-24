async (page) => {
  const inspect = async (scene, width, zoom) => {
    await page.setViewportSize({ width, height: 1000 });
    await page.goto(`http://localhost:3013/organization/preview/executive?evidence=${scene}`);
    await page.locator("nextjs-portal").evaluateAll((nodes) => nodes.forEach((node) => { node.style.display = "none"; }));
    if (zoom) await page.evaluate(() => { document.documentElement.style.zoom = "2"; });
    return page.evaluate(() => {
      const viewport = document.documentElement.clientWidth;
      const offenders = [...document.querySelectorAll("body *")].map((element) => {
        const rect = element.getBoundingClientRect();
        return { tag: element.tagName.toLowerCase(), className: element.getAttribute("class"), left: Math.round(rect.left), right: Math.round(rect.right), width: Math.round(rect.width), scrollWidth: element.scrollWidth, clientWidth: element.clientWidth };
      }).filter((item) => item.right > viewport + 1 || item.left < -1 || item.scrollWidth > item.clientWidth + 1).sort((a, b) => (b.right - viewport) - (a.right - viewport)).slice(0, 20);
      return { viewport, documentScrollWidth: document.documentElement.scrollWidth, bodyScrollWidth: document.body.scrollWidth, offenders };
    });
  };
  const result = { reflow320: await inspect("component-board-reflow", 320, false), zoom200: await inspect("component-board-zoom", 1280, true) };
  if (result.reflow320.documentScrollWidth > result.reflow320.viewport) throw new Error(`320px reflow overflow: ${result.reflow320.documentScrollWidth}px document in ${result.reflow320.viewport}px viewport`);
  return result;
}
