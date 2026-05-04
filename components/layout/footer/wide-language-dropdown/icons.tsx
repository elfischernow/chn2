import type { IconProps } from '../types';

export const LanguageDropdownIcon = () => {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M7 14L10.5 6.5L14 14M8 12H13M2 3.74758C3.31038 3.58417 4.64536 3.5 6 3.5M6 3.5C6.74721 3.5 7.48843 3.52561 8.22285 3.576M6 3.5V2M8.22285 3.576C7.45088 7.1052 5.12579 10.0534 2 11.6682M8.22285 3.576C8.81988 3.61696 9.41241 3.6743 10 3.74758M6.94085 9.41077C5.85703 8.30795 4.9847 6.9966 4.38955 5.54244"
        stroke="white"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
};

export const LanguageDropdownArrowIcon = (props: IconProps) => {
  const { className } = props;
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      className={className}
    >
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M4.21967 6.21967C4.51256 5.92678 4.98744 5.92678 5.28033 6.21967L8 8.93934L10.7197 6.21967C11.0126 5.92678 11.4874 5.92678 11.7803 6.21967C12.0732 6.51256 12.0732 6.98744 11.7803 7.28033L8.53033 10.5303C8.23744 10.8232 7.76256 10.8232 7.46967 10.5303L4.21967 7.28033C3.92678 6.98744 3.92678 6.51256 4.21967 6.21967Z"
        fill="#DCE2EA"
      />
    </svg>
  );
};

export const NowCheckmarkIcon = (props: IconProps) => {
  const { color } = props;
  return (
    <svg
      className="pro-footer__checkmark-icon"
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M12.8027 3.46971C13.0956 3.17698 13.5704 3.17687 13.8632 3.46971C14.1559 3.76256 14.1559 4.23741 13.8632 4.53026L6.52924 11.8633C6.23635 12.1562 5.76159 12.1562 5.46869 11.8633L2.13569 8.53026C1.84279 8.23736 1.84279 7.7626 2.13569 7.46971C2.42858 7.17682 2.90334 7.17682 3.19623 7.46971L5.99897 10.2724L12.8027 3.46971Z"
        fill={color || '#2B2B37'}
      />
    </svg>
  );
};
