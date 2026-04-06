import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: "/api/:path*",
        headers: [{ key: "Cache-Control", value: "s-maxage=3600" }],
      },
    ];
  },
};

export default nextConfig;
