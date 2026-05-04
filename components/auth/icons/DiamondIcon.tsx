// 1:1 port of legacy components/icons/diamond-icon.tsx — used in the
// section header for login + registration and in the welcome panel.

interface DiamondIconProps {
  className?: string;
}

export function DiamondIcon({ className }: DiamondIconProps) {
  return (
    <svg
      width="19"
      height="17"
      viewBox="0 0 19 17"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M5.67012 5.00488L9.45021 16.2022L0 5.00488H5.67012Z"
        fill="#4C71BA"
      />
      <path d="M14.8836 0.000976562H9.44971L13.2298 5.00404L14.8836 0.000976562Z" fill="#5FCEF0" />
      <path d="M9.44971 16.2037L18.8999 5.00635H13.2298L9.44971 16.2037Z" fill="#5FCEF0" />
      <path d="M13.2298 5.00488H5.66968L9.44976 16.2022L13.2298 5.00488Z" fill="#5290CC" />
      <path d="M4.01636 0.000976562L5.67014 5.00404L9.45023 0.000976562H4.01636Z" fill="#5290CC" />
      <path d="M18.8996 5.00306L14.8833 0L13.2295 5.00306H18.8996Z" fill="#59AFDE" />
      <path d="M9.44976 0.000976562L5.66968 5.00404H13.2298L9.44976 0.000976562Z" fill="#59AFDE" />
      <path d="M4.01634 0L0 5.00306H5.67012L4.01634 0Z" fill="#59AFDE" />
    </svg>
  );
}
