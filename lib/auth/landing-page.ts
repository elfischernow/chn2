// Read the `landing_page` cookie. Mirrors
// legacy-projects/changenow-frontend/src/react-ssr/utils/get-landing-page.js
// (single-line: `Cookies.get('landing_page')`).
//
// Who sets the cookie is out of scope for the auth flow — see open question
// (5) in docs/auth-migration-plan.md §14.

import Cookies from 'js-cookie';

export function getLandingPage(): string | undefined {
  return Cookies.get('landing_page');
}
