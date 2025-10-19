import { act } from "@testing-library/react";
import { describe, it, beforeEach, expect } from "vitest";

import {
  resetUiState,
  useUi,
  type SceneItem,
} from "../../src/context/UiContext";

const createSceneElement = () =>
  document.createElementNS("http://www.w3.org/2000/svg", "g");

const createItem = (overrides: Partial<SceneItem> = {}): SceneItem => ({
  id: `item-${Math.random().toString(36).slice(2)}`,
  type: "puppet",
  label: "Pantin",
  el: createSceneElement(),
  ...overrides,
});

describe("UiContext store helpers", () => {
  beforeEach(() => {
    act(() => resetUiState());
  });

  it("ajoute des éléments avec un libellé unique", () => {
    const first = createItem({ id: "item-1", label: "Puppet" });
    const second = createItem({ id: "item-2", label: "Puppet" });

    act(() => {
      const store = useUi.getState();
      store.addSceneItem(first);
      store.addSceneItem(second);
    });

    const { sceneItems } = useUi.getState();
    expect(sceneItems).toHaveLength(2);
    expect(sceneItems[0]?.label).toBe("Puppet");
    expect(sceneItems[1]?.label).toBe("Puppet (2)");
  });

  it("supprime les éléments de la scène", () => {
    const first = createItem({ id: "item-1" });
    const second = createItem({ id: "item-2" });

    act(() => {
      const store = useUi.getState();
      store.addSceneItem(first);
      store.addSceneItem(second);
      store.setSelectedItemId("item-2");
    });

    act(() => {
      useUi.getState().removeSceneItem("item-2");
    });

    const { sceneItems, selectedItemId } = useUi.getState();
    expect(sceneItems).toHaveLength(1);
    expect(sceneItems[0]?.id).toBe("item-1");
    expect(selectedItemId).toBe("item-2");
  });

  it("réordonne les éléments vers l'avant et synchronise le DOM", () => {
    const container = createSceneElement();
    const first = createItem({ id: "item-1", el: createSceneElement() });
    const second = createItem({ id: "item-2", el: createSceneElement() });

    container.appendChild(first.el);
    container.appendChild(second.el);

    act(() => {
      const store = useUi.getState();
      store.addSceneItem(first);
      store.addSceneItem(second);
      store.bringForward("item-1");
    });

    const { sceneItems } = useUi.getState();
    expect(sceneItems[0]?.id).toBe("item-2");
    expect(sceneItems[1]?.id).toBe("item-1");
    expect(container.children[1]).toBe(first.el);
  });

  it("réordonne les éléments vers l'arrière", () => {
    const container = createSceneElement();
    const first = createItem({ id: "item-1", el: createSceneElement() });
    const second = createItem({ id: "item-2", el: createSceneElement() });

    container.appendChild(first.el);
    container.appendChild(second.el);

    act(() => {
      const store = useUi.getState();
      store.addSceneItem(first);
      store.addSceneItem(second);
      store.sendBackward("item-2");
    });

    const { sceneItems } = useUi.getState();
    expect(sceneItems[0]?.id).toBe("item-2");
    expect(sceneItems[1]?.id).toBe("item-1");
    expect(container.children[0]).toBe(second.el);
  });

  it("enregistre et remplace fitInView uniquement si la référence change", () => {
    const firstFn = () => {};
    const secondFn = () => {};

    act(() => {
      useUi.getState().setFitInView(firstFn);
      useUi.getState().setFitInView(firstFn);
    });
    expect(useUi.getState().fitInView).toBe(firstFn);

    act(() => {
      useUi.getState().setFitInView(secondFn);
    });
    expect(useUi.getState().fitInView).toBe(secondFn);
  });
});
