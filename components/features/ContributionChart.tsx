"use client";

import { useMemo, useRef, useState, type KeyboardEvent } from "react";
import type {
  ActivityMetrics,
  ContributionCalendar,
  ContributionDay,
} from "../../types/github";
import { getLevelColor } from "../../lib/utils/color-helpers";
import { formatCompactNumber } from "../../lib/utils/formatting";

interface ContributionChartProps {
  contributions: ContributionCalendar;
  activity: ActivityMetrics;
}

// Grid pitch: a 12px cell and 3px of spacing. The month labels are placed with it.
const CELL_PITCH = 15;
const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const VISIBLE_WEEKDAYS = new Set([1, 3, 5]);

/** A calendar date ("2026-03-04") as local midnight, so it never shifts a day by time zone. */
function dateFromIso(date: string) {
  const [year, month, day] = date.split("-").map(Number);
  return new Date(year, month - 1, day);
}

const longDate = new Intl.DateTimeFormat("en-US", {
  weekday: "short",
  month: "short",
  day: "numeric",
  year: "numeric",
});

const countLabel = (count: number) => `${count} contribution${count === 1 ? "" : "s"}`;

/** One day in calendar order, with its place in the grid. */
interface CalendarCell {
  day: ContributionDay;
  /** Position in calendar order: the roving focus moves through this index. */
  index: number;
  row: number;
  column: number;
  label: string;
}

/*
 * A table of 7 weekday rows by one column per week, as GitHub draws it, marked up as an
 * ARIA grid. It takes one Tab stop: the arrow keys then move a day (up and down) or a week
 * (left and right), Home and End go to the first and last of that weekday, and Ctrl+Home
 * and Ctrl+End to the first and last day. A tap, hover, or focus shows the day's count in
 * the line below the grid, large enough to read on a phone.
 */
