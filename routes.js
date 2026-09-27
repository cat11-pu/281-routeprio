// routes.js：模式切段与匹配判定（斜杠分段，模式段可为 *）
export function segmentsOf(pattern) {
  return String(pattern).split("/").filter(function (part) {
    return part.length > 0;
  });
}

export function matches(pattern, path) {
  const want = segmentsOf(pattern);
  const got = segmentsOf(path);
  if (want.length !== got.length) return false;
  return want.every(function (part, index) {
    return part === "*" || part === got[index];
  });
}
