export function isPdf(mime: string) {
  return mime === "application/pdf";
}
export function isImage(mime: string) {
  return mime.startsWith("image/");
}
export function normalizeText(s: string) {
  return (s || "").replace(/\s+/g, " ").trim();
}