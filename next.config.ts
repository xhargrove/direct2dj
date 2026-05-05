import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    /** Large multipart uploads to Route Handlers (e.g. admin pack-slot API) — align with serverActions */
    proxyClientMaxBodySize: "50mb",
    serverActions: {
      /** Admin DJ pack uploads — WAVs can exceed default limit */
      bodySizeLimit: "50mb",
    },
  },
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
