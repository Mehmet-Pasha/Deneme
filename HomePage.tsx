import { ChevronLeft, ChevronRight, CloudSun } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { RaceCard } from "@/components/RaceCard";
import { Skeleton } from "@/components/Skeleton";
import { TrackBadge } from "@/components/TrackBadge";
import { VideoDialog } from "@/components/VideoDialog";
import { getDayCard } from "@/lib/api";
import { istanbulTodayIso, isoToTr, shiftIso, weekdayTr, cn } from "@/lib/date";
import type { DayCard, HorseEntry, Meeting, Race, Region } from "@/lib/types";

export function HomePage() {
  const [params, setParams] = useSearchParams();
  const tarih = /^\d{4}-\d{2}-\d{2}$/.test(params.get("tarih") || "") ? (params.get("tarih") as string) : istanbulTodayIso();
  const bolge: Region = params.get("bolge") === "dunya" ? "dunya" : "tr";
  const hip = params.get("hip") || undefined;

  const [data, setData] = useState<DayCard | null>(null);
  const [loading, setLoading] = useState(true);
  const [watch, setWatch] = useState<{ horse: HorseEntry; race: Race } | null>(null);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    getDayCard(tarih, bolge)
      .then((d) => alive && setData(d))
      .catch(() => alive && setData({ date: tarih, meetings: [] }))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [tarih, bolge]);

  const activeKey = useMemo(() => {
    if (!data) return undefined;
    return hip && data.meetings.some((m) => m.key === hip) ? hip : data.meetings[0]?.key;
  }, [data, hip]);

  const meeting = data?.meetings.find((m) => m.key === activeKey);

  function setDate(iso: string) {
    setParams((p) => {
      p.set("tarih", iso);
      p.delete("hip");
      return p;
    });
  }
  function setRegion(r: Region) {
    setParams((p) => {
      p.set("bolge", r);
      p.delete("hip");
      return p;
    });
  }
  function setHip(key: string) {
    setParams((p) => {
      p.set("hip", key);
      return p;
    });
  }

  return (
    <div className="space-y-6">
      <DateBar date={tarih} region={bolge} onDate={setDate} onRegion={setRegion} />

      {loading ? (
        <DaySkeleton />
      ) : !data || data.meetings.length === 0 ? (
        <EmptyDay date={tarih} />
      ) : (
        <>
          <HippodromeTabs meetings={data.meetings} active={activeKey} onSelect={setHip} />
          {meeting ? <MeetingPanel meeting={meeting} onWatch={(h, r) => setWatch({ horse: h, race: r })} /> : null}
        </>
      )}

      {watch ? (
        <VideoDialog
          atId={watch.horse.id}
          kosuKod={watch.race.id}
          fallbackUrl={watch.race.videoUrl}
          title={`${watch.horse.name} · ${watch.race.no}. koşu`}
          onClose={() => setWatch(null)}
        />
      ) : null}
    </div>
  );
}

function DateBar({
  date,
  region,
  onDate,
  onRegion,
}: {
  date: string;
  region: Region;
  onDate: (iso: string) => void;
  onRegion: (r: Region) => void;
}) {
  const today = istanbulTodayIso();
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <p className="text-xs uppercase tracking-[0.18em] text-subtle">Yarış programı</p>
        <h1 className="mt-1 font-display text-4xl capitalize text-fg sm:text-5xl">{weekdayTr(date)}</h1>
        <p className="mt-1 text-muted">{isoToTr(date)}</p>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex items-center rounded-full bg-surface ring-1 ring-border">
          <button
            type="button"
            onClick={() => onDate(shiftIso(date, -1))}
            aria-label="Önceki gün"
            className="inline-flex size-11 items-center justify-center text-muted hover:text-fg"
          >
            <ChevronLeft className="size-5" />
          </button>
          <input
            type="date"
            value={date}
            onChange={(e) => e.target.value && onDate(e.target.value)}
            className="h-11 bg-transparent text-sm text-fg [color-scheme:dark]"
          />
          <button
            type="button"
            onClick={() => onDate(shiftIso(date, 1))}
            aria-label="Sonraki gün"
            className="inline-flex size-11 items-center justify-center text-muted hover:text-fg"
          >
            <ChevronRight className="size-5" />
          </button>
        </div>
        {date !== today ? (
          <button
            type="button"
            onClick={() => onDate(today)}
            className="h-11 rounded-full px-4 text-sm text-fg ring-1 ring-border hover:bg-surface"
          >
            Bugün
          </button>
        ) : null}
        <div className="flex rounded-full bg-surface p-1 ring-1 ring-border">
          <button
            type="button"
            className={cn("h-9 rounded-full px-3 text-sm", region === "tr" ? "bg-fg text-bg" : "text-muted")}
            onClick={() => onRegion("tr")}
          >
            Türkiye
          </button>
          <button
            type="button"
            className={cn("h-9 rounded-full px-3 text-sm", region === "dunya" ? "bg-fg text-bg" : "text-muted")}
            onClick={() => onRegion("dunya")}
          >
            Yurt dışı
          </button>
        </div>
      </div>
    </div>
  );
}

