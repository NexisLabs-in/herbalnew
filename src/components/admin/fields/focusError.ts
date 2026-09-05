/** Takes the admin to the first thing that is wrong.
 *
 *  The product form is long enough that a message at the top of it is invisible
 *  from the bottom, where the save button is. Reporting "some fields need
 *  attention" and leaving somebody to hunt for which is not reporting an error,
 *  it is announcing one.
 *
 *  Fields mark themselves with `data-field="<path>"` matching the paths the Zod
 *  schema reports, so the first error can be found without the form keeping a
 *  register of refs.
 */
export function focusFirstError(fieldErrors: Record<string, string> | undefined): void {
  if (!fieldErrors) return;

  const paths = Object.keys(fieldErrors);
  if (paths.length === 0) return;

  // The DOM decides which is "first": whichever errored field appears earliest
  // on the page is the one to go to, regardless of key order in the object.
  const targets = paths
    .map((path) => document.querySelector<HTMLElement>(`[data-field="${CSS.escape(path)}"]`))
    .filter((element): element is HTMLElement => element !== null)
    .sort((a, b) =>
      a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1,
    );

  const target = targets[0];
  if (!target) return;

  target.scrollIntoView({ behavior: "smooth", block: "center" });

  // Focus the control itself, not the wrapper, so typing corrects it straight
  // away. Deferred past the scroll so the browser does not fight itself.
  window.setTimeout(() => {
    const control = target.querySelector<HTMLElement>("input, select, textarea");
    control?.focus({ preventScroll: true });
  }, 350);
}
