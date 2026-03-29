"use client";

import { useEffect, useMemo, useState } from "react";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { NavTabs } from "@/components/nav-tabs";
import type { SeniorityTrendResponse } from "@/lib/jobs";

const WINDOW_OPTIONS = [24, 12, 6] as const;

export default function AnalyticsPage() {
  const [data, setData] = useState<SeniorityTrendResponse | null>(null);
  const [months, setMonths] = useState<number>(12);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        setError(null);

        const response = await fetch(
          `/api/analytics/seniority?months=${months}`,
          {
            cache: "no-store",
          },
        );
        if (!response.ok) {
          throw new Error(`Request failed with status ${response.status}`);
        }

        const json = (await response.json()) as SeniorityTrendResponse;
        setData(json);
      } catch (fetchError) {
        setError(
          fetchError instanceof Error ? fetchError.message : "Unknown error",
        );
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, [months]);

  const totalByLevel = useMemo(() => {
    const series = data?.series ?? [];
    return series.reduce(
      (acc, point) => {
        acc.junior += point.junior;
        acc.mid += point.mid;
        acc.senior += point.senior;
        return acc;
      },
      { junior: 0, mid: 0, senior: 0 },
    );
  }, [data?.series]);

  const lastUpdated = data?.fetchedAt
    ? new Date(data.fetchedAt).toLocaleString()
    : null;

  return (
    <div className="min-h-screen bg-zinc-50 px-4 py-8 font-sans text-zinc-900 dark:bg-black dark:text-zinc-50">
      <main className="mx-auto flex max-w-6xl flex-col gap-8">
        <header className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">
              Macro Tech Hiring Analytics
            </h1>
            <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
              {months}-month trend of role volume by seniority level.
            </p>
            <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
              {lastUpdated ? `Last computed: ${lastUpdated}` : "Loading..."}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <label className="text-xs font-medium uppercase tracking-wide text-zinc-500">
              History
            </label>
            <select
              value={months}
              onChange={(event) => setMonths(Number(event.target.value))}
              className="rounded-md border border-zinc-300 bg-white px-2 py-1 text-sm text-zinc-700 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200"
            >
              {WINDOW_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option} months
                </option>
              ))}
            </select>
            <NavTabs />
          </div>
        </header>

        {error ? (
          <section className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-200">
            Failed to load historical analytics: {error}
          </section>
        ) : null}

        <section className="grid gap-4 sm:grid-cols-3">
          <MetricCard label={`Junior (${months}m)`} value={totalByLevel.junior} />
          <MetricCard label={`Mid (${months}m)`} value={totalByLevel.mid} />
          <MetricCard label={`Senior (${months}m)`} value={totalByLevel.senior} />
        </section>

        <section className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-zinc-200 dark:bg-zinc-950 dark:ring-zinc-800">
          <h2 className="text-sm font-semibold">Monthly Trend ({months} Months)</h2>
          {!data || loading ? (
            <div className="py-10 text-center text-sm text-zinc-500 dark:text-zinc-400">
              Loading trend data...
            </div>
          ) : (
            <div className="mt-4 h-80 w-full min-w-0">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data.series} margin={{ left: -16, right: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e4e4e7" vertical={false} />
                  <XAxis
                    dataKey="month"
                    tickLine={false}
                    axisLine={false}
                    tick={{ fontSize: 11, fill: "#71717a" }}
                    interval={1}
                  />
                  <YAxis
                    allowDecimals={false}
                    tickLine={false}
                    axisLine={false}
                    tick={{ fontSize: 11, fill: "#71717a" }}
                  />
                  <Tooltip
                    contentStyle={{
                      borderRadius: 8,
                      borderColor: "#e4e4e7",
                      fontSize: 12,
                    }}
                  />
                  <Legend />
                  <Line type="monotone" dataKey="junior" stroke="#f59e0b" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="mid" stroke="#0ea5e9" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="senior" stroke="#10b981" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

function MetricCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-zinc-200 dark:bg-zinc-950 dark:ring-zinc-800">
      <div className="text-xs font-medium uppercase tracking-wide text-zinc-500">
        {label}
      </div>
      <div className="mt-2 text-2xl font-semibold">{value}</div>
    </div>
  );
}
