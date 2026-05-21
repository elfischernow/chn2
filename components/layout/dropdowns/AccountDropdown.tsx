'use client';

import { CN_SITE_URL } from '@/lib/config';
import { SUPPORT } from '@/lib/links';

import styles from './dropdowns.module.css';
import acctStyles from './AccountDropdown.module.css';

interface Section {
  label: string;
  href: string;
  /** External links open in a new tab, internal ones don't. */
  external?: boolean;
}

// Three-group layout mirrors legacy header: trade/account first, then
// services (cashback / staking / loans / AML), then help links. Log out
// sits as its own action at the bottom.
const TRADE: readonly Section[] = [
  { label: 'Balance',  href: `${CN_SITE_URL}/pro/balance` },
  { label: 'Exchange', href: `${CN_SITE_URL}/pro/exchange` },
  { label: 'History',  href: `${CN_SITE_URL}/pro/history` },
];
const SERVICES: readonly Section[] = [
  { label: 'Cashback',  href: `${CN_SITE_URL}/pro/cashback` },
  { label: 'Staking',   href: `${CN_SITE_URL}/pro/staking` },
  { label: 'Loans',     href: `${CN_SITE_URL}/pro/loans` },
  { label: 'AML Check', href: `${CN_SITE_URL}/pro/aml-check` },
];
const ACCOUNT: readonly Section[] = [
  { label: 'Plans',    href: `${CN_SITE_URL}/pro/plans` },
  { label: 'Settings', href: `${CN_SITE_URL}/pro/settings` },
];
const HELP: readonly Section[] = [
  { label: 'Help center', href: SUPPORT.helpCenter, external: true },
  { label: 'Contact support', href: SUPPORT.contact, external: true },
];

interface AccountDropdownProps {
  email: string | null;
  onSignOut: () => Promise<void> | void;
  localePrefix: string;
}

function Group({ items }: { items: readonly Section[] }) {
  return (
    <div className={acctStyles.group}>
      {items.map((s) => (
        <a
          key={s.label}
          href={s.href}
          className={styles.dropLink}
          {...(s.external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
        >
          {s.label}
          {s.external && <span className={acctStyles.extMark} aria-hidden>↗</span>}
        </a>
      ))}
    </div>
  );
}

export default function AccountDropdown({ email, onSignOut, localePrefix }: AccountDropdownProps) {
  return (
    <div className={`${styles.dropdown} ${styles.columnsDropdown}`} role="menu">
      <div className={acctStyles.wrap}>
        {email && <div className={acctStyles.email}>{email}</div>}
        <Group items={TRADE} />
        <div className={acctStyles.divider} />
        <Group items={SERVICES} />
        <div className={acctStyles.divider} />
        <Group items={ACCOUNT} />
        <div className={acctStyles.divider} />
        <Group items={HELP} />
        <div className={acctStyles.divider} />
        <button
          type="button"
          className={`${styles.dropLink} ${acctStyles.signOut}`}
          onClick={() => {
            // Defer the redirect by a tick so the in-flight `auth/logout`
            // gets a chance to start before we navigate away — same UX as
            // the legacy Pro app's profile menu.
            void Promise.resolve(onSignOut()).finally(() => {
              window.location.assign(localePrefix || '/');
            });
          }}
        >
          Log out
        </button>
      </div>
    </div>
  );
}
