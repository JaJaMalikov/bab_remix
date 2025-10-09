import { readdirSync, writeFileSync, statSync, readFileSync, existsSync } from "fs";
import { join, relative, extname, basename } from "path";
import { DOMParser } from "@xmldom/xmldom";

const ASSETS_DIR = "./public/assets";
const OUTPUT_FILE = "./public/assets/assets-manifest.json";
const PANTINS_DIR = join(ASSETS_DIR, "pantins");

function scanDir(dir) {
  const entries = readdirSync(dir);
  let results = [];

  for (const entry of entries) {
    const fullPath = join(dir, entry);
    const stats = statSync(fullPath);

    if (stats.isDirectory()) {
      results = results.concat(scanDir(fullPath));
    } else {
      if (extname(fullPath).toLowerCase() === ".json") continue;

      const relativePath = relative(ASSETS_DIR, fullPath);
      const [category, filename] = relativePath.split(/[\\/]/);
      const name = filename.replace(/\.[^.]+$/, "");

      results.push({
        name: capitalize(name.replace(/_/g, " ")),
        path: `${relativePath.replace(/\\/g, "/")}`,
        category,
      });
    }
  }

  return results;
}

function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

function generatePantinMetadata() {
  if (!existsSync(PANTINS_DIR)) return [];

  const reports = [];
  const entries = readdirSync(PANTINS_DIR);

  for (const entry of entries) {
    const fullPath = join(PANTINS_DIR, entry);
    const stats = statSync(fullPath);
    if (!stats.isFile() || extname(fullPath).toLowerCase() !== ".svg") {
      continue;
    }

    try {
      const metadata = parsePantinFile(fullPath);
      const outputPath = fullPath.replace(/\.svg$/i, ".json");
      writeFileSync(outputPath, `${JSON.stringify(metadata, null, 2)}\n`);
      reports.push({
        input: fullPath,
        output: outputPath,
        members: metadata.members.length,
        variants: metadata.variantGroups.length,
      });
    } catch (error) {
      console.error(`❌ Erreur lors du parsing du pantin ${entry}:`, error);
    }
  }

  return reports;
}

function parsePantinFile(filePath) {
  const svgText = readFileSync(filePath, "utf-8");
  const parser = new DOMParser();
  const doc = parser.parseFromString(svgText, "image/svg+xml");
  const svgRoot = doc.documentElement;

  const members = [];
  const memberMap = new Map();
  const variantGroups = new Map();
  const variantOwners = new Map();

  const walk = (node, currentMemberId) => {
    if (!node || node.nodeType !== 1) return;
    const element = node;
    const idAttr = element.getAttribute("id");
    const membreAttr = element.getAttribute("data-membre");

    let localMemberId = currentMemberId;

    if (membreAttr && idAttr) {
      const parentId = currentMemberId ?? null;
      const member = {
        id: idAttr,
        name: membreAttr,
        parentId,
        children: [],
        pivot: parsePivot(element.getAttribute("data-pivot")),
        interactive: parseBoolean(element.getAttribute("data-interactive")),
        draggable: parseBoolean(element.getAttribute("data-draggable")),
        isBehindParent: parseBoolean(element.getAttribute("data-isbehindparent")),
        side: element.getAttribute("data-side") || null,
        variantGroup: element.getAttribute("data-variant-groupe") || null,
        variantName: element.getAttribute("data-variant-name") || null,
        variantDefault: parseBoolean(element.getAttribute("data-variant-default")),
      };
      members.push(member);
      memberMap.set(idAttr, member);
      if (parentId) {
        const parent = memberMap.get(parentId);
        if (parent) parent.children.push(idAttr);
      }
      if (member.variantGroup) {
        variantOwners.set(member.variantGroup, idAttr);
      }
      localMemberId = idAttr;
    }

    const variantGroupAttr = element.getAttribute("data-variant-groupe");
    if (variantGroupAttr) {
      const group = variantGroups.get(variantGroupAttr) ?? {
        group: variantGroupAttr,
        defaultVariantId: null,
        variants: [],
      };
      const ownerId = variantOwners.get(variantGroupAttr) ?? null;
      const variant = {
        id: idAttr || null,
        targetMemberId: localMemberId ?? currentMemberId ?? ownerId,
        memberId: membreAttr && idAttr ? idAttr : null,
        name: element.getAttribute("data-variant-name") || null,
        isDefault: parseBoolean(element.getAttribute("data-variant-default")),
        isBehindParent: parseBoolean(element.getAttribute("data-isbehindparent")),
        side: element.getAttribute("data-side") || null,
      };
      group.variants.push(variant);
      if (variant.isDefault && !group.defaultVariantId) {
        group.defaultVariantId =
          variant.id ?? variant.memberId ?? variant.targetMemberId ?? ownerId;
      }
      variantGroups.set(variantGroupAttr, group);
    }

    const children = getChildElements(element);
    for (const child of children) {
      walk(child, localMemberId);
    }
  };

  walk(svgRoot, null);

  const rootMember = members.find((member) => member.parentId === null) ?? members[0] ?? null;

  return {
    id: svgRoot.getAttribute("id") || basename(filePath, extname(filePath)),
    source: relative(ASSETS_DIR, filePath).replace(/\\/g, "/"),
    width: parseNumberAttribute(svgRoot.getAttribute("width")),
    height: parseNumberAttribute(svgRoot.getAttribute("height")),
    viewBox: svgRoot.getAttribute("viewBox") || null,
    rootMemberId: rootMember ? rootMember.id : null,
    members,
    variantGroups: Array.from(variantGroups.values()),
  };
}

function getChildElements(node) {
  const elements = [];
  const children = node.childNodes || [];
  for (let i = 0; i < children.length; i++) {
    const child = children.item(i);
    if (child && child.nodeType === 1) {
      elements.push(child);
    }
  }
  return elements;
}

function parseBoolean(value) {
  if (!value) return false;
  return value.toLowerCase() === "true";
}

function parseNumberAttribute(value) {
  if (!value) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function parsePivot(value) {
  if (!value) return null;
  const [xStr, yStr] = value.split(",");
  const x = parseFloat((xStr || "").trim());
  const y = parseFloat((yStr || "").trim());
  if (!Number.isFinite(x) || !Number.isFinite(y)) return null;
  return { x, y };
}

const manifest = scanDir(ASSETS_DIR);
writeFileSync(OUTPUT_FILE, `${JSON.stringify(manifest, null, 2)}\n`);
console.log(`✅ Manifest généré : ${OUTPUT_FILE} (${manifest.length} fichiers trouvés)`);

const pantinReports = generatePantinMetadata();
for (const report of pantinReports) {
  console.log(
    `✅ Metadata pantin générée : ${report.output} (${report.members} membres, ${report.variants} groupes de variantes)`
  );
}
