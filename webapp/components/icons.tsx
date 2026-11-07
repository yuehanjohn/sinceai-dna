/** The flame badge: the harasser marker and every fire-back control. */
import type { SVGProps } from "react";

export type IconProps = SVGProps<SVGSVGElement>;

export function FlameIcon(props: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.7}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      <path d="M12 3c.5 2.5 2 3.6 3.3 5.2a6.7 6.7 0 0 1 1.7 4.6c0 3.3-2.2 6.1-5 6.1s-5-2.8-5-6.1c0-1.9.7-3.3 1.6-4.6.3 1 .9 1.7 1.6 2.1C10.5 7.9 10.9 5.4 12 3z" />
      <path d="M12 18.6c1.4 0 2.3-.9 2.3-2.2 0-.9-.5-1.5-1-2.1-.3-.4-.6-.8-.8-1.3-.3.8-.8 1.2-1.2 1.7-.5.5-.9 1-.9 1.7a2.1 2.1 0 0 1 1.6 2.2z" fill="currentColor" stroke="none" />
    </svg>
  );
}
