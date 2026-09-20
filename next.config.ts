import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Pins the workspace root to this project. Without it, Turbopack walks up looking for a
  // lockfile and picks up an unrelated package-lock.json in the user's home directory.
  turbopack: {
    root: path.resolve(__dirname),
  },
  // The demo snapshot is opened through a runtime-built path (data/db/client.ts), which file
  // tracing cannot follow, so on Vercel it would simply be absent from the function bundle.
  // Force it in for every server route. Both keys because these are picomatch globs and `*`
  // does not cross `/`: `/*` covers top-level routes, `/**` the nested ones like /lots/[lotId].
  outputFileTracingIncludes: {
    "/*": ["./data/demo/snapshot.db"],
    "/**": ["./data/demo/snapshot.db"],
  },
};

export default nextConfig;
