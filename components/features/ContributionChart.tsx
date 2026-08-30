"use client";

import { useState } from "react";
import type {
  ActivityMetrics,
  ContributionCalendar,
  ContributionDay,
} from "../../types/github";
import { getLevelColor } from "../../lib/utils/color-helpers";
import { formatCompactNumber, formatDate } from "../../lib/utils/formatting";

interface ContributionChartProps {
  contributions: ContributionCalendar;
  activity: ActivityMetrics;
}

function dateFromIso(date: string) {
  const [year, month, day] = date.split("-").map(Number);
  return new Date(year, month - 1, day);
}

export default function ContributionChart({
  contributions,
  activity,
}: ContributionChartProps) {
  const [activeDay, setActiveDay] = useState<ContributionDay | null>(null);
  const isRealCalendar = contributions.source === "github";

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

          <div className="overflow-x-auto pb-3" tabIndex={0} aria-label="Scrollable contribution calendar">
            <div className="w-max min-w-full">
              <div className="ml-10">
                <div
                  className="relative mb-2 h-4 text-[10px] text-muted"
                  style={{ width: contributions.weeks.length * 15 }}
                  aria-hidden="true"
                >
                  {monthLabels.map((month) => (
                    <span
                      key={`${month.key}-${month.weekIndex}`}
                      className="absolute top-0"
                      style={{ left: month.weekIndex * 15 }}
                    >
                      {month.label}
                    </span>
                  ))}
                </div>
              </div>

              <div className="flex gap-2">
                <div className="grid h-[102px] w-8 shrink-0 grid-rows-7 text-[10px] leading-3 text-muted" aria-hidden="true">
                  <span />
                  <span>Mon</span>
                  <span />
                  <span>Wed</span>
                  <span />
                  <span>Fri</span>
                  <span />
                </div>

                <div className="flex gap-[3px]" role="grid" aria-label="Daily GitHub contributions">
                  {contributions.weeks.map((week, weekIndex) => (
                    <div key={weekIndex} className="grid grid-rows-7 gap-[3px]" role="row">
                      {week.contributionDays.map((day, dayIndex) => {
                        const weekday = dateFromIso(day.date).getDay();
                        return (
                          <button
                            key={day.date}
                            type="button"
                            role="gridcell"
                            className="heat-cell focus-ring"
                            style={{
                              backgroundColor: getLevelColor(day.level),
                              gridRowStart: dayIndex === 0 ? weekday + 1 : undefined,
                            }}
                            onMouseEnter={() => setActiveDay(day)}
                            onMouseLeave={() => setActiveDay(null)}
                            onFocus={() => setActiveDay(day)}
                            onBlur={() => setActiveDay(null)}
                            aria-label={`${day.count} contribution${day.count === 1 ? "" : "s"} on ${formatDate(day.date)}`}
                            title={`${day.count} contribution${day.count === 1 ? "" : "s"} on ${formatDate(day.date)}`}
                          />
                        );
                      })}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="mt-2 flex items-center justify-end gap-2 text-[10px] text-muted" aria-label="Contribution intensity from less to more">
            <span>Less</span>
            {([0, 1, 2, 3, 4] as const).map((level) => (
              <span key={level} className="h-3 w-3 rounded-[2px]" style={{ backgroundColor: getLevelColor(level) }} />
            ))}
            <span>More</span>
          </div>

          <p aria-live="polite" className="mt-3 min-h-5 text-xs text-muted">
            {activeDay
              ? `${activeDay.count} contribution${activeDay.count === 1 ? "" : "s"} · ${formatDate(activeDay.date)}`
              : "Focus or hover a cell for its exact contribution count."}
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
