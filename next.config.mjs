/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          {
            key: "Content-Security-Policy",
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://www.youtube.com https://s.ytimg.com https://js.tosspayments.com",
              "frame-src 'self' https://www.youtube.com https://www.youtube-nocookie.com https://tosspayments.com https://*.tosspayments.com",
              "img-src 'self' data: blob: https:",
              "style-src 'self' 'unsafe-inline'",
              "connect-src 'self' https:",
              "font-src 'self' data:",
              "media-src 'self' https:",
            ].join("; "),
          },
        ],
      },
    ];
  },
}

export default nextConfig
