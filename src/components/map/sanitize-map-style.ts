import type { FilterSpecification, StyleSpecification } from "maplibre-gl";

const NUMERIC_COMPARISON_OPS = new Set(["<", ">", "<=", ">="]);

function isExpression(value: unknown): value is unknown[] {
  return Array.isArray(value) && typeof value[0] === "string";
}

function usesFeatureData(value: unknown): boolean {
  if (!isExpression(value)) {
    return false;
  }

  if (value[0] === "get" || value[0] === "feature-state") {
    return true;
  }

  return value.some((item, index) => index > 0 && usesFeatureData(item));
}

function sanitizeExpression(value: unknown): unknown {
  if (!isExpression(value)) {
    return value;
  }

  const sanitized: unknown[] = [value[0], ...value.slice(1).map(sanitizeExpression)];
  const op = sanitized[0];

  if (
    typeof op !== "string" ||
    !NUMERIC_COMPARISON_OPS.has(op) ||
    sanitized.length !== 3
  ) {
    return sanitized;
  }

  const left = sanitized[1];
  const right = sanitized[2];

  if (!usesFeatureData(left) && !usesFeatureData(right)) {
    return sanitized;
  }

  const typeChecks: unknown[] = [];
  if (typeof left !== "number") {
    typeChecks.push(["==", ["typeof", left], "number"]);
  }
  if (typeof right !== "number") {
    typeChecks.push(["==", ["typeof", right], "number"]);
  }

  if (typeChecks.length === 0) {
    return sanitized;
  }

  return ["all", ...typeChecks, sanitized];
}

/** Skip numeric filter comparisons when the tile property is null (OpenFreeMap Liberty). */
export function sanitizeMapStyle(style: StyleSpecification): StyleSpecification {
  return {
    ...style,
    layers: style.layers.map((layer) => {
      if (!("filter" in layer) || layer.filter == null) {
        return layer;
      }

      return {
        ...layer,
        filter: sanitizeExpression(layer.filter) as FilterSpecification,
      };
    }),
  };
}
