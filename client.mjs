import fetch from "node-fetch";
import {
  isoToYmd,
  lastNIsoDates,
  isDomesticMeeting,
  prizeText,
  tjkHorseUrl,
  tjkJockeyUrl,
  tjkTrainerUrl,
  tjkOwnerUrl,
  tjkWatchUrl,
  trackKindOf,
  trackLabel,
} from "./format.mjs";
import { extractMp4, parseHorsePage, parseJockeyStats, parsePersonPage } from "./parseHtml.mjs";

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

const EBAYI = "https://ebayi.tjk.org/s/d";

// ---------- basit bellek içi cache ----------
const mem = new Map();
function cached(key, ttlMs, fn) {
  const hit = mem.get(key);
  if (hit && hit.exp > Date.now()) return Promise.resolve(hit.value);
  return fn().then((value) => {
    mem.set(key, { exp: Date.now() + ttlMs, value });
    return value;
  });
}

async function mapPool(items, limit, fn) {
  const out = new Array(items.length);
  let cursor = 0;
  async function worker() {
    while (cursor < items.length) {
      const idx = cursor++;
      out[idx] = await fn(items[idx]);
    }
  }
  const n = Math.min(Math.max(1, limit), items.length || 1);
  await Promise.all(Array.from({ length: n }, worker));
  return out;
}

