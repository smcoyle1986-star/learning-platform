import type { NextConfig } from "next";

const chromiumRuntimeFiles = [
  "./node_modules/@sparticuz/chromium/bin/**/*",
  "./node_modules/@sparticuz/chromium/build/**/*",
  "./node_modules/@sparticuz/chromium/package.json",
];

const nextConfig: NextConfig = {
  serverExternalPackages: ["@sparticuz/chromium"],
  outputFileTracingIncludes: {
    "/api/worksheets/export-pdf": chromiumRuntimeFiles,
    "/api/printables/export-pdf": chromiumRuntimeFiles,
    "/api/lesson-plans/export-pdf": chromiumRuntimeFiles,
  },
};

export default nextConfig;
