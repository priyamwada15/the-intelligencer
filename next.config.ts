import type { NextConfig } from "next";
import { withMicrofrontends } from "@vercel/microfrontends/next/config";

const nextConfig: NextConfig = {
  // Lets phones/other devices on the same LAN load hot-reload updates
  // when previewing via the printed "Network:" URL during `next dev`.
  allowedDevOrigins: ["10.0.0.4"],
};

export default withMicrofrontends(nextConfig);
