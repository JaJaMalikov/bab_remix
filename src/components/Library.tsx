import { memo, useCallback, useEffect, useMemo, useState } from "react";
import * as Tabs from "@radix-ui/react-tabs";
import * as ScrollArea from "@radix-ui/react-scroll-area";
import {
  BackpackIcon,
  ImageIcon,
  PersonIcon,
} from "@radix-ui/react-icons";
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

type CategoryValue = ManifestEntry["category"];

const CATEGORY_TABS: Array<{
  value: CategoryValue;
  label: string;
  Icon: typeof PersonIcon;
}> = [
  { value: "pantins", label: "Pantins", Icon: PersonIcon },
  { value: "objets", label: "Objets", Icon: BackpackIcon },
  { value: "decors", label: "Décors", Icon: ImageIcon },
];

export const Library = memo(() => {
  const { setShowLibrary } = useUi();
  const [assets, setAssets] = useState<Asset[]>([]);
  const [category, setCategory] = useState<CategoryValue>("pantins");

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

  const assetsByCategory = useMemo<Record<CategoryValue, Asset[]>>(
    () => ({
      pantins: assets.filter((a) => a.type === "pantin"),
      objets: assets.filter((a) => a.type === "objet"),
      decors: assets.filter((a) => a.type === "decor"),
    }),
    [assets],
  );

  const handleCategoryChange = useCallback(
    (value: string) => {
      setCategory(value as CategoryValue);
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
        <Tabs.Root
          value={category}
          onValueChange={handleCategoryChange}
          className="library-tabs"
        >
          <Tabs.List className="library-categories">
            {CATEGORY_TABS.map(({ value, label, Icon }) => (
              <Tabs.Trigger
                key={value}
                value={value}
                className="category-btn"
                aria-label={label}
                title={label}
              >
                <Icon aria-hidden />
              </Tabs.Trigger>
            ))}
          </Tabs.List>
          {CATEGORY_TABS.map(({ value }) => (
            <Tabs.Content key={value} value={value}>
              <ScrollArea.Root className="library-scroll-area">
                <ScrollArea.Viewport className="library-assets">
                  {assetsByCategory[value].map((asset) => (
                    <AssetItem key={`${asset.path}`} asset={asset} />
                  ))}
                </ScrollArea.Viewport>
                <ScrollArea.Scrollbar
                  className="scrollbar"
                  orientation="vertical"
                >
                  <ScrollArea.Thumb className="scrollbar-thumb" />
                </ScrollArea.Scrollbar>
                <ScrollArea.Corner className="scrollbar-corner" />
              </ScrollArea.Root>
            </Tabs.Content>
          ))}
        </Tabs.Root>
      </div>
    </FloatingPanel>
  );
});