export default function ContributionChart({
  contributions,
  activity,
}: ContributionChartProps) {
  const isRealCalendar = contributions.source === "github";

  const { cells, rows } = useMemo(() => {
    const cells: CalendarCell[] = [];
    const rows: (CalendarCell | null)[][] = Array.from({ length: 7 }, () =>
      Array.from({ length: contributions.weeks.length }, () => null)
    );
    contributions.weeks.forEach((week, column) => {
      for (const day of week.contributionDays) {
        const date = dateFromIso(day.date);
        const cell: CalendarCell = {
          day,
          index: cells.length,
          row: date.getDay(),
          column,
          label: `${countLabel(day.count)} on ${longDate.format(date)}`,
        };
        cells.push(cell);
        rows[cell.row][column] = cell;
      }
    });
    return { cells, rows };
  }, [contributions.weeks]);

  // The focusable day starts on the most recent one: what most people look for first.
  const [focusIndex, setFocusIndex] = useState(() => Math.max(0, cells.length - 1));
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const cellRefs = useRef<(HTMLTableCellElement | null)[]>([]);
  const shown = cells[hoveredIndex ?? selectedIndex ?? -1] ?? null;
  const rovingIndex = Math.min(focusIndex, Math.max(0, cells.length - 1));

  const monthLabels = contributions.weeks.flatMap((week, weekIndex) => {
    const monthStart = week.contributionDays.find(
      (day) => dateFromIso(day.date).getDate() <= 7
    );
    if (!monthStart) return [];

    const date = dateFromIso(monthStart.date);
    return [{
      weekIndex,
      key: `${date.getFullYear()}-${date.getMonth()}`,
      label: date.toLocaleDateString("en-US", { month: "short" }),
    }];
  }).filter((label, index, labels) => (
    index === 0 || label.key !== labels[index - 1].key
  ));

  const moveTo = (index: number) => {
    const target = cells[Math.max(0, Math.min(cells.length - 1, index))];
    if (!target) return;
    setFocusIndex(target.index);
    setSelectedIndex(target.index);
    cellRefs.current[target.index]?.focus();
  };

  const onKeyDown = (event: KeyboardEvent<HTMLTableCellElement>, cell: CalendarCell) => {
    const sameWeekday = (direction: 1 | -1) => {
      // The first or last occurrence of this weekday: step a week at a time to the edge.
      let index = cell.index;
      while (cells[index + 7 * direction]) index += 7 * direction;
      return index;
    };
    const step = (days: number) => (cells[cell.index + days] ? cell.index + days : cell.index);
    const targets: Record<string, number> = {
      ArrowUp: step(-1),
      ArrowDown: step(1),
      ArrowLeft: step(-7),
      ArrowRight: step(7),
      PageUp: Math.max(0, cell.index - 28),
      PageDown: Math.min(cells.length - 1, cell.index + 28),
      Home: event.ctrlKey ? 0 : sameWeekday(-1),
      End: event.ctrlKey ? cells.length - 1 : sameWeekday(1),
    };
    const target = targets[event.key];
    if (target === undefined) return;
    event.preventDefault();
    moveTo(target);
  };

  return (
    <section aria-labelledby="activity-heading">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 id="activity-heading" className="text-xl font-semibold tracking-tight">
            {isRealCalendar ? "Contribution Activity" : "Public Repository Activity"}
          </h2>
          <p className="mt-1.5 text-sm text-muted">
            {isRealCalendar
              ? "Daily public contributions reported by GitHub."
              : "Repository update signals across the last 12 months."}
          </p>
        </div>
        <span className="font-mono text-xs text-muted">Last 12 months</span>
      </div>

      <div className="mt-7 grid gap-8 border-y border-border py-7 lg:grid-cols-[minmax(0,1fr)_260px]">
        <div className="min-w-0">
          {!isRealCalendar && (
            <p className="mb-4 text-xs leading-5 text-warning">
              GitHub&apos;s contribution calendar is temporarily unavailable.
              Cells currently represent latest public repository pushes.
            </p>
          )}

          {/* Scrolls sideways on a phone; focus moving into a hidden week scrolls it into view. */}
          <div className="overflow-x-auto pb-3">
            <div className="w-max min-w-full">
              <div
                className="relative mb-2 ml-10 h-4 text-[10px] text-muted"
                style={{ width: contributions.weeks.length * CELL_PITCH }}
                aria-hidden="true"
              >
                {monthLabels.map((month) => (
                  <span
                    key={`${month.key}-${month.weekIndex}`}
                    className="absolute top-0"
                    style={{ left: month.weekIndex * CELL_PITCH }}
                  >
                    {month.label}
                  </span>
                ))}
              </div>

              {/* border-spacing puts 3px around every cell; the negative margin removes it at the edges. */}
              <table
                role="grid"
                aria-labelledby="activity-heading"
                aria-describedby="contribution-help"
                aria-readonly="true"
                className="-m-[3px] border-separate border-spacing-[3px]"
                onMouseLeave={() => setHoveredIndex(null)}
              >
                <tbody>
                  {rows.map((row, rowIndex) => (
                    <tr key={WEEKDAYS[rowIndex]}>
                      {/* Every row is named for its weekday; Mon, Wed and Fri are also shown. */}
                      <th
                        scope="row"
                        className="w-[37px] p-0 text-left align-middle text-[10px] font-normal leading-3 text-muted"
                      >
                        <span aria-hidden="true">
                          {VISIBLE_WEEKDAYS.has(rowIndex) ? WEEKDAYS[rowIndex].slice(0, 3) : ""}
                        </span>
                        <span className="sr-only">{WEEKDAYS[rowIndex]}</span>
                      </th>
                      {row.map((cell, column) =>
                        cell ? (
                          <td
                            key={cell.day.date}
                            ref={(element) => {
                              cellRefs.current[cell.index] = element;
                            }}
                            tabIndex={cell.index === rovingIndex ? 0 : -1}
                            aria-label={cell.label}
                            className={`heat-cell focus-ring cursor-pointer p-0 ${
                              // A tapped or clicked day stays marked: focus-visible doesn't show for a pointer.
                              selectedIndex === cell.index ? "outline outline-2 outline-offset-1 outline-primary" : ""
                            }`}
                            style={{ backgroundColor: getLevelColor(cell.day.level) }}
                            onKeyDown={(event) => onKeyDown(event, cell)}
                            onFocus={() => {
                              setFocusIndex(cell.index);
                              setSelectedIndex(cell.index);
                            }}
                            // Safari doesn't always focus on tap, so a tap selects the day itself.
                            onClick={() => {
                              setFocusIndex(cell.index);
                              setSelectedIndex(cell.index);
                            }}
                            onMouseEnter={() => setHoveredIndex(cell.index)}
                          />
                        ) : (
                          <td key={`empty-${column}`} className="p-0" />
                        )
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="mt-2 flex items-center justify-end gap-2 text-[10px] text-muted" aria-label="Contribution intensity from less to more">
            <span>Less</span>
            {([0, 1, 2, 3, 4] as const).map((level) => (
              <span key={level} className="h-3 w-3 rounded-[2px]" style={{ backgroundColor: getLevelColor(level) }} />
            ))}
            <span>More</span>
          </div>

          {/*
            The day's detail, for sight and touch. Not a live region: a screen reader already
            reads each day's full label as focus reaches it, so announcing it here would repeat it.
          */}
          <p className="mt-3 min-h-6 text-sm">
            {shown ? (
              <>
                <strong className="font-semibold">{countLabel(shown.day.count)}</strong>
                <span className="text-muted"> · {longDate.format(dateFromIso(shown.day.date))}</span>
              </>
            ) : (
              <span className="text-xs text-muted">
                Tap or hover a day to see its count. By keyboard, Tab into the calendar and use the arrow keys.
              </span>
            )}
          </p>
          <p id="contribution-help" className="sr-only">
            Arrow keys move by day and week. Home and End go to the first and last of a weekday.
          </p>
        </div>

        <dl className="grid grid-cols-2 gap-x-6 gap-y-5 border-t border-border pt-6 lg:grid-cols-1 lg:border-l lg:border-t-0 lg:pl-8 lg:pt-0">
          {[
            [isRealCalendar ? "Total contributions" : "Updated repositories", formatCompactNumber(contributions.totalContributions)],
            ["Active repositories", activity.activeReposCount],
            ["Monthly average", activity.averageContributionsPerMonth],
            ["Most active month", activity.mostActiveMonth],
          ].map(([term, detail]) => (
            <div key={term}>
              <dt className="text-[11px] uppercase tracking-wider text-muted">{term}</dt>
              <dd className="mt-1.5 font-mono text-sm">{detail}</dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}
