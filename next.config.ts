import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "export",
  basePath: process.env.NODE_ENV === "production" ? "/pariedoliator" : "",
  images: { unoptimized: true },
};

export default nextConfig;
