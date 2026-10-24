import { createHash, randomUUID } from "node:crypto";
import { mkdir, readFile, writeFile, rename } from "node:fs/promises";
import path from "node:path";
import { tmpdir } from "node:os";
interface CacheEntry<T> {
  value: T;
  fetchedAt: string;
  expiresAt: number;
}
export interface Cached<T> extends CacheEntry<T> {
  cacheHit: boolean;
}
const values = new Map<string, CacheEntry<unknown>>();
const pending = new Map<string, Promise<Cached<unknown>>>();
const failures = new Map<string, { until: number; error: unknown }>();
// Server-only. Local cache survives dev restarts; Vercel uses ephemeral /tmp plus
// bounded process memory. No stale-on-error substitution or distributed-cache promise.
export async function cached<T>(
  key: string,
  ttlMs: number,
  loader: () => Promise<T>,
): Promise<Cached<T>> {
  const memory = values.get(key);
  if (memory && memory.expiresAt > Date.now())
    return { ...memory, cacheHit: true } as Cached<T>;
  values.delete(key);
  const directory = process.env.VERCEL
    ? path.join(tmpdir(), "pathsafe-cache")
    : path.join(process.cwd(), ".cache", "pathsafe");
  const file = path.join(
    directory,
    createHash("sha256").update(key).digest("hex") + ".json",
  );
  try {
    const entry = JSON.parse(await readFile(file, "utf8")) as CacheEntry<T>;
    if (entry.expiresAt > Date.now() && entry.value !== undefined) {
      remember(key, entry);
      return { ...entry, cacheHit: true };
    }
  } catch {
    /* First run, corrupt or unavailable local cache: refetch. */
  }
  const failure = failures.get(key);
  if (failure && failure.until > Date.now()) throw failure.error;
  // Share one upstream request when several callers need the same fresh data.
  const existing = pending.get(key);
  if (existing) return existing as Promise<Cached<T>>;
  const task = (async () => {
    try {
      const value = await Promise.resolve().then(loader);
      const entry = {
        value,
        fetchedAt: new Date().toISOString(),
        expiresAt: Date.now() + ttlMs,
      };
      remember(key, entry);
      try {
        await mkdir(path.dirname(file), { recursive: true });
        const temp = file + "." + randomUUID() + ".tmp";
        await writeFile(temp, JSON.stringify(entry));
        await rename(temp, file);
      } catch {
        /* Read-only hosts retain in-flight coalescing; deployment needs persistent/shared cache. */
      }
      failures.delete(key);
      return { ...entry, cacheHit: false };
    } catch (error) {
      failures.set(key, { until: Date.now() + 60000, error });
      throw error;
    } finally {
      pending.delete(key);
    }
  })();
  pending.set(key, task);
  return task;
}

function remember(key: string, entry: CacheEntry<unknown>) {
  if (values.size >= 32) {
    const oldest = values.keys().next().value;
    if (oldest) values.delete(oldest);
  }
  values.set(key, entry);
}
