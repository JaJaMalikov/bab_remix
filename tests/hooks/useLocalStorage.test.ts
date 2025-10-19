import { renderHook, act } from "@testing-library/react";
import { describe, it, beforeEach, expect, vi } from "vitest";

import {
  useLocalStorage,
  readFromLocalStorage,
  writeToLocalStorage,
} from "../../src/hooks/useLocalStorage";

const KEY = "test:key";

describe("useLocalStorage", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it("lit la valeur initiale depuis le stockage", () => {
    localStorage.setItem(KEY, JSON.stringify({ count: 5 }));

    const { result } = renderHook(() => useLocalStorage(KEY, { count: 0 }));
    expect(result.current[0]).toEqual({ count: 5 });
  });

  it("met à jour localStorage lors des changements d'état", () => {
    const { result } = renderHook(() => useLocalStorage(KEY, { count: 0 }));

    act(() => {
      result.current[1]({ count: 2 });
    });

    expect(localStorage.getItem(KEY)).toBe(JSON.stringify({ count: 2 }));

    act(() => {
      result.current[1]((prev) => ({ count: prev.count + 1 }));
    });

    expect(localStorage.getItem(KEY)).toBe(JSON.stringify({ count: 3 }));
  });

  it("gère les erreurs de lecture/écriture et renvoie les valeurs de secours", () => {
    const getSpy = vi
      .spyOn(Storage.prototype, "getItem")
      .mockImplementation(() => {
        throw new Error("boom");
      });

    expect(readFromLocalStorage(KEY, 42)).toBe(42);
    expect(getSpy).toHaveBeenCalled();

    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("fail");
    });
    writeToLocalStorage(KEY, { ok: true });
    expect(warnSpy).toHaveBeenCalled();
    warnSpy.mockRestore();
  });
});
