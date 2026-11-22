"use client";

import { useData } from "@/components/providers/DataProvider";
import { Button } from "@/components/ui/Button";
import { restaurantInfo } from "@/lib/mock-data";
import { cn } from "@/lib/utils";
import { Menu, ShoppingCart, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

const links = [
  { href: "/", label: "Home" },
  { href: "/about", label: "About" },
  { href: "/menu", label: "Menu" },
  { href: "/cart", label: "Cart" },
  { href: "/chefs", label: "Chefs" },
  { href: "/reservations", label: "Reservations" },
  { href: "/contact", label: "Contact" },
];

export function PublicHeader() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const { store, hydrated } = useData();
  const cartCount = hydrated
    ? store.cart.items.reduce((sum, item) => sum + item.quantity, 0)
    : 0;

  return (
    <header className="sticky top-0 z-40 border-b border-white/10 bg-navy/95 text-white backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
        <Link href="/" className="min-w-0">
          <span className="block font-display text-2xl tracking-tight">
            {restaurantInfo.name}
          </span>
          <span className="block text-xs text-orange">
            Powered by {restaurantInfo.productName}
          </span>
        </Link>

        <nav className="hidden items-center gap-1 lg:flex">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                "rounded-lg px-3 py-2 text-sm transition",
                pathname === link.href || pathname.startsWith(`${link.href}/`)
                  ? "bg-white/10 text-white"
                  : "text-white/70 hover:bg-white/5 hover:text-white",
              )}
            >
              {link.label}
              {link.href === "/cart" && cartCount > 0 ? (
                <span className="ml-1 rounded-md bg-orange px-1.5 py-0.5 text-[10px] font-semibold text-white">
                  {cartCount}
                </span>
              ) : null}
            </Link>
          ))}
        </nav>

        <div className="hidden items-center gap-2 lg:flex">
          <Link href="/cart" className="relative mr-1">
            <Button variant="ghost" className="text-white hover:bg-white/10">
              <ShoppingCart className="h-4 w-4" />
              Cart
              {cartCount > 0 ? (
                <span className="rounded-md bg-orange px-1.5 py-0.5 text-[10px]">
                  {cartCount}
                </span>
              ) : null}
            </Button>
          </Link>
          <Link href="/login">
            <Button variant="ghost" className="text-white hover:bg-white/10">
              Login
            </Button>
          </Link>
          <Link href="/signup">
            <Button variant="secondary">Sign Up</Button>
          </Link>
          <Link href="/admin">
            <Button variant="outline" className="border-white/20 bg-transparent text-white hover:bg-white/10">
              Dashboards
            </Button>
          </Link>
        </div>

        <button
          type="button"
          className="rounded-lg border border-white/20 p-2 lg:hidden"
          onClick={() => setOpen((value) => !value)}
          aria-label="Toggle navigation"
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {open ? (
        <div className="border-t border-white/10 px-4 py-4 lg:hidden">
          <nav className="flex flex-col gap-1">
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setOpen(false)}
                className={cn(
                  "rounded-lg px-3 py-2.5 text-sm",
                  pathname === link.href ? "bg-white/10" : "text-white/80",
                )}
              >
                {link.label}
                {link.href === "/cart" && cartCount > 0 ? (
                  <span className="ml-2 rounded-md bg-orange px-1.5 py-0.5 text-[10px] font-semibold text-white">
                    {cartCount}
                  </span>
                ) : null}
              </Link>
            ))}
            <div className="mt-3 grid gap-2">
              <Link href="/login" onClick={() => setOpen(false)}>
                <Button variant="outline" className="w-full border-white/20 bg-transparent text-white">
                  Login
                </Button>
              </Link>
              <Link href="/signup" onClick={() => setOpen(false)}>
                <Button variant="secondary" className="w-full">
                  Sign Up
                </Button>
              </Link>
              <Link href="/admin" onClick={() => setOpen(false)}>
                <Button variant="ghost" className="w-full text-white hover:bg-white/10">
                  Open Dashboards
                </Button>
              </Link>
            </div>
          </nav>
        </div>
      ) : null}
    </header>
  );
}
