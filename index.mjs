import express from "express";
import compression from "compression";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadDayCard, loadHorse, loadJockey, loadPerson, loadVideoUrl, searchNames } from "./tjk/client.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
app.use(compression());
app.use(express.json());

const PORT = process.env.PORT || 8787;

function isoOk(v) {
  return typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v);
}

app.get("/api/gun/:iso", async (req, res) => {
  const { iso } = req.params;
  const region = req.query.bolge === "dunya" ? "dunya" : req.query.bolge === "all" ? "all" : "tr";
  if (!isoOk(iso)) return res.status(400).json({ error: "Geçersiz tarih formatı (YYYY-MM-DD bekleniyor)" });
  try {
    const data = await loadDayCard(iso, region);
    res.json(data);
  } catch (err) {
    res.status(502).json({ error: err instanceof Error ? err.message : "Veri alınamadı", date: iso, meetings: [] });
  }
});

app.get("/api/at/:id", async (req, res) => {
  try {
    const data = await loadHorse(req.params.id);
    res.json(data);
  } catch (err) {
    res.status(502).json({ error: err instanceof Error ? err.message : "At bilgisi alınamadı" });
  }
});

app.get("/api/jokey/:id", async (req, res) => {
  try {
    const data = await loadJockey(req.params.id, req.query.ad || "");
    res.json(data);
  } catch (err) {
    res.status(502).json({ error: err instanceof Error ? err.message : "Jokey bilgisi alınamadı" });
  }
});

app.get("/api/kisi/:kind/:id", async (req, res) => {
  const kind = req.params.kind === "antrenor" ? "antrenor" : "sahip";
  try {
    const data = await loadPerson(kind, req.params.id);
    res.json(data);
  } catch (err) {
    res.status(502).json({ error: err instanceof Error ? err.message : "Bilgi alınamadı" });
  }
});

app.get("/api/video/:atId/:kosuKod", async (req, res) => {
  try {
    const data = await loadVideoUrl(req.params.atId, req.params.kosuKod);
    res.json(data);
  } catch (err) {
    res.status(502).json({ error: err instanceof Error ? err.message : "Video bulunamadı", url: "", page: "" });
  }
});

app.get("/api/ara", async (req, res) => {
  const q = String(req.query.q || "");
  try {
    const data = await searchNames(q);
    res.json(data);
  } catch (err) {
    res.status(502).json({ error: err instanceof Error ? err.message : "Arama başarısız", results: [] });
  }
});

app.get("/api/saglik", (_req, res) => res.json({ ok: true, time: new Date().toISOString() }));

// Üretimde derlenmiş frontend'i sun
const distDir = path.join(__dirname, "..", "dist");
app.use(express.static(distDir));
app.get("*", (req, res, next) => {
  if (req.path.startsWith("/api/")) return next();
  res.sendFile(path.join(distDir, "index.html"));
});

app.listen(PORT, () => {
  console.log(`TJK proxy + statik sunucu http://localhost:${PORT} adresinde çalışıyor`);
});
