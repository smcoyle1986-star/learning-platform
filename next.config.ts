import type { NextConfig } from "next";

const chromiumRuntimeFiles = [
  "./node_modules/@sparticuz/chromium/bin/**/*",
  "./node_modules/@sparticuz/chromium/build/**/*",
  "./node_modules/@sparticuz/chromium/package.json",
];

const nextConfig: NextConfig = {
  // Allow the local desktop preview to hydrate when it is opened with either
  // localhost or 127.0.0.1. Without this, Next rejects the browser's chunk
  // requests from the alternate local origin and every client-side control
  // appears unresponsive.
  allowedDevOrigins: ["localhost", "127.0.0.1"],
  serverExternalPackages: ["@sparticuz/chromium"],
  outputFileTracingIncludes: {
    "/api/worksheets/export-pdf": chromiumRuntimeFiles,
    "/api/printables/export-pdf": chromiumRuntimeFiles,
    "/api/lesson-plans/export-pdf": chromiumRuntimeFiles,
  },
};

export default nextConfig;
