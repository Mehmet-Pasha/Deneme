import type { TrackKind } from "./types";

const COLOR: Record<string, string> = { a: "Al", d: "Doru", k: "Kır", y: "Yağız", g: "Gri", s: "Siyah" };
const SEX: Record<string, string> = { k: "Kısrak", a: "Aygır", d: "Dişi Tay", e: "Erkek Tay", g: "İğdiş" };

export function parseAgeText(yas: string): { age: string; color: string; sex: string; label: string } {
  const compact = (yas || "").replaceAll("&nbsp;", " ").replace(/\s+/g, " ").trim();
  const m = compact.match(/(\d+)\s*y\s*([a-zçğıöşü]+)?\s*([a-zçğıöşü]+)?/i);
  if (!m) return { age: compact, color: "", sex: "", label: compact };
  const age = m[1] ?? "";
  const color = COLOR[(m[2] ?? "").toLowerCase()] ?? (m[2] ?? "");
  const sex = SEX[(m[3] ?? "").toLowerCase()] ?? (m[3] ?? "");
  const label = [age ? `${age} yaş` : "", color, sex].filter(Boolean).join(" · ");
  return { age, color, sex, label: label || compact };
}

export function trackLabel(kind: TrackKind, fallback = ""): string {
  if (kind === "cim") return "Çim";
  if (kind === "kum") return "Kum";
  if (kind === "sentetik") return "Sentetik";
  return fallback || "Pist";
}

export function positionTone(pos: string): "win" | "place" | "show" | "out" | "none" {
  const n = Number.parseInt(pos, 10);
  if (!Number.isFinite(n) || n <= 0) return pos ? "out" : "none";
  if (n === 1) return "win";
  if (n === 2) return "place";
  if (n === 3) return "show";
  return "out";
}
