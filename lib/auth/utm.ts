// Read UTM cookies on the client. Mirrors legacy
// legacy-projects/changenow-frontend/src/react-ssr/utils/get-utms.js exactly,
// keeping camelCase keys (utmSource, utmMedium, …) and including `gclid`.
// `js-cookie` is already a project dependency (see package.json).

import Cookies from 'js-cookie';

export interface UtmData {
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  utmContent?: string;
  utmTerm?: string;
  gclid?: string;
}

const COOKIE_TO_KEY: ReadonlyArray<readonly [string, keyof UtmData]> = [
  ['utm_source', 'utmSource'],
  ['utm_medium', 'utmMedium'],
  ['utm_campaign', 'utmCampaign'],
  ['utm_content', 'utmContent'],
  ['utm_term', 'utmTerm'],
  ['gclid', 'gclid'],
];

export function getUtms(): UtmData {
  const utm: UtmData = {};
  for (const [cookieName, key] of COOKIE_TO_KEY) {
    const value = Cookies.get(cookieName);
    if (value) utm[key] = value;
  }
  return utm;
}
