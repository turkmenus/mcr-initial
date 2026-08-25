/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: [
    "@mcr/schema",
    "@mcr/engine",
    "@mcr/timeline",
    "@mcr/casparcg",
    "@mcr/presets",
    "@mcr/maps",
  ],
};

export default nextConfig;
