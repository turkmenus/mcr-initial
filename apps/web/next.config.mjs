/** @type {import('next').NextConfig} */
const RENDERER_URL = process.env.INTERNAL_RENDERER_URL || "http://127.0.0.1:4002";
const REALTIME_URL = process.env.INTERNAL_REALTIME_URL || "http://127.0.0.1:4001";

const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  experimental: {
    cpus: 1,
    workerThreads: false,
  },
  transpilePackages: [
    "@mcr/schema",
    "@mcr/engine",
    "@mcr/timeline",
    "@mcr/casparcg",
    "@mcr/presets",
    "@mcr/maps",
    "@mcr/templates",
    "@mcr/db",
  ],
  async rewrites() {
    return [
      {
        source: "/api/media/:path*",
        destination: `${RENDERER_URL}/api/media/:path*`,
      },
      {
        source: "/api/render/:path*",
        destination: `${RENDERER_URL}/api/render/:path*`,
      },
      {
        source: "/renders/:path*",
        destination: `${RENDERER_URL}/renders/:path*`,
      },
      {
        source: "/uploads/:path*",
        destination: `${RENDERER_URL}/uploads/:path*`,
      },
      {
        source: "/thumbnails/:path*",
        destination: `${RENDERER_URL}/thumbnails/:path*`,
      },
      {
        source: "/api/switcher/:path*",
        destination: `${REALTIME_URL}/api/switcher/:path*`,
      },
      {
        source: "/api/cg/:path*",
        destination: `${REALTIME_URL}/api/cg/:path*`,
      },
      {
        source: "/api/state",
        destination: `${REALTIME_URL}/api/state`,
      },
    ];
  },
};

export default nextConfig;
