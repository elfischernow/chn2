import { SITE_URL } from '@/lib/config';

import styles from './dropdowns.module.css';
import acctStyles from './AccountDropdown.module.css';

const DASHBOARD_SECTIONS = [
  { label: 'Balance', href: `${SITE_URL}/pro/balance` },
  { label: 'Exchange', href: `${SITE_URL}/pro/exchange` },
  { label: 'History', href: `${SITE_URL}/pro/history` },
  { label: 'Cashback', href: `${SITE_URL}/pro/cashback` },
  { label: 'Staking', href: `${SITE_URL}/pro/staking` },
  { label: 'Plans', href: `${SITE_URL}/pro/plans` },
  { label: 'Settings', href: `${SITE_URL}/pro/settings` },
] as const;

interface AccountDropdownProps {
  email: string | null;
}

export default function AccountDropdown({ email }: AccountDropdownProps) {
  return (
    <div className={`${styles.dropdown} ${styles.columnsDropdown}`} role="menu">
      <div className={acctStyles.wrap}>
        {email && <div className={acctStyles.email}>{email}</div>}
        <div className={acctStyles.links}>
          {DASHBOARD_SECTIONS.map((s) => (
            <a key={s.label} href={s.href} className={styles.dropLink}>
              {s.label}
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}
