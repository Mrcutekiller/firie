import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import GarmentImage from "../components/GarmentImage";
import { Button, ProLock } from "../components/ui";
import { useApp } from "../lib/store";
import { EVENT_LABELS, type ClosetItem, type Slot } from "../lib/types";
import { todayKey } from "../lib/storage";

const WEEKDAYS = ["M", "T", "W", "T", "F", "S", "S"];
const POSITION: Record<Slot, string> = {
  cap: "left-1/2 top-1 z-[3] h-[42px] w-[68px] -translate-x-1/2",
  top: "left-1/2 top-[38px] z-[2] h-[165px] w-[150px] -translate-x-1/2",
  bottom: "left-1/2 top-[190px] z-[3] h-[165px] w-[102px] -translate-x-1/2",
  shoes: "left-1/2 top-[350px] z-[4] h-[42px] w-[132px] -translate-x-1/2",
  ring: "right-[70px] top-[70px] z-[5] h-[30px] w-[34px]",
  accessory: "right-[39px] top-[126px] z-[5] h-[55px] w-[48px]",
};

function dateKey(year: number, month: number, day: number) {
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function longDate(value: string) {
  return new Date(`${value}T00:00:00`).toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" });
}

function OutfitSlide({ log, itemById }: { log: ReturnType<typeof useApp>["history"][number]; itemById: (id: string) => ClosetItem | undefined }) {
  const pieces = log.itemIds.map(itemById).filter((item): item is ClosetItem => Boolean(item));
  const top = pieces.find((item) => item.slot === "top");
  const bottom = pieces.find((item) => item.slot === "bottom");
  const title = top && bottom ? `${top.color} layers, ${bottom.color.toLowerCase()}` : pieces[0]?.name ?? "A look from your closet";
  return (
    <article className="w-full shrink-0 snap-center px-1">
      <div className="relative mx-auto h-[410px] w-full overflow-hidden bg-white">
        <span className="absolute left-2 top-2 z-10 rounded-full bg-[#f6f7f8] px-2.5 py-1.5 text-[9px] font-bold tracking-[.5px] text-[#69727d]">WORN THIS DAY</span>
        <div className="absolute bottom-[16px] left-1/2 h-6 w-[220px] -translate-x-1/2 rounded-[50%] border border-[#e8eaed] border-t-[#cfd3d8] shadow-[0_10px_16px_rgba(26,29,34,.05)]" />
        {pieces.map((item) => {
          const onePiece = item.slot === "top" && item.category === "traditional" && /kemis|dress|habesha/i.test(`${item.name} ${item.tags.join(" ")}`);
          return <div key={item.id} className={`absolute flex items-center justify-center ${onePiece ? "left-1/2 top-8 z-[2] h-[330px] w-[230px] -translate-x-1/2" : POSITION[item.slot]}`}>
          <GarmentImage src={item.imageUrl} alt={item.name} slot={item.slot} colorHex={item.colorHex} transparent className="max-h-full max-w-full object-contain drop-shadow-[0_8px_8px_rgba(20,25,32,.10)]" />
        </div>;
        })}
      </div>
      <div className="mt-1 flex items-center justify-between gap-2">
        <h2 className="truncate text-[15px] font-bold tracking-[-.3px]">{title}</h2>
        <span className="shrink-0 rounded-full bg-[#f2f4f6] px-2.5 py-1 text-[9px] text-[#5f6874]">{EVENT_LABELS[log.event]}</span>
      </div>
      <p className="mt-1 truncate text-[10px] text-[#818995]">{pieces.map((item) => item.name).join(" · ")}</p>
      {log.reason && <p className="mt-1 line-clamp-2 text-[9px] leading-relaxed text-[#818995]">{log.reason}</p>}
    </article>
  );
}

export default function HistoryScreen() {
  const navigate = useNavigate();
  const { isPro, history, itemById } = useApp();
  const orderedHistory = useMemo(() => [...history].sort((a, b) => b.date.localeCompare(a.date) || b.createdAt - a.createdAt), [history]);
  const [activeDate, setActiveDate] = useState(() => orderedHistory[0]?.date ?? todayKey());
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [calendarMonth, setCalendarMonth] = useState(() => {
    const value = orderedHistory[0]?.date ?? todayKey();
    return new Date(`${value}T00:00:00`);
  });
  const carouselRef = useRef<HTMLDivElement>(null);
  const activeIndex = orderedHistory.findIndex((log) => log.date === activeDate);
  const monthLabel = calendarMonth.toLocaleDateString(undefined, { month: "long", year: "numeric" });
  const firstWeekday = (new Date(calendarMonth.getFullYear(), calendarMonth.getMonth(), 1).getDay() + 6) % 7;
  const daysInMonth = new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1, 0).getDate();
  const calendarCells = [...Array.from({ length: firstWeekday }, () => null), ...Array.from({ length: daysInMonth }, (_, index) => index + 1)];
  const loggedDates = useMemo(() => new Set(history.map((log) => log.date)), [history]);

  useEffect(() => {
    const carousel = carouselRef.current;
    if (!carousel || activeIndex < 0) return;
    carousel.scrollTo({ left: activeIndex * carousel.clientWidth, behavior: "smooth" });
  }, [activeIndex, orderedHistory.length]);

  const changeSlide = (direction: -1 | 1) => {
    const nextIndex = activeIndex + direction;
    const nextLog = orderedHistory[nextIndex];
    if (nextLog) setActiveDate(nextLog.date);
  };

  const chooseDay = (key: string) => {
    setActiveDate(key);
    setCalendarOpen(false);
  };

  if (!isPro) {
    return (
      <div className="space-y-4 pb-6">
        <p className="text-[10px] font-bold uppercase tracking-[1.2px] text-[#89909a]">Your style, over time</p>
        <h1 className="text-[27px] font-bold leading-tight tracking-[-.8px]">Outfit history.</h1>
        <p className="-mt-2 text-[11px] text-[#828994]">Swipe through your saved looks by day.</p>
        <div className="mt-3 rounded-[20px] border border-[#eceef1] bg-white p-4">
          <p className="text-[10px] font-bold tracking-wide text-[#9a7a4d]">ፍሬ PRO</p>
          <p className="mt-1 text-sm font-bold text-[#171b22]">A little look back.</p>
          <div className="mt-3 space-y-2 opacity-65 blur-[.4px]">
            {["Navy layers, soft denim", "Warm tones, easy layers"].map((look, index) => <div key={look} className="flex items-center gap-3 rounded-xl bg-[#f4f5f7] p-2.5"><span className={`h-10 w-10 rounded-lg ${index ? "bg-[#bd7958]" : "bg-[#23364d]"}`} /><span className="text-[10px] font-semibold">{look}</span><span className="ml-auto text-[9px] text-[#8a9099]">◷</span></div>)}
          </div>
          <ProLock onUpgrade={() => navigate("/upgrade")} note="Save every outfit by date, swipe through past looks, and revisit the pieces you wore." />
        </div>
        <p className="text-center text-[10px] leading-relaxed text-[#8a9099]">Your closet and daily outfit suggestions stay free. History is included with ፍሬ Pro.</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[430px] pb-5">
      <div className="flex items-center justify-between gap-3">
        <button onClick={() => changeSlide(-1)} disabled={activeIndex <= 0} aria-label="Previous saved day" className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[#f4f5f7] text-lg text-[#55606d] disabled:opacity-35">‹</button>
        <button onClick={() => { setCalendarMonth(new Date(`${activeDate}T00:00:00`)); setCalendarOpen(true); }} aria-label="Choose a date from the calendar" className="flex min-w-0 flex-1 items-center justify-center gap-2 rounded-full border border-[#eceef1] bg-white px-3 py-2.5 text-[12px] font-semibold text-[#29313c]">
          <span className="truncate">{longDate(activeDate)}</span><svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0 text-[#798390]" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3.5" y="5" width="17" height="16" rx="2"/><path d="M7.5 3v4M16.5 3v4M3.5 10h17"/></svg>
        </button>
        <button onClick={() => changeSlide(1)} disabled={activeIndex < 0 || activeIndex >= orderedHistory.length - 1} aria-label="Next saved day" className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[#f4f5f7] text-lg text-[#55606d] disabled:opacity-35">›</button>
      </div>

      <div className="mt-2 flex items-center justify-between px-1"><p className="text-[9px] font-bold tracking-[1.1px] text-[#9299a3]">OUTFIT HISTORY</p><span className="text-[9px] text-[#9299a3]">{orderedHistory.length ? `${Math.max(activeIndex, 0) + 1} / ${orderedHistory.length}` : "Swipe saved looks"}</span></div>

      {activeIndex < 0 ? <div className="mt-2 rounded-[18px] border border-[#eceef1] bg-white px-5 py-12 text-center">
        <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-[#f2f3f5] text-xl text-[#768397]">◷</div>
        <h2 className="mt-4 text-sm font-bold">{loggedDates.has(activeDate) ? "No look saved for this day" : "No outfit saved this day"}</h2>
        <p className="mt-1 text-[10px] text-[#858d97]">Choose a date with a saved outfit, or mark today’s look as worn.</p>
        <Button className="mt-4" onClick={() => navigate("/")}>Go to Today</Button>
      </div> : <>
        <div ref={carouselRef} className="no-scrollbar mt-1 flex snap-x snap-mandatory overflow-x-auto scroll-smooth" onScroll={(event) => {
          const track = event.currentTarget;
          const index = Math.round(track.scrollLeft / Math.max(track.clientWidth, 1));
          const nextDate = orderedHistory[index]?.date;
          if (nextDate && nextDate !== activeDate) setActiveDate(nextDate);
        }}>
          {orderedHistory.map((log) => <OutfitSlide key={log.id} log={log} itemById={itemById} />)}
        </div>
        <div className="mt-1 flex justify-center gap-1.5">{orderedHistory.map((log, index) => <button key={log.id} aria-label={`View ${longDate(log.date)}`} onClick={() => setActiveDate(log.date)} className={`h-1.5 rounded-full transition-all ${index === activeIndex ? "w-5 bg-[#29384d]" : "w-1.5 bg-[#d8dce2]"}`} />)}</div>
      </>}

      {calendarOpen && <div className="fixed inset-0 z-50 flex items-end justify-center bg-[#111827]/35 p-0" onClick={() => setCalendarOpen(false)}>
        <section role="dialog" aria-modal="true" aria-label="Choose an outfit history date" onClick={(event) => event.stopPropagation()} className="w-full max-w-[480px] rounded-t-[28px] bg-white px-5 pb-[max(env(safe-area-inset-bottom),20px)] pt-4 shadow-[0_-14px_50px_rgba(16,38,66,.16)]">
          <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-[#d9dee5]" />
          <div className="flex items-center justify-between"><div><p className="text-[9px] font-bold uppercase tracking-[1px] text-[#9a7a4d]">History calendar</p><h2 className="mt-1 text-lg font-bold">Choose a day</h2></div><button onClick={() => setCalendarOpen(false)} aria-label="Close calendar" className="grid h-8 w-8 place-items-center rounded-full bg-[#f4f5f7] text-sm text-[#67717e]">×</button></div>
          <div className="mt-5 flex items-center justify-between"><button onClick={() => setCalendarMonth((date) => new Date(date.getFullYear(), date.getMonth() - 1, 1))} aria-label="Previous month" className="grid h-8 w-8 place-items-center rounded-full bg-[#f4f5f7] text-[#66717d]">‹</button><p className="text-sm font-bold">{monthLabel}</p><button onClick={() => setCalendarMonth((date) => new Date(date.getFullYear(), date.getMonth() + 1, 1))} aria-label="Next month" className="grid h-8 w-8 place-items-center rounded-full bg-[#f4f5f7] text-[#66717d]">›</button></div>
          <div className="mt-3 grid grid-cols-7 gap-y-2 text-center">{WEEKDAYS.map((day, index) => <span key={`${day}-${index}`} className="py-2 text-[9px] font-semibold text-[#98a0aa]">{day}</span>)}{calendarCells.map((day, index) => {
            if (!day) return <span key={`blank-${index}`} />;
            const key = dateKey(calendarMonth.getFullYear(), calendarMonth.getMonth(), day);
            const hasLook = loggedDates.has(key);
            const selected = activeDate === key;
            return <button key={key} onClick={() => chooseDay(key)} className={`relative mx-auto grid h-10 w-10 place-items-center rounded-full text-[11px] ${selected ? "bg-[#17283e] font-bold text-white" : "text-[#354152] hover:bg-[#f2f4f7]"}`}>{day}{hasLook && <span className={`absolute bottom-1 h-1 w-1 rounded-full ${selected ? "bg-white" : "bg-[#aa8652]"}`} />}</button>;
          })}</div>
          <div className="mt-4 flex items-center gap-2 text-[10px] text-[#838d99]"><span className="h-1.5 w-1.5 rounded-full bg-[#aa8652]"/>Days with a saved outfit</div>
        </section>
      </div>}
    </div>
  );
}
