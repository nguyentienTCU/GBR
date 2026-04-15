import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // allowedDevOrigins: process.env.NEXT_NGROK_URL
  //   ? [process.env.NEXT_NGROK_URL]
  //   : [],

  // async rewrites() {
  //   return [
  //     {
  //       source: "/api/:path*",
  //       destination: `${process.env.NEXT_API_URL}/:path*`,
  //     },
  //   ];
  // },
};

export default nextConfig;
