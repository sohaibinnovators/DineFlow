import { restaurantInfo } from "@/lib/mock-data";
import Link from "next/link";

const footerLinks = [
  { href: "/menu", label: "Menu" },
  { href: "/about", label: "About Us" },
  { href: "/chefs", label: "Our Chefs" },
  { href: "/reservations", label: "Reservations" },
  { href: "/contact", label: "Contact" },
  { href: "/login", label: "Login" },
];

export function PublicFooter() {
  return (
    <footer className="border-t border-white/10 bg-navy text-white">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-14 sm:px-6 md:grid-cols-3">
        <div>
          <p className="font-display text-2xl">{restaurantInfo.name}</p>
          <p className="mt-2 text-sm text-white/70">{restaurantInfo.tagline}</p>
          <p className="mt-4 text-sm text-white/60">
            {restaurantInfo.address}
            <br />
            {restaurantInfo.city}
          </p>
        </div>
        <div>
          <p className="text-sm font-semibold tracking-wide uppercase text-orange">
            Explore
          </p>
          <ul className="mt-4 space-y-2">
            {footerLinks.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  className="text-sm text-white/70 transition hover:text-white"
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <p className="text-sm font-semibold tracking-wide uppercase text-orange">
            Hours & Contact
          </p>
          <ul className="mt-4 space-y-2 text-sm text-white/70">
            {restaurantInfo.hours.map((item) => (
              <li key={item.day} className="flex justify-between gap-4">
                <span>{item.day}</span>
                <span>{item.time}</span>
              </li>
            ))}
          </ul>
          <p className="mt-4 text-sm text-white/70">{restaurantInfo.phone}</p>
          <p className="text-sm text-white/70">{restaurantInfo.email}</p>
          <div className="mt-4 flex gap-3">
            {restaurantInfo.socials.map((social) => (
              <a
                key={social.name}
                href={social.href}
                className="text-sm text-orange hover:underline"
              >
                {social.name}
              </a>
            ))}
          </div>
        </div>
      </div>
      <div className="border-t border-white/10 px-4 py-4 text-center text-xs text-white/50">
        © 2026 {restaurantInfo.productName} · Fictional demo restaurant content
        only
      </div>
    </footer>
  );
}
