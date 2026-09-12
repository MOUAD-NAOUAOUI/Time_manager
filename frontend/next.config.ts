import type { NextConfig } from "next";

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8080";
const AI_URL = process.env.NEXT_PUBLIC_AI_API_URL || "http://127.0.0.1:8000";

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      // Proxy all /api/** requests to the Spring Boot backend.
      // This makes the cookie domain = localhost:3000 so the middleware can read it.
      {
        source: "/api/:path*",
        destination: `${BACKEND_URL}/:path*`,
      },
      // Proxy all /aiapi/** requests to the AI/Python service.
      {
        source: "/aiapi/:path*",
        destination: `${AI_URL}/:path*`,
      },
    ];
  },

  async headers() {
    const scriptSources = ["'self'", "'unsafe-inline'"];
    const connectSources = ["'self'"];

    for (const configuredUrl of [
      process.env.NEXT_PUBLIC_API_URL,
      process.env.NEXT_PUBLIC_AI_API_URL,
    ]) {
      if (configuredUrl) {
        try {
          connectSources.push(new URL(configuredUrl).origin);
        } catch {
          // Ignore malformed optional URLs
        }
      }
    }

    if (process.env.NODE_ENV === "development") {
      scriptSources.push("'unsafe-eval'");
    }

    return [
      {
        source: "/:path*",
        headers: [
          {
            key: "Content-Security-Policy",
            value: [
              "default-src 'self'",
              `script-src ${scriptSources.join(" ")}`,
              "style-src 'self' 'unsafe-inline'",
              "img-src 'self' data: blob:",
              "font-src 'self'",
              `connect-src ${[...new Set(connectSources)].join(" ")}`,
              "frame-ancestors 'none'",
            ].join("; "),
          },
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload",
          },
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "Referrer-Policy",
            value: "origin-when-cross-origin",
          },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
