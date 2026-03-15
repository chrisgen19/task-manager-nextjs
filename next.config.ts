import type { NextConfig } from "next";

const r2Host = process.env.R2_PUBLIC_URL
  ? new URL(process.env.R2_PUBLIC_URL).hostname
  : undefined;

const nextConfig: NextConfig = {
  // React Compiler disabled — incompatible with React Hook Form's mutable ref internals
  reactCompiler: false,
  images: {
    remotePatterns: r2Host
      ? [{ protocol: "https", hostname: r2Host }]
      : [],
  },
};

export default nextConfig;
