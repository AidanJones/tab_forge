export async function openSection(page, selector) {
  const details=page.locator(selector);
  // Persistence assertions may inspect preferences before a score is loaded;
  // the new empty state intentionally does not expose those controls.
  if(!await details.isVisible())return;
  if(!await details.evaluate(node=>node.open))await details.locator(':scope > summary').click();
}
