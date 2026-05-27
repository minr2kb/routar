import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@routar/core", "@routar/axios"],
};

export default nextConfig;
