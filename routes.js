// routes.js：段切分与匹配判定
export function segmentsOf(pattern) {
  return String(pattern).split("/").filter(function (part) { return part !== ""; });
}

export function matches(pattern, path) {
  const patternSegments = segmentsOf(pattern);
  const pathSegments = segmentsOf(path);
  if (patternSegments.length !== pathSegments.length) return false;
  return patternSegments.every(function (part, index) {
    return part === "*" || part === pathSegments[index];
  });
}
