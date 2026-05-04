/**
 * Path prefixes whose `/page/N` suffix the dropdown strips when switching
 * locales — pagination state doesn't carry across languages, only the
 * base content URL does. The blog and the asset-recovering archive both
 * paginate; everything else goes through unchanged.
 */
export const LANGUAGE_DROPDOWN_BLOG_PAGINATION_PAGES = ['/blog', '/asset-recovering'];
