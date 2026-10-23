import { test } from "node:test";
import assert from "node:assert/strict";
import { randomUUID, createHash } from "node:crypto";
import { unlink } from "node:fs/promises";
import path from "node:path";
import { cached } from "../lib/server/cache";
test("cache coalesces identical requests and persists successful values", async () => {
  const key = randomUUID();
  let calls = 0;
  const loader = async () => {
    calls++;
    await new Promise((resolve) => setTimeout(resolve, 10));
    return { ok: true };
  };
  try {
    const [a, b] = await Promise.all([
      cached(key, 10000, loader),
      cached(key, 10000, loader),
    ]);
    assert.equal(calls, 1);
    assert.deepEqual(a.value, b.value);
    const c = await cached(key, 10000, loader);
    assert.ok(c.cacheHit);
    assert.equal(calls, 1);
  } finally {
    await unlink(
      path.join(
        process.cwd(),
        ".cache",
        "pathsafe",
        createHash("sha256").update(key).digest("hex") + ".json",
      ),
    ).catch(() => {});
  }
});
test("failed requests back off and never become cached successes", async () => {
  const key = randomUUID();
  let calls = 0;
  const loader = async () => {
    calls++;
    throw new Error("unavailable");
  };
  await assert.rejects(cached(key, 10000, loader), /unavailable/);
  await assert.rejects(cached(key, 10000, loader), /unavailable/);
  assert.equal(calls, 1);
});
test("warm memory avoids refetching when the instance cache file disappears", async () => {
  const key = randomUUID();
  let calls = 0;
  const loader = async () => ({ request: ++calls });
  const first = await cached(key, 10000, loader);
  await unlink(
    path.join(
      process.cwd(),
      ".cache",
      "pathsafe",
      createHash("sha256").update(key).digest("hex") + ".json",
    ),
  ).catch(() => {});
  const second = await cached(key, 10000, loader);
  assert.deepEqual(second.value, first.value);
  assert.ok(second.cacheHit);
  assert.equal(calls, 1);
});
test("expired memory and file values are not silently reused", async () => {
  const key = randomUUID();
  let calls = 0;
  const loader = async () => ({ request: ++calls });
  try {
    await cached(key, 0, loader);
    const next = await cached(key, 0, loader);
    assert.equal(next.value.request, 2);
    assert.equal(next.cacheHit, false);
  } finally {
    await unlink(
      path.join(
        process.cwd(),
        ".cache",
        "pathsafe",
        createHash("sha256").update(key).digest("hex") + ".json",
      ),
    ).catch(() => {});
  }
});
