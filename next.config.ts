import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      {
        source: "/dj/status",
        destination: "/dj/application-status",
        permanent: false,
      },
      {
        source: "/admin/applications",
        destination: "/admin/dj-applications",
        permanent: false,
      },
    ];
  },
};

export default nextConfig;
