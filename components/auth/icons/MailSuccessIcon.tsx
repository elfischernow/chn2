// Used by REGISTER_SUCCESS / FORGOT_PASSWORD_SUCCESS / LINK_EXPIRED screens.
// Geometry derived from legacy `mail-success-icon.jsx` / `error-icon.jsx`
// silhouette — same colour, same overall mass.

interface IconProps {
  className?: string;
}

export function MailSuccessIcon({ className }: IconProps) {
  return (
    <svg
      width="60"
      height="60"
      viewBox="0 0 60 60"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      fill="none"
      aria-hidden
    >
      <circle cx="30" cy="30" r="30" fill="#E6F9F1" />
      <path
        d="M14 22a3 3 0 0 1 3-3h26a3 3 0 0 1 3 3v16a3 3 0 0 1-3 3H17a3 3 0 0 1-3-3V22Z"
        stroke="#00C26F"
        strokeWidth="2"
      />
      <path
        d="m14 22 16 11 16-11"
        stroke="#00C26F"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function ErrorIcon({ className }: IconProps) {
  return (
    <svg
      width="60"
      height="60"
      viewBox="0 0 60 60"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      fill="none"
      aria-hidden
    >
      <circle cx="30" cy="30" r="30" fill="#FDEFC1" />
      <path
        d="M30 16v18"
        stroke="#F39321"
        strokeWidth="3"
        strokeLinecap="round"
      />
      <circle cx="30" cy="42" r="2.5" fill="#F39321" />
    </svg>
  );
}

export function SuccessIcon({ className }: IconProps) {
  return (
    <svg
      width="60"
      height="60"
      viewBox="0 0 60 60"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      fill="none"
      aria-hidden
    >
      <circle cx="30" cy="30" r="30" fill="#E6F9F1" />
      <path
        d="m20 30 7 7 13-14"
        stroke="#00C26F"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function ConfirmedIcon({ className }: IconProps) {
  return (
    <svg
      width="60"
      height="60"
      viewBox="0 0 60 60"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      fill="none"
      aria-hidden
    >
      <circle cx="30" cy="30" r="30" fill="#E6F9F1" />
      <rect x="20" y="20" width="20" height="20" rx="3" stroke="#00C26F" strokeWidth="2" />
      <path
        d="m24 30 4 4 8-9"
        stroke="#00C26F"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
