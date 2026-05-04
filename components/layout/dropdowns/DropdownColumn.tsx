import Link from 'next/link';
import styles from './dropdowns.module.css';
import { Locale, DEFAULT_LOCALE } from '@/lib/config';

export interface RawNavigationItem {
  type: 'nav' | 'external';
  translationKey: string;
  path?: string;
  href?: string;
  description?: string;
}

interface DropdownColumnProps {
  title: string;
  items: RawNavigationItem[];
  locale: Locale;
  t: (key: string) => string;
}

const localePath = (locale: Locale, path: string) =>
  locale === DEFAULT_LOCALE ? path : `/${locale}${path}`;

export const DropdownColumn = (props: DropdownColumnProps) => {
  const {
    title,
    items,
    locale,
    t
  } = props;

  if (!items?.length) return null;

  return (
    <div className={styles.column}>
      <span className={styles.columnTitle}>{title}</span>
      {items.map((item) => {
        const isExternal = item.type === 'external';
        const href = isExternal ? item.href! : localePath(locale, item.path!);

        return (
          <Link
            key={item.translationKey}
            href={href}
            className={styles.dropLink}
            role="menuitem"
            {...(isExternal ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
          >
            <span className={styles.linkLabel}>{t(item.translationKey)}</span>
            {item.description && (
              <span className={styles.linkDescription}>{item.description}</span>
            )}
          </Link>
        );
      })}
    </div>
  );
};