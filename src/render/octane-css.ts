export function normalizeClass(value: unknown): string {
  if (typeof value === "string") return value;
  if (typeof value !== "object") {
    return typeof value === "number" && value ? String(value) : "";
  }
  if (value === null) return "";
  let result = "";
  if (Array.isArray(value)) {
    for (const item of value) {
      if (item) {
        const inner = normalizeClass(item);
        if (inner) result = result ? `${result} ${inner}` : inner;
      }
    }
  } else {
    for (const key in value) {
      if ((value as Record<string, unknown>)[key]) {
        result = result ? `${result} ${key}` : key;
      }
    }
  }
  return result;
}

const styleNameCache = new Map<string, string>();

export function styleName(name: string): string {
  const cached = styleNameCache.get(name);
  if (cached !== undefined) return cached;
  const result = hyphenateStyleName(name);
  styleNameCache.set(name, result);
  return result;
}

function hyphenateStyleName(name: string): string {
  if (name.charCodeAt(0) === 45) return name;
  let hasUpper = false;
  for (let index = 0; index < name.length; index++) {
    const code = name.charCodeAt(index);
    if (code >= 65 && code <= 90) {
      hasUpper = true;
      break;
    }
  }
  if (!hasUpper) return name;
  let result = "";
  for (let index = 0; index < name.length; index++) {
    const code = name.charCodeAt(index);
    result +=
      code >= 65 && code <= 90
        ? `-${String.fromCharCode(code + 32)}`
        : name[index];
  }
  if (result.startsWith("ms-")) {
    result = `-${result}`;
  }
  return result;
}
