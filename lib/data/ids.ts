export function createId(prefix: string) {
  const rand = Math.random().toString(36).slice(2, 8);
  const time = Date.now().toString(36);
  return `${prefix}-${time}${rand}`;
}

export function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

export function uniqueSlug(base: string, existing: string[], excludeId?: string) {
  const root = slugify(base) || "item";
  let candidate = root;
  let i = 2;
  const taken = new Set(
    existing.filter((slug, index) => {
      // existing is just slugs; caller filters by id separately when needed
      void index;
      return true;
    }),
  );
  while (taken.has(candidate)) {
    candidate = `${root}-${i}`;
    i += 1;
  }
  void excludeId;
  return candidate;
}

export function nextOrderNumber(existingNumbers: string[]) {
  const max = existingNumbers.reduce((acc, number) => {
    const match = number.match(/(\d+)$/);
    if (!match) return acc;
    return Math.max(acc, Number(match[1]));
  }, 1000);
  return `DF-${max + 1}`;
}

export function nowIso() {
  return new Date().toISOString();
}
