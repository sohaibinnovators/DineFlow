/** Current LocalStorage key (Phase 5). Older keys are migrated automatically. */
export const DINEFLOW_STORAGE_KEY = "dineflow:v5";
export const LEGACY_STORAGE_KEYS = [
  "dineflow:v4",
  "dineflow:v3",
  "dineflow:v2",
] as const;
export const STORE_VERSION = 5;

/** Separate cart key so guest carts survive without rewriting the full store on every qty tweak if needed. */
export const CART_STORAGE_KEY = "dineflow:cart:v1";
