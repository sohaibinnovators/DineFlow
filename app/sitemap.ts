import type { MetadataRoute } from "next";

const BASE = "https://dineflow-demo.example";

export default function sitemap(): MetadataRoute.Sitemap {
  const routes = [
    "",
    "/about",
    "/menu",
    "/chefs",
    "/reservations",
    "/contact",
  ];

  return routes.map((route) => ({
    url: `${BASE}${route}`,
    lastModified: new Date("2026-11-22"),
    changeFrequency: "weekly" as const,
    priority: route === "" ? 1 : 0.7,
  }));
}
