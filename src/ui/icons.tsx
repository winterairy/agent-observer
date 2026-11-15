/** 인라인 SVG 아이콘(DESIGN.md 6절 "아이콘"). 아이콘 라이브러리를 쓰지 않는다. 모두 currentColor, aria-hidden. */
import type { SVGProps } from 'react';

export type IconName = 'play' | 'dots' | 'circleBang' | 'triangleBang' | 'check' | 'ring' | 'info' | 'chevronRight' | 'chevronDown';

type Props = { name: IconName; size?: number } & Omit<SVGProps<SVGSVGElement>, 'name'>;

export function Icon({ name, size = 16, ...rest }: Props) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" aria-hidden="true" focusable="false" {...rest}>
      {paths(name)}
    </svg>
  );
}

function paths(name: IconName) {
  const stroke = { fill: 'none', stroke: 'currentColor', strokeWidth: 1.5, strokeLinecap: 'round', strokeLinejoin: 'round' } as const;
  switch (name) {
    case 'play':
      return <path d="M5 3.5v9l7-4.5z" fill="currentColor" />;
    case 'dots':
      return (
        <g fill="currentColor">
          <circle cx="3.5" cy="8" r="1.5" />
          <circle cx="8" cy="8" r="1.5" />
          <circle cx="12.5" cy="8" r="1.5" />
        </g>
      );
    case 'circleBang':
      return (
        <g>
          <circle cx="8" cy="8" r="6.25" {...stroke} />
          <path d="M8 4.75v4" {...stroke} />
          <circle cx="8" cy="11.25" r="0.9" fill="currentColor" />
        </g>
      );
    case 'triangleBang':
      return (
        <g>
          <path d="M8 1.9 14.6 13.6H1.4z" {...stroke} />
          <path d="M8 6v3.6" {...stroke} />
          <circle cx="8" cy="11.6" r="0.9" fill="currentColor" />
        </g>
      );
    case 'check':
      return <path d="M3 8.5 6.5 12 13 4.5" {...stroke} />;
    case 'ring':
      return <circle cx="8" cy="8" r="5.5" {...stroke} />;
    case 'info':
      return (
        <g>
          <circle cx="8" cy="8" r="6.25" {...stroke} />
          <path d="M8 7.25v4" {...stroke} />
          <circle cx="8" cy="4.9" r="0.9" fill="currentColor" />
        </g>
      );
    case 'chevronRight':
      return <path d="M6 3.5 10.5 8 6 12.5" {...stroke} />;
    case 'chevronDown':
      return <path d="M3.5 6 8 10.5 12.5 6" {...stroke} />;
  }
}
