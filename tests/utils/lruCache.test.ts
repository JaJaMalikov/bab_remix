import { describe, expect, it } from "vitest";
import { LRUCache } from "../../src/utils/lruCache";

describe("LRUCache", () => {
  it("returns stored values and refreshes recency on access", () => {
    const cache = new LRUCache<string, number>(2);
    cache.set("a", 1);
    cache.set("b", 2);

    expect(cache.get("a")).toBe(1);

    cache.set("c", 3);

    expect(cache.get("a")).toBe(1);
    expect(cache.get("b")).toBeUndefined();
    expect(cache.get("c")).toBe(3);
  });

  it("evicts the least recently used entry after exceeding capacity", () => {
    const cache = new LRUCache<string, string>(3);
    cache.set("a", "first");
    cache.set("b", "second");
    cache.set("c", "third");

    expect(cache.get("a")).toBe("first");
    expect(cache.get("b")).toBe("second");
    expect(cache.get("c")).toBe("third");

    cache.get("a");
    cache.set("d", "fourth");

    expect(cache.get("a")).toBe("first");
    expect(cache.get("b")).toBeUndefined();
    expect(cache.get("c")).toBe("third");
    expect(cache.get("d")).toBe("fourth");
  });
});
