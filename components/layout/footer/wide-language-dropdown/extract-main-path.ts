/**
 * Strip a leading locale segment from `path` if its first segment matches
 * one of the supported `locales`. Otherwise return the path unchanged.
 *
 * `/ru/blog/foo` + `['ru','en']` → `/blog/foo`
 * `/blog/foo`    + `['ru','en']` → `/blog/foo`
 * `/ru`          + `['ru','en']` → `/`
 */
export const extractMainPath = (path: string, locales: string[]): string => {
  if (path && path.length >= 3 && path.startsWith('/')) {
    const nextSlashIndex = path.indexOf('/', 1);
    const firstSegment =
      nextSlashIndex === -1 ? path.substring(1) : path.substring(1, nextSlashIndex);

    if (locales.includes(firstSegment)) {
      return nextSlashIndex === -1 ? '/' : path.substring(nextSlashIndex);
    }
  }

  return path;
};
