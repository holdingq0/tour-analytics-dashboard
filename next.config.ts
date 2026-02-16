import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Disable all telemetry
  experimental: {},
  // Static export for desktop app (Tauri)
  output: "standalone",
};

// Disable Next.js telemetry via env
process.env.NEXT_TELEMETRY_DISABLED = "1";

export default nextConfig;

