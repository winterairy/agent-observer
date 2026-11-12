import type { NextConfig } from 'next';

const isDev = process.env.NODE_ENV !== 'production';

/**
 * 보안 헤더(SEC-03). 클릭재킹(frame-ancestors·X-Frame-Options), MIME 추측, Referer 유출을 막는다.
 * Next.js App Router는 nonce 없이 inline script(`self.__next_f.push`)를 넣으므로 script-src에
 * 'unsafe-inline'이 필요하다. 개발 모드는 HMR(eval·WebSocket)을 위해 더 완화한다.
 */
const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ''}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self'",
  `connect-src 'self'${isDev ? ' ws: wss:' : ''}`,
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
].join('; ');

const nextConfig: NextConfig = {
  poweredByHeader: false,
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'Content-Security-Policy', value: csp },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'same-origin' },
        ],
      },
    ];
  },
};

export default nextConfig;
