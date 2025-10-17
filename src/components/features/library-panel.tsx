import { useCallback, useEffect, useMemo, useState } from "react";

import { Asset, AssetItem } from "../AssetItem";
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
    <Tabs value={category} onValueChange={handleCategoryChange} className="flex h-full flex-col">
      <TabsList className="w-full shrink-0">
        {CATEGORY_TABS.map(({ value, label, icon: Icon }) => (
          <TabsTrigger
            key={value}
            value={value}
            className="justify-center"
            title={label}
          >
            <Icon className="h-4 w-4" aria-hidden />
          </TabsTrigger>
        ))}
      </TabsList>
      {CATEGORY_TABS.map(({ value }) => (
        <TabsContent key={value} value={value} className="mt-3 flex-1 overflow-hidden">
          <div className="h-full overflow-y-auto">
            <div className="grid grid-cols-2 gap-2">
              {assetsByCategory[value].map((asset) => (
                <AssetItem key={asset.path} asset={asset} />
              ))}
            </div>
          </div>
        </TabsContent>
      ))}
    </Tabs>
  );
}
