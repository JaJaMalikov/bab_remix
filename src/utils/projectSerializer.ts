import { AnimationTrack } from "../context/AnimationContext";
import { parseTransformAttribute } from "./svgTransform";

const parseNumber = (value: string | null, fallback = 0) => {
  if (value === null) return fallback;
  const parsed = parseFloat(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const parseAnchorTranslation = (anchor: SVGGElement | null) => {
  if (!anchor) return { tx: 0, ty: 0 };
  const { translate } = parseTransformAttribute(anchor);
  return {
    tx: translate?.x ?? 0,
    ty: translate?.y ?? 0,
  };
};

const findAnchorById = (svg: SVGSVGElement | null, puppetId: string | null) => {
  if (!svg || !puppetId) return null;
  return svg.querySelector(
    `[data-anchor="puppet"][data-id="${CSS.escape(puppetId)}"]`,
  ) as SVGGElement | null;
};

export interface ProjectData {
  version: string;
  scene: {
    background: string | null;
    items: Array<{
      id: string;
      type: "puppet" | "image";
      label: string;
      source: string; // path to asset
      transform: {
        x: number;
        y: number;
        rotation?: number;
        scaleX?: number;
        scaleY?: number;
      };
      // For puppets: member rotations
      memberTransforms?: Record<string, { rotation: number }>;
    }>;
  };
  animation: {
    duration: number;
    tracks: AnimationTrack[];
  };
}

/**
 * Serialize current project state to JSON
 */
export function serializeProject(params: {
  sceneItems: Array<{
    id: string;
    type: "puppet" | "image";
    label: string;
    el: Element;
  }>;
  tracks: AnimationTrack[];
  duration: number;
  background: string | null;
}): ProjectData {
  const { sceneItems, tracks, duration, background } = params;

  const items = sceneItems.map((item) => {
    const el = item.el;
    const transform: ProjectData["scene"]["items"][0]["transform"] = {
      x: 0,
      y: 0,
    };
    let source = "";
    let memberTransforms: Record<string, { rotation: number }> | undefined;

    if (item.type === "puppet") {
      // Get puppet position from transform attribute
      const { translate } = parseTransformAttribute(el);
      if (translate) {
        transform.x = translate.x;
        transform.y = translate.y;
      }

      // Get source from first child (the puppet SVG element)
      const anchor = el;
      const puppetRoot = anchor.firstChild as SVGGElement | null;
      if (puppetRoot) {
        // Find the source by looking at stored data or reconstruct from DOM
        // For now, we'll store it in a data attribute when dropping
        source = el.getAttribute("data-source") || "";

        // Get all member rotations
        memberTransforms = {};
        const members = puppetRoot.querySelectorAll("[data-membre]");
        members.forEach((member) => {
          const memberId = member.id;
          const memberEl = member as SVGGElement;
          const transformStyle = memberEl.style.transform || "";
          const rotMatch = transformStyle.match(/rotate\(([-\d.]+)deg\)/);
          if (rotMatch && memberId) {
            memberTransforms![memberId] = {
              rotation: parseFloat(rotMatch[1] || "0"),
            };
          }
        });
      }
    } else {
      // Image
      const graphicEl = el as SVGGraphicsElement;
      const localX = parseNumber(graphicEl.getAttribute("x"));
      const localY = parseNumber(graphicEl.getAttribute("y"));
      let sceneX = localX;
      let sceneY = localY;

      if (graphicEl.getAttribute("data-attached-mode") === "embedded") {
        const anchor = findAnchorById(
          graphicEl.ownerSVGElement,
          graphicEl.getAttribute("data-attached-to-puppet"),
        );
        const { tx, ty } = parseAnchorTranslation(anchor);
        sceneX = localX + tx;
        sceneY = localY + ty;
      }

      transform.x = sceneX;
      transform.y = sceneY;

      const { rotate, scale } = parseTransformAttribute(graphicEl);
      if (rotate !== null) {
        transform.rotation = rotate;
      }
      if (scale) {
        transform.scaleX = scale.x;
        transform.scaleY = scale.y;
      }

      source = el.getAttribute("data-source") || el.getAttribute("href") || "";
    }

    return {
      id: item.id,
      type: item.type,
      label: item.label,
      source,
      transform,
      memberTransforms,
    };
  });

  return {
    version: "0.1.0",
    scene: {
      background,
      items,
    },
    animation: {
      duration,
      tracks,
    },
  };
}

/**
 * Save project to file (download as JSON)
 */
export function saveProjectToFile(
  projectData: ProjectData,
  filename: string = "animation.bab.json",
) {
  const json = JSON.stringify(projectData, null, 2);
  const blob = new Blob([json], { type: "application/json" });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Load project from file
 */
export function loadProjectFromFile(): Promise<ProjectData> {
  return new Promise((resolve, reject) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".json,.bab.json";

    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) {
        reject(new Error("No file selected"));
        return;
      }

      try {
        const text = await file.text();
        const data = JSON.parse(text) as ProjectData;

        // Basic validation
        if (!data.version || !data.scene || !data.animation) {
          throw new Error("Invalid project file format");
        }

        resolve(data);
      } catch (error) {
        reject(error);
      }
    };

    input.click();
  });
}
