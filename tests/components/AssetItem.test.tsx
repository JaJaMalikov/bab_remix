import { render, screen, fireEvent, act } from "@testing-library/react";
import { AssetItem, Asset } from "../../src/components/AssetItem";
import { resetUiState, useUi } from "../../src/context/UiContext";
import { vi } from "vitest";

describe("AssetItem", () => {
  const importAsset = vi.fn();

  const asset: Asset = {
    name: "Test Asset",
    type: "objet",
    path: "/path/to/asset.svg",
  };

  beforeEach(() => {
    act(() => {
      resetUiState();
      useUi.setState({ importAsset });
    });
  });

  afterEach(() => {
    act(() => {
      resetUiState();
    });
    importAsset.mockReset();
  });

  it("should render the asset information", () => {
    render(<AssetItem asset={asset} />);
    expect(screen.getByText("Test Asset")).toBeInTheDocument();
    expect(screen.getByAltText("Test Asset")).toHaveAttribute(
      "src",
      "/path/to/asset.svg",
    );
  });

  it("should call importAsset on double-click", () => {
    render(<AssetItem asset={asset} />);
    fireEvent.doubleClick(screen.getByText("Test Asset"));
    expect(importAsset).toHaveBeenCalledWith(asset);
  });

  it("should set dataTransfer on drag start", () => {
    const setData = vi.fn();
    const mockEvent = {
      dataTransfer: {
        setData,
        effectAllowed: "" as any,
      },
    };

    render(<AssetItem asset={asset} />);
    fireEvent.dragStart(screen.getByText("Test Asset"), mockEvent as any);

    expect(setData).toHaveBeenCalledWith(
      "application/json",
      JSON.stringify(asset),
    );
    expect(mockEvent.dataTransfer.effectAllowed).toBe("copy");
  });
});
