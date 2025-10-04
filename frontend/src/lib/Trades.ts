// Format name from "LAST FIRST MI" to "First Mi Last"
export function formatName(name: string): string {
    if (!name) return name;
    const parts = name.split(" ")
    if (parts.length < 2) return name;

    const last = parts[0];
    const first = parts[1];
    const middle = parts.slice(2).join(" ");

    const formatPart = (part: string) =>
      part.charAt(0).toUpperCase() + part.slice(1).toLowerCase();

    return middle
      ? `${formatPart(first)} ${formatPart(middle)} ${formatPart(last)}`
      : `${formatPart(first)} ${formatPart(last)}`;
}