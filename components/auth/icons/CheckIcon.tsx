// 1:1 port of legacy components/icons/check-icon.jsx — fits inside a 16×16
// checkbox box (legacy NewCheckbox).

interface CheckIconProps {
  className?: string;
  color?: string;
}

export function CheckIcon({ className, color = '#ffffff' }: CheckIconProps) {
  return (
    <svg
      width="11"
      height="8"
      viewBox="0 0 11 8"
      fill={color}
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <path d="M10.1549 0.244327C10.5723 0.606035 10.6174 1.23759 10.2557 1.65495L5.05569 7.65495C4.87756 7.86049 4.62338 7.9846 4.35176 7.99868C4.08013 8.01275 3.81449 7.91558 3.61606 7.72955L0.816062 5.10455C0.41315 4.72682 0.392736 4.09399 0.770466 3.69107C1.1482 3.28816 1.78103 3.26775 2.18394 3.64548L4.22534 5.55929L8.74431 0.345085C9.10602 -0.0722705 9.73758 -0.117382 10.1549 0.244327Z" />
    </svg>
  );
}
