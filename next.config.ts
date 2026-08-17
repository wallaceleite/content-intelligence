import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Sem isso o bundler reescreve o __dirname do ffmpeg-static ("/ROOT/...")
  serverExternalPackages: ["ffmpeg-static"],
  // Binário baixado no postinstall — o file tracing não o detecta sozinho
  outputFileTracingIncludes: {
    "/api/videos/\\[id\\]/normalize": ["./node_modules/ffmpeg-static/ffmpeg"],
  },
};

export default nextConfig;
