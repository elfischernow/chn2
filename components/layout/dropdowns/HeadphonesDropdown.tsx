import styles from './dropdowns.module.css';
import { Locale } from '@/lib/config';
import { createT } from '@/lib/i18n/createT';
import { HEADER_NAVIGATION_LINKS } from '@/app/utils/constants/header';
import { TranslationDict } from '@/lib/i18n';
import { DropdownColumn } from './DropdownColumn';

interface HeadphonesDropdownProps {
  locale: Locale;
  dict: TranslationDict;
}

const HeadphonesDropdown = ({ locale, dict }: HeadphonesDropdownProps) => {
  const t = createT(dict);

  return (
    <div className={`${styles.dropdown} ${styles.columnsDropdown}`} role="menu">
      <div className={styles.columns}>
        <DropdownColumn
          title="About us"
          items={HEADER_NAVIGATION_LINKS.aboutUs}
          locale={locale}
          t={t}
        />
        <DropdownColumn
          title="Service & Support"
          items={HEADER_NAVIGATION_LINKS.support}
          locale={locale}
          t={t}
        />
      </div>
    </div>
  );
};

export default HeadphonesDropdown;