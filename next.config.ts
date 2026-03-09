import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // React Compiler disabled — incompatible with React Hook Form's mutable ref internals
  reactCompiler: false,
};

export default nextConfig;
