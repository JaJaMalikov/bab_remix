import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("react-dom/client", () => ({
  createRoot: vi.fn(() => ({ render: vi.fn() })),
}));

describe("main entrypoint", () => {
  beforeEach(() => {
    vi.resetModules();
    document.body.innerHTML = "";
  });

  it("initialise l'application quand le conteneur existe", async () => {
    const container = document.createElement("div");
    container.id = "app";
    document.body.appendChild(container);

    const client = await import("react-dom/client");
    const renderMock = vi.fn();
    (client.createRoot as ReturnType<typeof vi.fn>).mockReturnValue({
      render: renderMock,
    });

    await import("../src/main");

    expect(client.createRoot).toHaveBeenCalledWith(container);
    expect(renderMock).toHaveBeenCalledTimes(1);
  });

  it("lance une erreur si le conteneur est introuvable", async () => {
    const client = await import("react-dom/client");
    (client.createRoot as ReturnType<typeof vi.fn>).mockClear();

    await expect(import("../src/main")).rejects.toThrow("Root element not found");
    expect(client.createRoot).not.toHaveBeenCalled();
  });
});
