export function detectLanguage(request: Request): "AR" | "EN" {
  const path = new URL(request.url).pathname;
  if (path === "/ar" || path.startsWith("/ar/")) return "AR";
  const cookie = request.headers.get("Cookie")?.match(/(?:^|;\s*)lang=([a-z]{2})/)?.[1];
  return cookie === "ar" ? "AR" : "EN";
}
