export interface DiscoveredField {
  path: string;
  type: string;
  example?: string;
}

function inferType(value: unknown): string {
  if (value === null) return "null";
  if (Array.isArray(value)) return "array";
  const t = typeof value;
  if (t === "object") return "object";
  if (t === "number") return Number.isInteger(value as number) ? "integer" : "number";
  return t;
}

export function extractFields(
  value: unknown,
  basePath = ""
): DiscoveredField[] {
  const fields: DiscoveredField[] = [];

  function walk(node: unknown, path: string) {
    const nodeType = inferType(node);

    if (nodeType === "array") {
      fields.push({ path, type: "array" });
      const arr = node as unknown[];
      if (arr.length > 0) {
        walk(arr[0], path ? `${path}[]` : "[]");
      }
      return;
    }

    if (nodeType === "object" && node && !Array.isArray(node)) {
      const obj = node as Record<string, unknown>;
      if (path) {
        fields.push({ path, type: "object" });
      }
      for (const [key, val] of Object.entries(obj)) {
        const childPath = path ? `${path}.${key}` : key;
        walk(val, childPath);
      }
      return;
    }

    // Primitive / null
    fields.push({
      path,
      type: nodeType,
      example:
        node === null || node === undefined
          ? undefined
          : String(node).slice(0, 80),
    });
  }

  walk(value, basePath || "$");

  // Remove duplicates (can happen for objects)
  const seen = new Set<string>();
  const deduped: DiscoveredField[] = [];
  for (const f of fields) {
    if (!seen.has(f.path)) {
      seen.add(f.path);
      deduped.push(f);
    }
  }

  return deduped;
}

