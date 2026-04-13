import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["pdfkit"],
  turbopack: {
    resolveAlias: {
      // PDFKit optionally requires 'canvas' — stub it out
      canvas: { browser: "./lib/stubs/canvas.js" },
    },
  },
};

export default nextConfig;
