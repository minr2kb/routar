import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@routar/core", "@routar/axios", "@routar/fetch"],
};

export default nextConfig;
