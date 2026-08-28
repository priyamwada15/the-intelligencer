import type { NextConfig } from "next";
import { withMicrofrontends } from "@vercel/microfrontends/next/config";

const nextConfig: NextConfig = {
  // Served at /the-intelligencer/* under the portfolio's microfrontends
  // routing; Vercel forwards the full path unstripped, so this app's own
  // router needs to recognize the prefix as mapping to its root routes.
  basePath: "/the-intelligencer",
  // Lets phones/other devices on the same LAN load hot-reload updates
  // when previewing via the printed "Network:" URL during `next dev`.
  allowedDevOrigins: ["10.0.0.4"],
};

export default withMicrofrontends(nextConfig);
