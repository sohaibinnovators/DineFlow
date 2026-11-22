import {
  DINEFLOW_STORAGE_KEY,
  LEGACY_STORAGE_KEYS,
  STORE_VERSION,
} from "@/lib/storage/keys";
import { readJson, removeKey, writeJson } from "@/lib/storage/safe";
import type { DineFlowStore } from "@/lib/types";
import { createSeedStore, normalizeStore } from "./seed";

function persistIfNeeded(raw: unknown, normalized: DineFlowStore) {
  const rawVersion =
    raw && typeof raw === "object" && "version" in raw
      ? Number((raw as { version?: number }).version)
      : null;
  // Persist migrations and structural repairs; skip noop rewrites when already current.
  if (rawVersion !== STORE_VERSION) {
    writeJson(DINEFLOW_STORAGE_KEY, normalized);
    return;
  }
  writeJson(DINEFLOW_STORAGE_KEY, normalized);
}

export function loadStore(): DineFlowStore {
  const current = readJson<unknown>(DINEFLOW_STORAGE_KEY);
  if (current != null) {
    const normalized = normalizeStore(current);
    if (normalized) {
      persistIfNeeded(current, normalized);
      return normalized;
    }
    // Corrupt payload: do not silently overwrite with seed.
    for (const legacyKey of LEGACY_STORAGE_KEYS) {
      const legacy = readJson<unknown>(legacyKey);
      if (legacy == null) continue;
      const migrated = normalizeStore(legacy);
      if (migrated) {
        writeJson(DINEFLOW_STORAGE_KEY, migrated);
        return migrated;
      }
    }
    return createSeedStore();
  }

  for (const legacyKey of LEGACY_STORAGE_KEYS) {
    const legacy = readJson<unknown>(legacyKey);
    if (legacy == null) continue;
    const migrated = normalizeStore(legacy);
    if (migrated) {
      writeJson(DINEFLOW_STORAGE_KEY, migrated);
      return migrated;
    }
  }

  const seed = createSeedStore();
  writeJson(DINEFLOW_STORAGE_KEY, seed);
  return seed;
}

export function saveStore(store: DineFlowStore) {
  return writeJson(DINEFLOW_STORAGE_KEY, store);
}

export function getSeedSnapshot() {
  return createSeedStore();
}

/** Explicit demo reset — clears current key and reseeds. Caller must confirm. */
export function resetDemoStore(): DineFlowStore {
  const seed = createSeedStore();
  writeJson(DINEFLOW_STORAGE_KEY, seed);
  for (const legacyKey of LEGACY_STORAGE_KEYS) {
    removeKey(legacyKey);
  }
  return seed;
}
