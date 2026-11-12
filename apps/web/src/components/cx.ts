/** Joins the class names that apply. */
export function cx(...names: readonly (string | false | null | undefined)[]): string {
  return names.filter(Boolean).join(' ');
}
