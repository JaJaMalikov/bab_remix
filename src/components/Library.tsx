import { FloatingPanel } from "./FloatingPanel";

export interface Asset {
  name: string;
  type: "pantin" | "objet" | "decor";
  path: string;
}

export const Library = () => {
  const assets: Asset[] = [
    {
      name: "Pantin Manu",
      type: "pantin",
      path: "/assets/pantins/manu.svg",
    },
    {
      name: "Lunettes",
      type: "objet",
      path: "/assets/objets/lunettes_manu.svg",
    },
    { name: "Laurier", type: "objet", path: "/assets/objets/laurier.svg" },
    { name: "Faucille", type: "objet", path: "/assets/objets/faucille.svg" },
    { name: "Basse", type: "objet", path: "/assets/objets/basse.svg" },
    { name: "Marteau", type: "objet", path: "/assets/objets/marteau.svg" },
    { name: "Bureau", type: "decor", path: "/assets/decors/bureau.png" },
    // Keep list minimal and valid; remove missing entries
  ];

  const handleDragStart = (e: React.DragEvent, asset: Asset) => {
    console.log("Drag start:", asset);
    e.dataTransfer.setData("application/json", JSON.stringify(asset));
    e.dataTransfer.effectAllowed = "copy";
  };

  return (
    <FloatingPanel
      title="Library"
      initialPosition={{ x: 20, y: 100 }}
      width={280}
      height={500}
    >
      <div className="library-content">
        <div className="library-search">
          <input type="text" placeholder="Rechercher..." />
        </div>
        <div className="library-categories">
          <button className="category-btn active">Tous</button>
          <button className="category-btn">Pantins</button>
          <button className="category-btn">Objets</button>
          <button className="category-btn">Décors</button>
        </div>
        <div className="library-assets">
          {assets.map((asset, index) => (
            <div
              key={index}
              className="asset-item"
              draggable
              onDragStart={(e) => handleDragStart(e, asset)}
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
