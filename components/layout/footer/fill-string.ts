/**
 * Replace `{KEY}` placeholders in `template` with values from `params`.
 * Used for the copyright string ("© {YEAR} ChangeNOW").
 */
export const fillString = (
  template: string,
  params: Record<string, string | number | undefined>,
): string => {
  if (typeof template !== 'string') return '';
  let result = template;
  for (const [key, value] of Object.entries(params)) {
    result = result.replace(new RegExp(`\\{${key}\\}`, 'gm'), String(value ?? ''));
  }
  return result;
};
