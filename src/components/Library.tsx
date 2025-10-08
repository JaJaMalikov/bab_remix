import { useEffect, useMemo, useState } from "react";
import { useUi } from "../context/UiContext";
import { FloatingPanel } from "./FloatingPanel";

export interface Asset {
  name: string;
  type: "pantin" | "objet" | "decor";
  path: string;
}

type ManifestEntry = {
  name: string;
  path: string; // relative to /assets/
  category: "pantins" | "objets" | "decors";
};

const mapCategoryToType = (c: ManifestEntry["category"]): Asset["type"] =>
  c === "pantins" ? "pantin" : c === "objets" ? "objet" : "decor";

export const Library = () => {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [category, setCategory] = useState<"all" | "pantins" | "objets" | "decors">("all");
  const [query, setQuery] = useState("");
  const { importAsset } = useUi();

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

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return assets.filter((a) => {
      if (category !== "all") {
        const catType = mapCategoryToType(category as any);
        if (a.type !== catType) return false;
      }
      if (!q) return true;
      return a.name.toLowerCase().includes(q) || a.path.toLowerCase().includes(q);
    });
  }, [assets, category, query]);

  const handleDragStart = (e: React.DragEvent, asset: Asset) => {
    e.dataTransfer.setData("application/json", JSON.stringify(asset));
    e.dataTransfer.effectAllowed = "copy";
  };

  const catBtn = (key: "all" | "pantins" | "objets" | "decors", label: string) => (
    <button
      className={`category-btn ${category === key ? "active" : ""}`}
      onClick={() => setCategory(key)}
    >
      {label}
    </button>
  );

  return (
    <FloatingPanel
      title="Library"
      initialPosition={{ x: 20, y: 100 }}
      width={300}
      height={400}
      storageKey="pos:panel:library"
    >
      <div className="library-content">
        <div className="library-search">
          <input
            type="text"
            placeholder="Rechercher..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <div className="library-categories">
          {catBtn("all", "Tous")}
          {catBtn("pantins", "Pantins")}
          {catBtn("objets", "Objets")}
          {catBtn("decors", "Décors")}
        </div>
        <div className="library-assets">
          {filtered.map((asset, index) => (
            <div
              key={`${asset.type}-${asset.path}-${index}`}
              className="asset-item"
              draggable
              onDragStart={(e) => handleDragStart(e, asset)}
              onDoubleClick={() => importAsset?.(asset)}
            >
              <div className="asset-preview">
                <img src={asset.path} alt={asset.name} />
              </div>
              <div className="asset-name">{asset.name}</div>
              <div className="asset-type">{asset.type}</div>
            </div>
          ))}
        </div>
      </div>
    </FloatingPanel>
  );
};