function HippodromeTabs({
  meetings,
  active,
  onSelect,
}: {
  meetings: Meeting[];
  active?: string;
  onSelect: (key: string) => void;
}) {
  return (
    <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
      {meetings.map((m) => {
        const selected = m.key === active;
        return (
          <button
            key={m.key}
            type="button"
            onClick={() => onSelect(m.key)}
            className={cn(
              "flex min-w-40 shrink-0 flex-col rounded-lg px-4 py-3 text-left ring-1 transition-colors",
              selected ? "bg-fg text-bg ring-fg" : "bg-surface text-fg ring-border",
            )}
          >
            <span className="text-sm font-medium">{m.city}</span>
            <span className={cn("text-xs", selected ? "text-bg/70" : "text-muted")}>
              {m.races.length} koşu{m.night ? " · gece" : ""}
            </span>
          </button>
        );
      })}
    </div>
  );
}

function MeetingPanel({
  meeting,
  onWatch,
}: {
  meeting: Meeting;
  onWatch: (horse: HorseEntry, race: Race) => void;
}) {
  const w = meeting.weather;
  const surfaces = useMemo(() => [...new Set(meeting.races.map((r) => r.track))], [meeting.races]);

  return (
    <section className="space-y-4">
      <div className="rounded-xl bg-surface p-4 ring-1 ring-border">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="font-display text-2xl">{meeting.name}</h2>
            <p className="text-sm text-muted">
              {meeting.city}
              {meeting.dayNo ? ` · ${meeting.dayNo}. gün` : ""}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {surfaces.map((s) => (
              <TrackBadge key={s} kind={s} />
            ))}
          </div>
        </div>
        {w ? (
          <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted">
            <span className="inline-flex items-center gap-1.5">
              <CloudSun className="size-4" />
              {w.sky || "Hava"}
              {w.temp != null ? ` ${w.temp}°` : ""}
              {w.humidity != null ? ` · nem %${w.humidity}` : ""}
            </span>
            {w.turf ? (
              <span>
                Çim: {w.turf}
                {w.turfDepth ? ` ${w.turfDepth}` : ""}
              </span>
            ) : null}
            {w.dirt ? (
              <span>
                Kum: {w.dirt}
                {w.dirtDepth ? ` ${w.dirtDepth}` : ""}
              </span>
            ) : null}
          </div>
        ) : null}
      </div>

      <div className="space-y-4">
        {meeting.races.map((race) => (
          <RaceCard key={race.id || race.no} race={race} onWatch={onWatch} />
        ))}
      </div>
    </section>
  );
}

function EmptyDay({ date }: { date: string }) {
  return (
    <div className="rounded-xl bg-surface px-6 py-16 text-center ring-1 ring-border">
      <p className="font-display text-2xl">Bu tarihte yarış yok</p>
      <p className="mt-2 text-sm text-muted">{isoToTr(date)} için TJK programında koşu bulunamadı.</p>
    </div>
  );
}

function DaySkeleton() {
  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <Skeleton className="h-16 w-40 rounded-lg" />
        <Skeleton className="h-16 w-40 rounded-lg" />
        <Skeleton className="h-16 w-40 rounded-lg" />
      </div>
      <Skeleton className="h-72 w-full rounded-xl" />
      <Skeleton className="h-72 w-full rounded-xl" />
    </div>
  );
}
