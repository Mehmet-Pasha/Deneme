import { ArrowLeft, Play } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { FormPips } from "@/components/FormPips";
import { PositionBadge } from "@/components/PositionBadge";
import { Skeleton } from "@/components/Skeleton";
import { StarButton } from "@/components/StarButton";
import { TrackBadge } from "@/components/TrackBadge";
import { VideoDialog } from "@/components/VideoDialog";
import { getHorseProfile } from "@/lib/api";
import { parseAgeText } from "@/lib/format";
import type { HorseProfile, PastRace } from "@/lib/types";

export function HorsePage() {
  const { id = "" } = useParams();
  const [horse, setHorse] = useState<HorseProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [watch, setWatch] = useState<PastRace | null>(null);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    getHorseProfile(id)
      .then((h) => alive && setHorse(h))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [id]);

  if (loading || !horse) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-40 w-full rounded-xl" />
        <Skeleton className="h-56 w-full rounded-xl" />
      </div>
    );
  }

  const age = parseAgeText(horse.ageText);
  const form = horse.races.slice(0, 6).map((r) => r.position).filter(Boolean).reverse();
  const total = horse.career.find((c) => /toplam|kariyer/i.test(c.label)) || horse.career[0];
  const avgWeight = averageOf(horse.races.map((r) => Number.parseFloat(r.kg)).filter((n) => Number.isFinite(n)));
  const bestFinishStreak = horse.races.filter((r) => r.position === "1").length;

  return (
    <div className="space-y-6">
      <Link to="/" className="inline-flex h-11 items-center gap-2 text-sm text-muted hover:text-fg">
        <ArrowLeft className="size-4" />
        Program
      </Link>

      <header className="rounded-xl bg-surface p-5 ring-1 ring-border sm:p-8">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-subtle">Safkan</p>
            <h1 className="mt-2 font-display text-4xl sm:text-5xl">{horse.name}</h1>
            <p className="mt-2 text-muted">
              {age.label || horse.ageText}
              {horse.birthDate ? ` · Doğum ${horse.birthDate}` : ""}
            </p>
          </div>
          <StarButton kind="at" id={horse.id} name={horse.name} />
        </div>

        <dl className="mt-6 grid grid-cols-2 gap-4 text-sm sm:grid-cols-3">
          <Fact label="Handikap" value={horse.hp ? `HP ${horse.hp}` : "—"} />
          <Fact label="Baba" value={horse.sire || "—"} />
          <Fact label="Anne" value={horse.dam || "—"} />
          <Fact label="Anne baba (dede)" value={horse.damsire || "—"} />
          <Fact
            label="Antrenör"
            value={horse.trainer || "—"}
            linkTo={horse.trainerId ? `/kisi/antrenor/${horse.trainerId}` : undefined}
          />
          <Fact
            label="Sahip"
            value={horse.owner || horse.runningOwner || "—"}
            linkTo={horse.ownerId ? `/kisi/sahip/${horse.ownerId}` : undefined}
          />
          <Fact label="Yetiştirici" value={horse.breeder || "—"} />
          <Fact label="Koşu / 1." value={total ? `${total.starts} / ${total.first}` : "—"} />
          <Fact label="Ortalama taşıdığı kilo" value={avgWeight != null ? `${avgWeight.toFixed(1)} kg` : "—"} />
          <Fact label="Kazandığı yarış sayısı" value={String(bestFinishStreak)} />
          <div className="col-span-2 sm:col-span-1">
            <dt className="text-xs uppercase tracking-wide text-subtle">Son form</dt>
            <dd className="mt-1">
              <FormPips form={form} />
            </dd>
          </div>
        </dl>
        {horse.error ? <p className="mt-4 text-sm text-danger">{horse.error}</p> : null}
      </header>

      {horse.career.length ? (
        <section className="overflow-hidden rounded-xl bg-surface ring-1 ring-border">
          <h2 className="border-b border-border px-4 py-3 font-display text-xl">İstatistik</h2>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-sm">
              <thead className="text-xs uppercase tracking-wide text-subtle">
                <tr className="border-b border-border">
                  <th className="px-3 py-2 text-left font-medium">Dönem</th>
                  <th className="px-3 py-2 text-left font-medium">K</th>
                  <th className="px-3 py-2 text-left font-medium">1</th>
                  <th className="px-3 py-2 text-left font-medium">2</th>
                  <th className="px-3 py-2 text-left font-medium">3</th>
                  <th className="px-3 py-2 text-left font-medium">4</th>
                  <th className="px-3 py-2 text-left font-medium">5</th>
                  <th className="px-3 py-2 text-left font-medium">Kazanç</th>
                </tr>
              </thead>
              <tbody>
                {horse.career.map((line) => (
                  <tr key={line.label} className="border-b border-border/70 last:border-0">
                    <td className="px-3 py-2">{line.label}</td>
                    <td className="px-3 py-2 tabular">{line.starts}</td>
                    <td className="px-3 py-2 tabular">{line.first}</td>
                    <td className="px-3 py-2 tabular">{line.second}</td>
                    <td className="px-3 py-2 tabular">{line.third}</td>
                    <td className="px-3 py-2 tabular">{line.fourth}</td>
                    <td className="px-3 py-2 tabular">{line.fifth}</td>
                    <td className="px-3 py-2 tabular text-muted">{line.earnings}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}

      <section className="overflow-hidden rounded-xl bg-surface ring-1 ring-border">
        <h2 className="border-b border-border px-4 py-3 font-display text-xl">
          Geçmiş koşular
          <span className="ml-2 text-sm font-sans font-normal text-muted">{horse.races.length}</span>
        </h2>
        <div className="hidden overflow-x-auto lg:block">
          <table className="w-full min-w-[1080px] text-sm">
            <thead className="text-xs uppercase tracking-wide text-subtle">
              <tr className="border-b border-border">
                <th className="px-3 py-2 text-left font-medium">Tarih</th>
                <th className="px-3 py-2 text-left font-medium">Şehir</th>
                <th className="px-3 py-2 text-left font-medium">Pist</th>
                <th className="px-3 py-2 text-left font-medium">Sıra</th>
                <th className="px-3 py-2 text-left font-medium">Kg</th>
                <th className="px-3 py-2 text-left font-medium">HP</th>
                <th className="px-3 py-2 text-left font-medium">Jokey</th>
                <th className="px-3 py-2 text-left font-medium">Derece</th>
                <th className="px-3 py-2 text-left font-medium">Koşu</th>
                <th className="px-3 py-2 text-left font-medium">İzle</th>
              </tr>
            </thead>
            <tbody>
              {horse.races.map((race, i) => (
                <tr key={`${race.date}-${race.raceNo}-${i}`} className="border-b border-border/70 last:border-0">
                  <td className="px-3 py-2.5 tabular text-muted">{race.date}</td>
                  <td className="px-3 py-2.5">{race.city}</td>
                  <td className="px-3 py-2.5">
                    <div className="flex items-center gap-2">
                      <TrackBadge kind={race.track} label={race.trackLabel} />
                      <span className="tabular text-muted">{race.distance} m</span>
                    </div>
                  </td>
                  <td className="px-3 py-2.5">
                    <PositionBadge pos={race.position} />
                  </td>
                  <td className="px-3 py-2.5 tabular">{race.kg || "—"}</td>
                  <td className="px-3 py-2.5 tabular">{race.hp || "—"}</td>
                  <td className="px-3 py-2.5">
                    {race.jockeyId ? (
                      <Link to={`/jokey/${race.jockeyId}?ad=${encodeURIComponent(race.jockeyName)}`} className="hover:underline">
                        {race.jockeyName}
                      </Link>
                    ) : (
                      race.jockeyName
                    )}
                  </td>
                  <td className="px-3 py-2.5 tabular">{race.time || "—"}</td>
                  <td className="px-3 py-2.5 text-muted">
                    {race.raceNo ? `${race.raceNo}. ` : ""}
                    {race.raceName || race.raceType}
                  </td>
                  <td className="px-3 py-2.5">
                    {race.videoKosuKod || race.videoPage ? (
                      <button
                        type="button"
                        onClick={() => setWatch(race)}
                        aria-label="İzle"
                        className="inline-flex size-9 items-center justify-center text-gold"
                      >
                        <Play className="size-4" />
                      </button>
                    ) : (
                      <span className="text-subtle">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="divide-y divide-border lg:hidden">
          {horse.races.map((race, i) => (
            <article key={`${race.date}-${i}`} className="px-4 py-3">
              <div className="flex items-start gap-3">
                <PositionBadge pos={race.position} />
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-fg">
                    {race.date} · {race.city}
                  </p>
                  <p className="text-xs text-muted">
                    {race.distance} m · {race.raceType || race.raceName}
                  </p>
                  <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                    <TrackBadge kind={race.track} label={race.trackLabel} />
                    <span className="tabular">{race.kg || "—"} kg</span>
                    <span className="tabular text-muted">HP {race.hp || "—"}</span>
                    {race.jockeyId ? (
                      <Link to={`/jokey/${race.jockeyId}?ad=${encodeURIComponent(race.jockeyName)}`}>{race.jockeyName}</Link>
                    ) : (
                      <span>{race.jockeyName}</span>
                    )}
                  </div>
                </div>
                {race.videoKosuKod || race.videoPage ? (
                  <button
                    type="button"
                    onClick={() => setWatch(race)}
                    aria-label="İzle"
                    className="inline-flex size-10 items-center justify-center text-gold"
                  >
                    <Play className="size-4" />
                  </button>
                ) : null}
              </div>
            </article>
          ))}
        </div>
        {horse.races.length === 0 ? <p className="px-4 py-10 text-center text-sm text-muted">Koşu kaydı bulunamadı.</p> : null}
      </section>

      {watch ? (
        <VideoDialog
          atId={horse.id}
          kosuKod={watch.videoKosuKod || watch.raceNo}
          title={`${horse.name} · ${watch.city} ${watch.date}`}
          onClose={() => setWatch(null)}
        />
      ) : null}
    </div>
  );
}

function Fact({ label, value, linkTo }: { label: string; value: string; linkTo?: string }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wide text-subtle">{label}</dt>
      <dd className="mt-1 text-fg">
        {linkTo ? (
          <Link to={linkTo} className="hover:underline">
            {value}
          </Link>
        ) : (
          value
        )}
      </dd>
    </div>
  );
}

function averageOf(nums: number[]): number | null {
  if (!nums.length) return null;
  return nums.reduce((a, b) => a + b, 0) / nums.length;
}
