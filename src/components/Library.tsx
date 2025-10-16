import { memo, useCallback, useEffect, useMemo, useState } from "react";
import {
  BackpackIcon,
  ImageIcon,
  PersonIcon,
} from "@radix-ui/react-icons";
import { FloatingPanel } from "./FloatingPanel";
import { AssetItem, Asset } from "./AssetItem";
import { useUi } from "../context/UiContext";
import { Input } from "./ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { ScrollArea } from "./ui/scroll-area";

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
  const [searchTerm, setSearchTerm] = useState("");

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

  const normalizedQuery = searchTerm.trim().toLowerCase();

  const assetsByCategory = useMemo<Record<CategoryValue, Asset[]>>(() => {
    const grouped = {
      pantins: assets.filter((a) => a.type === "pantin"),
      objets: assets.filter((a) => a.type === "objet"),
      decors: assets.filter((a) => a.type === "decor"),
    } as const;

    if (!normalizedQuery) {
      return grouped;
    }

    const filterByQuery = (items: Asset[]) =>
      items.filter((asset) =>
        asset.name.toLowerCase().includes(normalizedQuery),
      );

    return {
      pantins: filterByQuery(grouped.pantins),
      objets: filterByQuery(grouped.objets),
      decors: filterByQuery(grouped.decors),
    };
  }, [assets, normalizedQuery]);

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
      <div className="flex h-full flex-col gap-4">
        <div className="rounded-xl border border-border/60 bg-background/40 p-3 shadow-inner">
          <Input
            type="search"
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder="Rechercher..."
            aria-label="Rechercher dans la bibliothèque"
          />
        </div>
        <Tabs
          value={category}
          onValueChange={handleCategoryChange}
          className="flex flex-1 flex-col overflow-hidden"
        >
          <TabsList className="grid grid-cols-3 gap-2 rounded-xl border border-border/60 bg-muted/60 p-1">
            {CATEGORY_TABS.map(({ value, label, Icon }) => (
              <TabsTrigger
                key={value}
                value={value}
                className="data-[state=active]:border data-[state=active]:border-border/80"
              >
                <Icon aria-hidden className="h-4 w-4" />
                <span className="text-xs font-semibold uppercase tracking-wide">
                  {label}
                </span>
              </TabsTrigger>
            ))}
          </TabsList>
          {CATEGORY_TABS.map(({ value }) => (
            <TabsContent
              key={value}
              value={value}
              forceMount
              className="mt-4 flex-1 overflow-hidden rounded-xl border border-border/60 bg-background/50 p-0"
            >
              <ScrollArea className="h-full">
                <div className="grid grid-cols-2 gap-3 p-3 pr-4 sm:grid-cols-3">
                  {assetsByCategory[value].map((asset) => (
                    <AssetItem key={`${asset.path}`} asset={asset} />
                  ))}
                </div>
              </ScrollArea>
            </TabsContent>
          ))}
        </Tabs>
      </div>
    </FloatingPanel>
  );
});
