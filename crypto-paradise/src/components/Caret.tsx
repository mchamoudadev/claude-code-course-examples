/* A down-pointing chevron caret, drawn inline so orientation/color is exact. */
export default function Caret({ size = 20 }: { size?: number }) {
  return (
    <svg
      className="caret"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M7 10l5 5 5-5"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
