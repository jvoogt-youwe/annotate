import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  outputFileTracingIncludes: {
    "/api/reports": ["./node_modules/@sparticuz/chromium/bin/**/*"],
  },
};

export default nextConfig;
