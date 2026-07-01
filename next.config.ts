import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  outputFileTracingIncludes: {
    "/api/reports": ["./node_modules/@sparticuz/chromium/bin/**/*"],
    "/api/capture-page": ["./node_modules/@sparticuz/chromium/bin/**/*"],
  },
};

export default nextConfig;
