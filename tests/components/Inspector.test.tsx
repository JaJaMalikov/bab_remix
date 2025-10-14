import { render, screen, within } from "../test-utils";
import { Inspector } from "../../src/components/Inspector";
import { vi } from "vitest";

// Mock FloatingPanel to simplify the test
vi.mock("../../src/components/FloatingPanel", () => ({
  FloatingPanel: ({ title, children }: { title: string; children: React.ReactNode; }) => (
    <div data-testid="floating-panel">
      <h1>{title}</h1>
      {children}
    </div>
  ),
}));

describe("Inspector", () => {
  const testSceneItems = [
    {
      id: "1",
      type: "puppet" as const,
      label: "Puppet 1",
      el: document.createElementNS("http://www.w3.org/2000/svg", "g"),
    },
    {
      id: "2",
      type: "image" as const,
      label: "Image 1",
      el: document.createElementNS("http://www.w3.org/2000/svg", "image"),
    },
  ];

  it("should render the inspector with the correct title", () => {
    render(<Inspector />, {
      uiContextProps: { sceneItems: testSceneItems, selectedItemId: "1" },
    });
    expect(screen.getByTestId("floating-panel")).toBeInTheDocument();
    expect(screen.getByText("Inspector")).toBeInTheDocument();
  });

  it("should display the list of scene items", () => {
    render(<Inspector />, {
      uiContextProps: { sceneItems: testSceneItems, selectedItemId: "1" },
    });
    const sceneItemsList = screen.getByText(/Scene Items/).parentElement?.nextElementSibling;
    expect(sceneItemsList).toBeInTheDocument();
    if (sceneItemsList) {
        expect(within(sceneItemsList).getByRole("button", { name: /Puppet 1/ })).toBeInTheDocument();
        expect(within(sceneItemsList).getByRole("button", { name: /Image 1/ })).toBeInTheDocument();
    }
  });

  it("should display properties for the selected item", () => {
    render(<Inspector />, {
      uiContextProps: { sceneItems: testSceneItems, selectedItemId: "1" },
    });
    const propertiesGroup = screen.getByText("Properties").parentElement;
    expect(propertiesGroup).toBeInTheDocument();
    if (propertiesGroup) {
        expect(within(propertiesGroup).getByText("Name")).toBeInTheDocument();
        expect(within(propertiesGroup).getByText("Puppet 1")).toBeInTheDocument();
    }
  });
});