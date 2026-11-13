import { useState, type KeyboardEvent } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { calendarISO } from "./calendar-utils";
import { joinClasses } from "../joinClasses";
import "./calendar.css";

export interface InlineCalendarProps {
  /** Currently selected date as `YYYY-MM-DD` */
  value?: string;
  /** Callback when user picks a date */
  onSelect: (isoDate: string) => void;
  /** Optional className for the outer wrapper */
  className?: string;
}

const weekdays = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"];

/**
 * Inline calendar with month/year drill-down views.
 * Uses ease-in-out animation for smooth transitions between views.
 */
export function InlineCalendar({
  value,
  onSelect,
  className,
}: InlineCalendarProps) {
  const todayDate = new Date();
  const todayISO = calendarISO(todayDate);

  const [month, setMonth] = useState(() => {
    if (value) {
      const d = new Date(value);
      if (!Number.isNaN(d.getTime())) return d;
    }
    return new Date();
  });

  const [view, setView] = useState<"days" | "months" | "years">("days");
  const [viewMotion, setViewMotion] = useState<"expand" | "drill">("expand");

  const changeView = (next: typeof view) => {
    const levels = { days: 0, months: 1, years: 2 };
    setViewMotion(levels[next] > levels[view] ? "expand" : "drill");
    setView(next);
  };

  const changeMonth = (offset: number) => {
    setMonth(
      new Date(month.getFullYear(), month.getMonth() + offset, 1),
    );
  };

  const navigate = (direction: number) =>
    changeMonth(
      direction * (view === "days" ? 1 : view === "months" ? 12 : 120),
    );

  const decade = Math.floor(month.getFullYear() / 10) * 10;

  const heading =
    view === "days"
      ? `Tháng ${month.getMonth() + 1} năm ${month.getFullYear()}`
      : view === "months"
        ? String(month.getFullYear())
        : `${decade} – ${decade + 9}`;

  // Build the 6×7 grid of dates
  const start = new Date(month.getFullYear(), month.getMonth(), 1);
  start.setDate(1 - ((start.getDay() + 6) % 7)); // Monday-start
  const days = Array.from({ length: 42 }, (_, i) => {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    return d;
  });

  const choose = (day: string) => {
    onSelect(day);
  };

  const gridKey = (event: KeyboardEvent<HTMLButtonElement>, day: string) => {
    const date = new Date(day);
    const delta: Record<string, number> = {
      ArrowLeft: -1,
      ArrowRight: 1,
      ArrowUp: -7,
      ArrowDown: 7,
    };
    if (delta[event.key] !== undefined) {
      event.preventDefault();
      date.setDate(date.getDate() + delta[event.key]);
      const next = calendarISO(date);
      setMonth(date);
      onSelect(next);
    }
  };

  const periodKey = (event: KeyboardEvent<HTMLButtonElement>, buttons: HTMLButtonElement[]) => {
    const index = buttons.indexOf(event.currentTarget);
    const delta: Record<string, number> = {
      ArrowLeft: -1,
      ArrowRight: 1,
      ArrowUp: -4,
      ArrowDown: 4,
    };
    const d = delta[event.key];
    if (d === undefined) return;
    const target = index + d;
    if (target < 0 || target >= buttons.length) return;
    event.preventDefault();
    if (!buttons[target].disabled) buttons[target].focus();
  };

  const controlBtn =
    "inline-flex size-7 shrink-0 items-center justify-center rounded-lg text-text-muted hover:text-text-primary hover:bg-surface-dashboard focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-pink-focus disabled:cursor-not-allowed disabled:opacity-30 transition";

  return (
    <div className={joinClasses("w-full select-none", className)}>
      {/* Header: heading + nav arrows (Fixed height h-8) */}
      <div className="mb-2 flex h-8 items-center justify-between gap-2">
        <button
          type="button"
          aria-label={
            view === "days"
              ? "Chọn tháng"
              : view === "months"
                ? "Chọn năm"
                : "Khoảng năm"
          }
          disabled={view === "years"}
          className="min-w-0 flex-1 rounded-lg px-1.5 py-1 text-left text-xs font-bold text-gray-900 hover:bg-gray-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pink-400 disabled:hover:bg-transparent transition"
          onClick={() =>
            changeView(view === "days" ? "months" : "years")
          }
        >
          {heading}
        </button>
        <div className="flex items-center gap-0.5">
          <button
            type="button"
            aria-label={
              view === "days"
                ? "Tháng trước"
                : view === "months"
                  ? "Năm trước"
                  : "Thập niên trước"
            }
            className={controlBtn}
            onClick={() => navigate(-1)}
          >
            <ChevronLeft className="size-4" />
          </button>
          <button
            type="button"
            aria-label={
              view === "days"
                ? "Tháng sau"
                : view === "months"
                  ? "Năm sau"
                  : "Thập niên sau"
            }
            className={controlBtn}
            onClick={() => navigate(1)}
          >
            <ChevronRight className="size-4" />
          </button>
        </div>
      </div>

      {/* Animated view container: Strictly FIXED dimensions (w-full, h-[264px]) */}
      <div
        key={view}
        className="calendar-view w-full h-[264px] max-h-[264px] min-h-[264px] overflow-hidden"
        data-motion={viewMotion}
      >
        {/* Months grid: 3 rows × 4 cols = 12 buttons filling full h-[264px] */}
        {view === "months" && (
          <div
            role="group"
            aria-label="Danh sách tháng"
            className="grid h-full grid-cols-4 grid-rows-3 gap-2 py-1"
          >
            {Array.from({ length: 12 }, (_, i) => {
              const year = month.getFullYear();
              const selected = i === month.getMonth();
              return (
                <button
                  key={`month-${year}-${i}`}
                  type="button"
                  data-period
                  aria-label={`Tháng ${i + 1} năm ${year}`}
                  aria-pressed={selected}
                  onKeyDown={(e) => {
                    const parent = e.currentTarget.parentElement;
                    if (!parent) return;
                    periodKey(
                      e,
                      Array.from(
                        parent.querySelectorAll<HTMLButtonElement>(
                          "[data-period]",
                        ),
                      ),
                    );
                  }}
                  className={joinClasses(
                    "flex h-full w-full items-center justify-center rounded-2xl text-xs font-semibold tabular-nums transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-pink-focus",
                    selected
                      ? "bg-brand-pink font-extrabold text-white shadow-sm hover:bg-brand-pink-hover"
                      : "text-text-secondary hover:bg-surface-dashboard",
                  )}
                  onClick={() => {
                    changeMonth(i - month.getMonth());
                    changeView("days");
                  }}
                >
                  Thg {i + 1}
                </button>
              );
            })}
          </div>
        )}

        {/* Years grid: 4 rows × 4 cols = 16 buttons filling full h-[264px] */}
        {view === "years" && (
          <div
            role="group"
            aria-label="Danh sách năm"
            className="grid h-full grid-cols-4 grid-rows-4 gap-2 py-1"
          >
            {Array.from({ length: 16 }, (_, i) => {
              const year = decade - 2 + i;
              const selected = year === month.getFullYear();
              const isOutOfDecade = year < decade || year > decade + 9;
              return (
                <button
                  key={`year-${year}`}
                  type="button"
                  data-period
                  aria-label={`Năm ${year}`}
                  aria-pressed={selected}
                  onKeyDown={(e) => {
                    const parent = e.currentTarget.parentElement;
                    if (!parent) return;
                    periodKey(
                      e,
                      Array.from(
                        parent.querySelectorAll<HTMLButtonElement>(
                          "[data-period]",
                        ),
                      ),
                    );
                  }}
                  className={joinClasses(
                    "flex h-full w-full items-center justify-center rounded-2xl text-xs font-semibold tabular-nums transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-pink-focus",
                    isOutOfDecade && "text-text-muted/40",
                    selected
                      ? "bg-brand-pink font-extrabold text-white shadow-sm hover:bg-brand-pink-hover"
                      : "text-text-secondary hover:bg-surface-dashboard",
                  )}
                  onClick={() => {
                    changeMonth((year - month.getFullYear()) * 12);
                    changeView("months");
                  }}
                >
                  {year}
                </button>
              );
            })}
          </div>
        )}

        {/* Days grid: 7 cols × 6 rows filling full h-[264px] */}
        {view === "days" && (
          <table
            className="h-full w-full table-fixed border-collapse text-center text-xs"
            aria-label={`Tháng ${month.getMonth() + 1} năm ${month.getFullYear()}`}
          >
            <thead>
              <tr className="h-6">
                {weekdays.map((day) => (
                  <th
                    key={day}
                    scope="col"
                    className="h-6 text-[11px] font-bold text-gray-400"
                  >
                    {day}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: 6 }, (_, week) => (
                <tr key={week} className="h-[38px]">
                  {days
                    .slice(week * 7, week * 7 + 7)
                    .map((date) => {
                      const day = calendarISO(date);
                      const selected = day === value;
                      const isToday = day === todayISO;
                      const isOtherMonth =
                        date.getMonth() !== month.getMonth();
                      return (
                        <td key={day} className="p-0 text-center align-middle">
                          <button
                            type="button"
                            data-day={day}
                            tabIndex={day === value ? 0 : -1}
                            aria-label={date.toLocaleDateString(
                              "vi-VN",
                              {
                                weekday: "long",
                                day: "numeric",
                                month: "long",
                                year: "numeric",
                              },
                            )}
                            aria-pressed={selected}
                            aria-current={
                              isToday ? "date" : undefined
                            }
                            onKeyDown={(e) => gridKey(e, day)}
                            onClick={() => choose(day)}
                            className={joinClasses(
                              "mx-auto flex h-7 w-7 items-center justify-center rounded-full text-xs tabular-nums transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-pink-focus",
                              isOtherMonth && "text-text-muted/40 font-normal",
                              !isOtherMonth && !selected && "text-text-primary font-semibold hover:bg-surface-dashboard",
                              isToday &&
                                !selected &&
                                "ring-1 ring-inset ring-brand-pink text-brand-highlight font-extrabold",
                              selected &&
                                "bg-brand-pink font-extrabold text-white shadow hover:bg-brand-pink-hover",
                            )}
                          >
                            {date.getDate()}
                          </button>
                        </td>
                      );
                    })}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

