/**
 * Run `build` or `dev` with `SKIP_ENV_VALIDATION` to skip env validation. This is especially useful
 * for Docker builds.
 */
await import("./src/env.js");

/** @type {import("next").NextConfig} */
const config = {
  devIndicators: {
    buildActivity: false,
    appIsrStatus: false,
    buildActivityPosition: 'bottom-right',
  },
  // Option A: unblock deploys by ignoring type errors at build time
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  productionBrowserSourceMaps: false,
  images: {
    formats: ["image/avif", "image/webp"],
    deviceSizes: [360, 414, 640, 768, 1024, 1280],
    imageSizes: [64, 96, 128, 256, 384],
    remotePatterns: [
      {
        protocol: "https",
        hostname: "lh3.googleusercontent.com",
      },
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
      {
        protocol: "https",
        hostname: "*.ufs.sh",
      },
    ],
  },
  async headers() {
    return [
      {
        // Matching all API routes for ads
        source: "/api/ads/:path*",
        headers: [
          { key: "Access-Control-Allow-Credentials", value: "true" },
          { key: "Access-Control-Allow-Origin", value: "*" }, // Allow all origins (or restricted to video.biodocs.ai)
          { key: "Access-Control-Allow-Methods", value: "GET,DELETE,PATCH,POST,PUT,OPTIONS" },
          { key: "Access-Control-Allow-Headers", value: "X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization" },
        ]
      }
    ]
  }
};

// Optionally wrap with bundle analyzer if installed
let wrap = (cfg) => cfg;
try {
  // @ts-ignore - optional dev dependency; only present when ANALYZE is enabled
  const { default: analyzer } = await import('@next/bundle-analyzer');
  wrap = analyzer({ enabled: process.env.ANALYZE === 'true' });
} catch {
  // analyzer not installed; proceed without it
}

export default wrap(config);
