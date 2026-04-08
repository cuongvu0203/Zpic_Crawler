/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "*.zpicdn.lol" },
      { protocol: "https", hostname: "*.zpi.cx" },
      { protocol: "https", hostname: "zpi.cx" },
    ],
  },
};

module.exports = nextConfig;