async function fetchText(url, timeoutMs = 15000) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      signal: ctrl.signal,
      headers: {
        "User-Agent": UA,
        Accept: "text/html,application/json;q=0.9,*/*;q=0.8",
        "Accept-Language": "tr-TR,tr;q=0.9,en;q=0.8",
        Referer: "https://www.tjk.org/",
      },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status} — ${url}`);
    return await res.text();
  } finally {
    clearTimeout(t);
  }
}

async function fetchJson(url) {
  const text = await fetchText(url);
  return JSON.parse(text);
}

function str(v) {
  if (v == null || v === false) return "";
  return String(v);
}

function num(v) {
  if (v == null || v === false || v === "") return null;
  const n = typeof v === "number" ? v : Number.parseFloat(String(v).replace(",", "."));
  return Number.isFinite(n) ? n : null;
}

function weatherOf(h) {
  if (!h) return null;
  return {
    hippodrome: str(h.HIPODROMADI),
    city: str(h.HIPODROMYERI),
    night: Boolean(h.GECE),
    sky: str(h.HAVA_TR),
    temp: num(h.SICAKLIK),
    humidity: num(h.NEM),
    turf: str(h.CIM_TR),
    turfDepth: num(h.CIMPISTAGIRLIGI),
    dirt: str(h.KUM_TR),
    dirtDepth: num(h.KUMPISTAGIRLIGI),
  };
}

function mapHorse(raw) {
  const formRaw = raw.SON6_ARR;
  const form = Array.isArray(formRaw) ? formRaw.map((x) => str(x?.text)).filter(Boolean) : [];
  const taki = raw.TAKI_ARR;
  const equipment = Array.isArray(taki)
    ? taki.map((x) => ({ key: str(x?.key), description: str(x?.description) }))
    : [];
  return {
    id: str(raw.KOD),
    key: str(raw.KEY),
    name: str(raw.AD),
    number: str(raw.NO),
    stall: str(raw.START),
    ageText: str(raw.YAS),
    ageEn: str(raw.YAS_EN),
    kg: num(raw.KILO),
    extraKg: str(raw.FAZLAKILO),
    apprenticeDeduction: num(raw.APRANTIKILOINDIRIMI),
    hp: str(raw.HANDIKAP),
    kgs: str(raw.KGS),
    jockeyId: str(raw.JOKEYKODU),
    jockeyName: str(raw.JOKEYADI),
    trainerId: str(raw.ANTRENORKODU),
    trainerName: str(raw.ANTRENORADI),
    ownerId: str(raw.SAHIPKODU),
    ownerName: str(raw.SAHIPADI),
    sire: str(raw.BABA),
    sireId: str(raw.BABAKODU),
    dam: str(raw.ANNE),
    damId: str(raw.ANNEKODU),
    damsire: str(raw.ANNEBABA),
    breeder: str(raw.YETISTIRICIADI || raw.YETISTIRICI),
    silkUrl: str(raw.FORMA).replace(/^http:\/\//, "https://"),
    form,
    ganyan: str(raw.GANYAN),
    agf: str(raw.AGF1),
    agfRank: num(raw.AGFSIRA1),
    equipment,
    scratched: Boolean(raw.KOSMAZ),
    coupled: Boolean(raw.EKURI),
    bestTime: str(raw.ENIYIDERECE),
    position: str(raw.SONUC),
    time: str(raw.DERECE),
    margin: str(raw.FARK),
  };
}

function mapRace(raw) {
  const horses = (raw.atlar || []).map(mapHorse);
  const finished = horses.some((h) => h.position !== "");
  const pist = str(raw.PIST);
  const pistAdi = str(raw.PISTADI_TR);
  const track = trackKindOf(pist, pistAdi);
  const named = str(raw.ONEMLIKOSUADI_TR || raw.OZELADI);
  const video = str(raw.VIDEO || raw.emiVideoUrl).replace(/^http:\/\//, "https://");
  const photo = str(raw.FOTOFINISH || raw.emiFotoUrl).replace(/^http:\/\//, "https://");
  return {
    id: str(raw.KOD),
    no: str(raw.NO || raw.RACENO),
    time: str(raw.SAAT),
    date: str(raw.TARIH),
    distance: str(raw.MESAFE),
    track,
    trackLabel: pistAdi || trackLabel(track),
    group: str(raw.GRUP_TR),
    raceType: str(raw.CINSDETAY_TR),
    gender: str(raw.CINSIYET),
    info: str(raw.BILGI_TR),
    bets: str(raw.BAHISLER_TR || raw.emiParasalNeticeler_tr),
    prizes: Array.isArray(raw.ikramiyeler) ? raw.ikramiyeler.map((x) => prizeText(str(x))) : [],
    breedersPrizes: Array.isArray(raw.primler) ? raw.primler.map((x) => prizeText(str(x))) : [],
    bestTime: str(raw.ENIYIDERECE),
    bestTimeNote: str(raw.ENIYIDERECEACIKLAMA),
    named: named && named !== "false" ? named : "",
    last800: str(raw.SON800),
    videoUrl: video,
    photoUrl: photo,
    horses,
    finished,
  };
}

async function listMeetings(kind, ymd) {
  try {
    const data = await fetchJson(`${EBAYI}/${kind}/${ymd}/yarislar.json`);
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

async function fullMeeting(kind, ymd, key) {
  try {
    return await fetchJson(`${EBAYI}/${kind}/${ymd}/full/${key}.json`);
  } catch {
    return null;
  }
}

function mergeRaces(program, results) {
  const byId = new Map();
  for (const r of program) byId.set(r.id || r.no, r);
  for (const r of results) {
    const k = r.id || r.no;
    const prev = byId.get(k);
    if (!prev) {
      byId.set(k, r);
      continue;
    }
    byId.set(k, {
      ...prev,
      ...r,
      horses: r.horses.length ? r.horses : prev.horses,
      videoUrl: r.videoUrl || prev.videoUrl,
      photoUrl: r.photoUrl || prev.photoUrl,
      bets: r.bets || prev.bets,
      last800: r.last800 || prev.last800,
      finished: r.finished || prev.finished,
    });
  }
  return [...byId.values()].sort((a, b) => Number(a.no) - Number(b.no));
}

export async function loadDayCard(iso, region) {
  const ymd = isoToYmd(iso);
  return cached(`day:${ymd}:${region}`, 45_000, async () => {
    const [progList, resList] = await Promise.all([listMeetings("program", ymd), listMeetings("sonuclar", ymd)]);
    const byKey = new Map();
    for (const item of [...progList, ...resList]) byKey.set(item.KEY, item);
    let items = [...byKey.values()];
    if (region === "tr") {
      items = items.filter((i) => isDomesticMeeting(i.KEY, i.GUN ?? null, i.YER));
    } else if (region === "dunya") {
      items = items.filter((i) => !isDomesticMeeting(i.KEY, i.GUN ?? null, i.YER));
    }
    // region === "all" -> filtre yok
    const meetings = await Promise.all(
      items.map(async (item) => {
        const [prog, res] = await Promise.all([
          fullMeeting("program", ymd, item.KEY),
          fullMeeting("sonuclar", ymd, item.KEY),
        ]);
        const weather = weatherOf(res?.hava || prog?.hava || null);
        const races = mergeRaces((prog?.kosular || []).map(mapRace), (res?.kosular || []).map(mapRace));
        return {
          key: item.KEY,
          code: str(item.KOD),
          name: item.AD,
          city: item.YER,
          night: Boolean(item.GECE),
          dayNo: item.GUN == null ? null : String(item.GUN),
          domestic: isDomesticMeeting(item.KEY, item.GUN ?? null, item.YER),
          weather,
          races,
        };
      }),
    );
    meetings.sort((a, b) => {
      const aHas = a.races.length ? 0 : 1;
      const bHas = b.races.length ? 0 : 1;
      if (aHas !== bHas) return aHas - bHas;
      return a.city.localeCompare(b.city, "tr");
    });
    return { date: iso, meetings };
  });
}

export async function loadHorse(id) {
  return cached(`horse:${id}`, 180_000, async () => {
    try {
      const html = await fetchText(tjkHorseUrl(id), 18000);
      const profile = parseHorsePage(id, html);
      if (!profile.name) profile.name = `At ${id}`;
      return profile;
    } catch (err) {
      return {
        id,
        name: `At ${id}`,
        ageText: "",
        birthDate: "",
        hp: "",
        sire: "",
        dam: "",
        damsire: "",
        trainer: "",
        trainerId: "",
        owner: "",
        ownerId: "",
        runningOwner: "",
        breeder: "",
        color: "",
        sex: "",
        career: [],
        races: [],
        error: err instanceof Error ? err.message : "At bilgisi alınamadı",
      };
    }
  });
}

function rideFromHorse(dateIso, meeting, race, horse) {
  return {
    date: race.date,
    dateIso,
    city: meeting.city,
    meetingKey: meeting.key,
    raceId: race.id,
    raceNo: race.no,
    raceTime: race.time,
    raceType: race.raceType,
    group: race.group,
    distance: race.distance,
    track: race.track,
    trackLabel: race.trackLabel,
    horseId: horse.id,
    horseName: horse.name,
    kg: horse.kg,
    hp: horse.hp,
    position: horse.position,
    time: horse.time,
    odds: horse.ganyan,
    videoUrl: race.videoUrl,
    videoPage: horse.id && race.id ? tjkWatchUrl(horse.id, race.id) : "",
  };
}

export async function loadJockey(id, name = "") {
  return cached(`jockey:${id}:${name}`, 120_000, async () => {
    let stats = {
      name,
      licenseType: "",
      birthDate: "",
      city: "",
      periods: [],
      starts: "",
      first: "",
      second: "",
      third: "",
      fourth: "",
      fifth: "",
      winPct: "",
      placePct: "",
      showPct: "",
    };
    let error;
    try {
      const html = await fetchText(tjkJockeyUrl(id, name), 16000);
      stats = { ...stats, ...parseJockeyStats(html) };
      if (!stats.name) stats.name = name;
    } catch (err) {
      error = err instanceof Error ? err.message : "Jokey bilgisi alınamadı";
    }

    // Son 10 günün programlarını tarayarak bu jokeye ait binişleri buluyoruz.
    const dates = lastNIsoDates(10);
    const days = await mapPool(dates, 4, async (iso) => {
      try {
        return await loadDayCard(iso, "tr");
      } catch {
        return { date: iso, meetings: [] };
      }
    });

    const rides = [];
    for (const day of days) {
      for (const meeting of day.meetings) {
        for (const race of meeting.races) {
          for (const horse of race.horses) {
            if (horse.jockeyId === id) rides.push(rideFromHorse(day.date, meeting, race, horse));
          }
        }
      }
    }
    rides.sort((a, b) => (a.dateIso < b.dateIso ? 1 : -1));

    return {
      id,
      name: stats.name || name || `Jokey ${id}`,
      licenseType: stats.licenseType,
      birthDate: stats.birthDate,
      city: stats.city,
      periods: stats.periods,
      starts: stats.starts,
      first: stats.first,
      second: stats.second,
      third: stats.third,
      fourth: stats.fourth,
      fifth: stats.fifth,
      winPct: stats.winPct,
      placePct: stats.placePct,
      showPct: stats.showPct,
      rides,
      error,
    };
  });
}

export async function loadPerson(kind, id) {
  // kind: "antrenor" | "sahip"
  const url = kind === "antrenor" ? tjkTrainerUrl(id) : tjkOwnerUrl(id);
  return cached(`person:${kind}:${id}`, 180_000, async () => {
    try {
      const html = await fetchText(url, 16000);
      const parsed = parsePersonPage(html);
      return { id, kind, name: parsed.name || "", horses: parsed.horses };
    } catch (err) {
      return {
        id,
        kind,
        name: "",
        horses: [],
        error: err instanceof Error ? err.message : "Bilgi alınamadı",
      };
    }
  });
}

export async function loadVideoUrl(atId, kosuKod) {
  const page = tjkWatchUrl(atId, kosuKod);
  return cached(`video:${atId}:${kosuKod}`, 300_000, async () => {
    try {
      const html = await fetchText(page, 12000);
      return { url: extractMp4(html), page };
    } catch {
      return { url: "", page };
    }
  });
}

export async function searchNames(q) {
  const query = q.trim().toLocaleUpperCase("tr-TR");
  if (query.length < 2) return [];
  const dates = lastNIsoDates(5);
  const days = await Promise.all(
    dates.map(async (iso) => {
      try {
        return await loadDayCard(iso, "all");
      } catch {
        return { date: iso, meetings: [] };
      }
    }),
  );
  const horses = new Map();
  const jockeys = new Map();
  const trainers = new Map();
  const owners = new Map();
  for (const day of days) {
    for (const m of day.meetings) {
      for (const race of m.races) {
        for (const h of race.horses) {
          if (h.id && h.name.toLocaleUpperCase("tr-TR").includes(query) && !horses.has(h.id)) {
            horses.set(h.id, {
              kind: "at",
              id: h.id,
              name: h.name,
              extra: [h.sire, h.dam].filter(Boolean).join(" - "),
            });
          }
          if (h.jockeyId && h.jockeyName.toLocaleUpperCase("tr-TR").includes(query) && !jockeys.has(h.jockeyId)) {
            jockeys.set(h.jockeyId, { kind: "jokey", id: h.jockeyId, name: h.jockeyName, extra: "Jokey" });
          }
          if (
            h.trainerId &&
            h.trainerName.toLocaleUpperCase("tr-TR").includes(query) &&
            !trainers.has(h.trainerId)
          ) {
            trainers.set(h.trainerId, {
              kind: "antrenor",
              id: h.trainerId,
              name: h.trainerName,
              extra: "Antrenör",
            });
          }
          if (h.ownerId && h.ownerName.toLocaleUpperCase("tr-TR").includes(query) && !owners.has(h.ownerId)) {
            owners.set(h.ownerId, { kind: "sahip", id: h.ownerId, name: h.ownerName, extra: "Sahip" });
          }
        }
      }
    }
  }
  return [...horses.values(), ...jockeys.values(), ...trainers.values(), ...owners.values()].slice(0, 30);
}
