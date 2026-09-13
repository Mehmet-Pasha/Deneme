import type { DayCard, HorseProfile, JockeyProfile, PersonProfile, Region, SearchHit } from "./types";

async function getJson<T>(url: string): Promise<T> {
  const res = await fetch(url);
  const data = (await res.json()) as T;
  return data;
}

export function getDayCard(iso: string, region: Region | "all"): Promise<DayCard> {
  return getJson(`/api/gun/${iso}?bolge=${region}`);
}

export function getHorseProfile(id: string): Promise<HorseProfile> {
  return getJson(`/api/at/${encodeURIComponent(id)}`);
}

export function getJockeyProfile(id: string, name = ""): Promise<JockeyProfile> {
  const q = name ? `?ad=${encodeURIComponent(name)}` : "";
  return getJson(`/api/jokey/${encodeURIComponent(id)}${q}`);
}

export function getPersonProfile(kind: "antrenor" | "sahip", id: string): Promise<PersonProfile> {
  return getJson(`/api/kisi/${kind}/${encodeURIComponent(id)}`);
}

export function getVideoUrl(atId: string, kosuKod: string): Promise<{ url: string; page: string }> {
  return getJson(`/api/video/${encodeURIComponent(atId)}/${encodeURIComponent(kosuKod)}`);
}

export function searchRacing(q: string): Promise<SearchHit[]> {
  return getJson(`/api/ara?q=${encodeURIComponent(q)}`);
}
