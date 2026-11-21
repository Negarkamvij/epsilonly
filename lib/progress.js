export function matchRate(answered, matched) {
  return answered > 0 ? Math.round(matched / answered * 100) : null;
}
export function formatDate(value) {
  return new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeZone: "UTC" }).format(new Date(value));
}
