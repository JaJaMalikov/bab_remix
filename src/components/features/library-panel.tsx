import { useCallback, useEffect, useMemo, useState } from "react";

import { Asset, AssetItem } from "../AssetItem";
import { ScrollArea } from "../ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";
import { Icons } from "../ui/icons";

const CATEGORY_TABS = [
  { value: "pantins", label: "Pantins", icon: Icons.puppet },
  { value: "objets", label: "Objets", icon: Icons.library },
  { value: "decors", label: "Décors", icon: Icons.decor },
] as const;

type CategoryValue = (typeof CATEGORY_TABS)[number]["value"];

type ManifestEntry = {
  name: string;
  path: string;
  category: CategoryValue;
};

const mapCategoryToType = (category: CategoryValue): Asset["type"] => {
  if (category === "pantins") return "pantin";
  if (category === "objets") return "objet";
  return "decor";
};

export function LibraryPanel() {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [category, setCategory] = useState<CategoryValue>("pantins");

  useEffect(() => {
    let cancelled = false;

    const loadAssets = async () => {
      try {
        const response = await fetch("/assets/assets-manifest.json");
        const manifest: ManifestEntry[] = await response.json();
        if (cancelled) {
          return;
        }

        const mapped = manifest.map<Asset>((entry) => ({
          name: entry.name,
          type: mapCategoryToType(entry.category),
          path: `/assets/${entry.path}`,
        }));
        setAssets(mapped);
      } catch (error) {
        console.error("Failed to load assets-manifest.json", error);
      }
    };

    void loadAssets();
    return () => {
      cancelled = true;
    };
  }, []);

  const assetsByCategory = useMemo(
    () => ({
      pantins: assets.filter((asset) => asset.type === "pantin"),
      objets: assets.filter((asset) => asset.type === "objet"),
      decors: assets.filter((asset) => asset.type === "decor"),
    }),
    [assets],
  );

  const handleCategoryChange = useCallback((next: string) => {
    setCategory(next as CategoryValue);
  }, []);

  return (
    <div className="flex h-full flex-col gap-3">
      <Tabs value={category} onValueChange={handleCategoryChange}>
        <TabsList className="w-full">
          {CATEGORY_TABS.map(({ value, label, icon: Icon }) => (
            <TabsTrigger
              key={value}
              value={value}
              className="justify-start"
            >
              <Icon className="h-4 w-4" aria-hidden />
              {label}
            </TabsTrigger>
          ))}
        </TabsList>
        {CATEGORY_TABS.map(({ value }) => (
          <TabsContent key={value} value={value} className="mt-0 flex-1">
            <ScrollArea className="h-full">
              <div className="grid grid-cols-[repeat(auto-fill,minmax(128px,1fr))] gap-3">
                {assetsByCategory[value].map((asset) => (
                  <AssetItem key={asset.path} asset={asset} />
                ))}
              </div>
            </ScrollArea>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
