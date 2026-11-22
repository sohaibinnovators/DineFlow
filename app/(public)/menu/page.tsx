import { MenuBrowser } from "./MenuBrowser";

export const metadata = {
  title: "Menu",
  description: "Browse Lumina Kitchen dishes and categories.",
};

export default function MenuPage() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6">
      <div className="mb-10 max-w-2xl">
        <p className="text-sm font-semibold tracking-wide text-orange uppercase">
          Menu
        </p>
        <h1 className="mt-2 font-display text-4xl text-navy">
          Seasonal plates, carefully priced
        </h1>
        <p className="mt-3 text-muted">
          Live menu from DineFlow — admin updates appear here after refresh.
        </p>
      </div>
      <MenuBrowser />
    </div>
  );
}
