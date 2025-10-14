import React, { useEffect, useMemo, useState, memo, useCallback } from "react";
import { FloatingPanel } from "./FloatingPanel";
import { AssetItem, Asset } from "./AssetItem";
import { useUi } from "../context/UiContext";

type ManifestEntry = {
  name: string;
  path: string; // relative to /assets/
  category: "pantins" | "objets" | "decors";
};

const mapCategoryToType = (c: ManifestEntry["category"]): Asset["type"] =>
  c === "pantins" ? "pantin" : c === "objets" ? "objet" : "decor";

export const Library = memo(() => {
  const { setShowLibrary } = useUi();
  const [assets, setAssets] = useState<Asset[]>([]);
  const [category, setCategory] = useState<
    "all" | "pantins" | "objets" | "decors"
  >("all");
  const [query, setQuery] = useState("");

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const res = await fetch("/assets/assets-manifest.json");
        const data: ManifestEntry[] = await res.json();
        if (cancelled) return;
        const mapped: Asset[] = data.map((e) => ({
          name: e.name,
          type: mapCategoryToType(e.category),
          path: `/assets/${e.path}`,
        }));
        setAssets(mapped);
      } catch (e) {
        console.error("Failed to load assets-manifest.json", e);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const filteredAssets = useMemo(() => {
    const q = query.trim().toLowerCase();
    return assets.filter((a) => {
      if (category !== "all") {
        const catType = mapCategoryToType(category as any);
        if (a.type !== catType) return false;
      }
      if (!q) return true;
      return (
        a.name.toLowerCase().includes(q) || a.path.toLowerCase().includes(q)
      );
    });
  }, [assets, category, query]);

  const handleQueryChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setQuery(e.target.value);
    },
    [],
  );

  const handleCategoryChange = useCallback(
    (cat: "all" | "pantins" | "objets" | "decors") => {
      setCategory(cat);
    },
    [],
  );

  return (
    <FloatingPanel
      title="Library"
      initialPosition={{ x: 20, y: 100 }}
      width={300}
      height={400}
      storageKey="pos:panel:library"
      onClose={() => setShowLibrary(false)}
    >
      <div className="library-content">
        <div className="library-search">
          <input
            type="text"
            placeholder="Rechercher..."
            value={query}
            onChange={handleQueryChange}
          />
        </div>
        <div className="library-categories">
          <button
            className={`category-btn ${category === "all" ? "active" : ""}`}
            onClick={() => handleCategoryChange("all")}
          >
            Tous
          </button>
          <button
            className={`category-btn ${category === "pantins" ? "active" : ""}`}
            onClick={() => handleCategoryChange("pantins")}
          >
            Pantins
          </button>
          <button
            className={`category-btn ${category === "objets" ? "active" : ""}`}
            onClick={() => handleCategoryChange("objets")}
          >
            Objets
          </button>
          <button
            className={`category-btn ${category === "decors" ? "active" : ""}`}
            onClick={() => handleCategoryChange("decors")}
          >
            Décors
          </button>
        </div>
        <div className="library-assets">
          {filteredAssets.map((asset) => (
            <AssetItem key={`${asset.path}`} asset={asset} />
          ))}
        </div>
      </div>
    </FloatingPanel>
  );
});
