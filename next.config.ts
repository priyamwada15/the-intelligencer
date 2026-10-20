import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Served at /the-intelligencer/* on priyamwada.me through a rewrite in the
  // portfolio that forwards the full path unstripped, so this app's own
  // router (and its /_next assets) need to live under the prefix.
  basePath: "/the-intelligencer",
  // Lets phones/other devices on the same LAN load hot-reload updates
  // when previewing via the printed "Network:" URL during `next dev`.
  allowedDevOrigins: ["10.0.0.4"],
  async redirects() {
    return [
      // Nothing lives at the bare root (everything is under basePath), so
      // send the-intelligencer.vercel.app/ to the app's real home.
      {
        source: "/",
        destination: "https://www.priyamwada.me/the-intelligencer",
        basePath: false,
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
