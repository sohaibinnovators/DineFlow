import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/about", "/menu", "/chefs", "/reservations", "/contact"],
        disallow: [
          "/admin",
          "/admin/",
          "/staff",
          "/staff/",
          "/kitchen",
          "/kitchen/",
          "/customer",
          "/customer/",
          "/login",
          "/signup",
          "/cart",
          "/checkout",
          "/order-confirmation",
        ],
      },
    ],
  };
}
