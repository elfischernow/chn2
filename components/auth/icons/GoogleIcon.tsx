// Standard Google "G" mark — same SVG used by legacy
// components/icons/google-icon.jsx.

interface GoogleIconProps {
  className?: string;
}

export function GoogleIcon({ className }: GoogleIconProps) {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden
    >
      <path
        d="M21.6 12.227c0-.71-.064-1.394-.182-2.05H12v3.872h5.382a4.6 4.6 0 0 1-1.996 3.018v2.51h3.236c1.892-1.745 2.978-4.314 2.978-7.35Z"
        fill="#4285F4"
      />
      <path
        d="M12 22c2.7 0 4.964-.895 6.622-2.423l-3.236-2.51c-.896.6-2.04.96-3.386.96-2.605 0-4.81-1.76-5.6-4.123H3.054v2.59A10 10 0 0 0 12 22Z"
        fill="#34A853"
      />
      <path
        d="M6.4 13.904a6 6 0 0 1 0-3.808V7.505H3.054a10 10 0 0 0 0 8.99L6.4 13.904Z"
        fill="#FBBC05"
      />
      <path
        d="M12 5.977c1.467 0 2.785.504 3.823 1.495l2.868-2.868C16.96 2.99 14.696 2 12 2A10 10 0 0 0 3.054 7.505L6.4 10.095C7.19 7.732 9.395 5.977 12 5.977Z"
        fill="#EA4335"
      />
    </svg>
  );
}
