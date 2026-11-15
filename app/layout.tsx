import type { Metadata, Viewport } from 'next';
import localFont from 'next/font/local';
import type { ReactNode } from 'react';
import './tokens.css';
import './globals.css';

// DESIGN.md 3.1: Pretendard 가변 한 파일, display swap, 외부 요청 없음
const pretendard = localFont({
  src: './fonts/PretendardVariable.woff2',
  weight: '45 920',
  style: 'normal',
  display: 'swap',
  variable: '--font-pretendard',
  preload: true,
  fallback: ['system-ui', '-apple-system', 'Apple SD Gothic Neo', 'Malgun Gothic', 'Noto Sans KR', 'Segoe UI', 'Roboto', 'sans-serif'],
});

export const metadata: Metadata = {
  title: 'agent-observer',
  description: 'Claude Code 세션과 BOT 상태, 플랜 사용량 관찰',
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ko" className={pretendard.variable}>
      <body>{children}</body>
    </html>
  );
}
