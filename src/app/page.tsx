"use client";

import { useEffect, useMemo, useState } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { Job, JobsResponse, JobSource, RoleType, WorkMode } from "@/lib/jobs";

type TimeRange = 7 | 14 | 30;

const sourceLabels: Record<JobSource, string> = {
  greenhouse: "Greenhouse",
  lever: "Lever",
  ashby: "Ashby",
};

export default function Home() {
  const [data, setData] = useState<JobsResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [roleFilter, setRoleFilter] = useState<RoleType | "all">("all");
  const [workModeFilter, setWorkModeFilter] = useState<WorkMode | "all">(
    "all",
  );
  const [timeRange, setTimeRange] = useState<TimeRange>(14);

  const refreshJobs = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch("/api/jobs", { cache: "no-store" });
      if (!response.ok) {
        throw new Error(`Request failed with status ${response.status}`);
      }

      const json = (await response.json()) as JobsResponse;
      setData(json);
    } catch (fetchError) {
      setError(
        fetchError instanceof Error ? fetchError.message : "Unknown error",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void refreshJobs();
  }, []);

  const filteredJobs = useMemo(() => {
    return (data?.jobs ?? []).filter((job) => {
      if (roleFilter !== "all" && job.roleType !== roleFilter) return false;
      if (workModeFilter !== "all" && job.workMode !== workModeFilter)
        return false;
      return true;
    });
  }, [data, roleFilter, workModeFilter]);

  const totalJobs = filteredJobs.length;
  const sweJobs = filteredJobs.filter((job) => job.roleType === "swe").length;
  const dataJobs = filteredJobs.filter((job) => job.roleType === "data").length;

  const workModeCounts: Record<WorkMode, number> = useMemo(() => {
    const counts: Record<WorkMode, number> = {
      remote: 0,
      hybrid: 0,
      onsite: 0,
    };

    for (const job of filteredJobs) {
      counts[job.workMode] += 1;
    }

    return counts;
  }, [filteredJobs]);

  const providerSummary = useMemo(() => {
    const providers = data?.providers ?? [];
    return providers.map((provider) => sourceLabels[provider]).join(", ");
  }, [data?.providers]);

  const lastUpdated = data?.fetchedAt
    ? new Date(data.fetchedAt).toLocaleString()
    : null;

  const dailySeries = useMemo(() => {
    if (!filteredJobs.length) {
      return [];
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const days: { dateLabel: string; key: string; count: number }[] = [];
    for (let i = timeRange - 1; i >= 0; i -= 1) {
      const day = new Date(today);
      day.setDate(today.getDate() - i);
      days.push({
        dateLabel: day.toLocaleDateString(undefined, {
          month: "short",
          day: "numeric",
        }),
        key: day.toISOString().slice(0, 10),
        count: 0,
      });
    }

    const indexByKey = new Map(days.map((day, index) => [day.key, index]));
    for (const job of filteredJobs) {
      const day = new Date(job.postedAt);
      day.setHours(0, 0, 0, 0);
      const index = indexByKey.get(day.toISOString().slice(0, 10));
      if (index !== undefined) {
        days[index].count += 1;
      }
    }

    return days;
  }, [filteredJobs, timeRange]);

  const maxDailyCount =
    dailySeries.length > 0
      ? Math.max(...dailySeries.map((day) => day.count), 1)
      : 1;

  return (
    <div className="min-h-screen bg-zinc-50 px-4 py-8 font-sans text-zinc-900 dark:bg-black dark:text-zinc-50">
      <main className="mx-auto flex max-w-6xl flex-col gap-8">
        <header className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">
              US Software &amp; Data Job Market
            </h1>
            <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
              Live ATS feeds from Greenhouse, Lever, and Ashby, normalized for
              SWE and data roles.
            </p>
            <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
              {data?.mode === "sample"
                ? "Database not configured, showing sample data."
                : `Active sources: ${providerSummary || "Loading sources…"}`}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => void refreshJobs()}
              disabled={loading}
              className="rounded-full bg-zinc-900 px-4 py-2 text-sm font-medium text-zinc-50 shadow-sm transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
            >
              {loading ? "Refreshing…" : "Refresh data"}
            </button>
            <div className="text-xs text-zinc-500 dark:text-zinc-400">
              {lastUpdated ? `Last ingested: ${lastUpdated}` : "Loading…"}
            </div>
          </div>
        </header>

        {error ? (
          <section className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-200">
            Failed to load jobs: {error}
          </section>
        ) : null}

        <section className="flex flex-wrap items-center gap-4 rounded-xl bg-white p-4 shadow-sm ring-1 ring-zinc-200 dark:bg-zinc-950 dark:ring-zinc-800">
          <div className="flex flex-col gap-1 text-sm">
            <span className="text-xs font-medium uppercase tracking-wide text-zinc-500">
              Role type
            </span>
            <div className="inline-flex rounded-full bg-zinc-100 p-1 text-xs dark:bg-zinc-900">
              {[
                { label: "All", value: "all" },
                { label: "SWE", value: "swe" },
                { label: "Data", value: "data" },
              ].map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() =>
                    setRoleFilter(option.value as RoleType | "all")
                  }
                  className={`rounded-full px-3 py-1 font-medium transition ${
                    roleFilter === option.value
                      ? "bg-white text-zinc-900 shadow-sm dark:bg-zinc-700 dark:text-zinc-50"
                      : "text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-50"
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-1 text-sm">
            <span className="text-xs font-medium uppercase tracking-wide text-zinc-500">
              Work mode
            </span>
            <div className="inline-flex rounded-full bg-zinc-100 p-1 text-xs dark:bg-zinc-900">
              {[
                { label: "All", value: "all" },
                { label: "Remote", value: "remote" },
                { label: "Hybrid", value: "hybrid" },
                { label: "On-site", value: "onsite" },
              ].map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() =>
                    setWorkModeFilter(option.value as WorkMode | "all")
                  }
                  className={`rounded-full px-3 py-1 font-medium transition ${
                    workModeFilter === option.value
                      ? "bg-white text-zinc-900 shadow-sm dark:bg-zinc-700 dark:text-zinc-50"
                      : "text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-50"
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
        </section>

        <section className="grid gap-4 sm:grid-cols-3">
          <KpiCard label="Total roles" value={loading && !data ? "…" : totalJobs} />
          <KpiCard label="SWE roles" value={sweJobs} />
          <KpiCard label="Data roles" value={dataJobs} />
        </section>

        <section className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-zinc-200 dark:bg-zinc-950 dark:ring-zinc-800">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold">Roles by work mode</h2>
          </div>
          <div className="mt-2 flex gap-4">
            {(["remote", "hybrid", "onsite"] as WorkMode[]).map((mode) => {
              const count = workModeCounts[mode];
              const max = Math.max(...Object.values(workModeCounts), 1);
              const height = (count / max) * 100;
              const label =
                mode === "remote"
                  ? "Remote"
                  : mode === "hybrid"
                    ? "Hybrid"
                    : "On-site";

              return (
                <div
                  key={mode}
                  className="flex flex-1 flex-col items-center justify-end gap-2"
                >
                  <div className="flex h-32 w-full items-end justify-center rounded-full bg-zinc-100 p-1 dark:bg-zinc-900">
                    <div
                      className="w-full rounded-full bg-gradient-to-t from-zinc-900 to-zinc-600 dark:from-zinc-100 dark:to-zinc-300"
                      style={{ height: `${height || 4}%` }}
                    />
                  </div>
                  <div className="text-xs font-medium text-zinc-600 dark:text-zinc-300">
                    {label}
                  </div>
                  <div className="text-xs text-zinc-500 dark:text-zinc-400">
                    {count} roles
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        <section className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-zinc-200 dark:bg-zinc-950 dark:ring-zinc-800">
          <div className="mb-3 flex items-center justify-between gap-2">
            <h2 className="text-sm font-semibold">Roles over time</h2>
            <div className="flex items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400">
              <span>Range</span>
              <select
                value={timeRange}
                onChange={(event) =>
                  setTimeRange(Number(event.target.value) as TimeRange)
                }
                className="rounded-full border border-zinc-200 bg-white px-2 py-1 text-xs text-zinc-700 shadow-sm outline-none focus:border-zinc-400 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
              >
                <option value={7}>Last 7 days</option>
                <option value={14}>Last 14 days</option>
                <option value={30}>Last 30 days</option>
              </select>
            </div>
          </div>
          {dailySeries.length === 0 ? (
            <div className="py-6 text-center text-sm text-zinc-500 dark:text-zinc-400">
              {loading ? "Loading roles…" : "No roles in this range."}
            </div>
          ) : (
            <div className="mt-2 flex flex-col gap-2">
              <div className="h-40 w-full min-w-0">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={dailySeries} margin={{ left: -24, right: 8 }}>
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="#e4e4e7"
                      vertical={false}
                    />
                    <XAxis
                      dataKey="dateLabel"
                      tickLine={false}
                      axisLine={false}
                      tick={{ fontSize: 10, fill: "#71717a" }}
                    />
                    <YAxis
                      allowDecimals={false}
                      tickLine={false}
                      axisLine={false}
                      tick={{ fontSize: 10, fill: "#71717a" }}
                    />
                    <Tooltip
                      cursor={{ stroke: "#e4e4e7", strokeWidth: 1 }}
                      contentStyle={{
                        borderRadius: 6,
                        borderColor: "#e4e4e7",
                        padding: "4px 8px",
                        fontSize: 12,
                      }}
                      labelStyle={{ fontWeight: 500, marginBottom: 2 }}
                      formatter={(value) => [`${value} roles`, "Count"]}
                    />
                    <Line
                      type="monotone"
                      dataKey="count"
                      stroke="#a1a1aa"
                      strokeWidth={2}
                      dot={{ r: 3, fill: "#ffffff", stroke: "#a1a1aa" }}
                      activeDot={{ r: 4 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
              <div className="text-xs text-zinc-500 dark:text-zinc-400">
                Max {maxDailyCount} roles/day in this range.
              </div>
            </div>
          )}
        </section>

        <section className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-zinc-200 dark:bg-zinc-950 dark:ring-zinc-800">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold">Live roles</h2>
            <span className="text-xs text-zinc-500 dark:text-zinc-400">
              Showing {filteredJobs.length} of {data?.jobs.length ?? 0} roles
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="border-b border-zinc-200 text-xs uppercase text-zinc-500 dark:border-zinc-800">
                <tr>
                  <th className="py-2 pr-4">Title</th>
                  <th className="py-2 pr-4">Company</th>
                  <th className="py-2 pr-4">Source</th>
                  <th className="py-2 pr-4">Location</th>
                  <th className="py-2 pr-4">Role</th>
                  <th className="py-2 pr-4">Mode</th>
                  <th className="py-2 pr-4">Salary</th>
                  <th className="py-2 pr-4">Posted</th>
                  <th className="py-2 pr-4">Tech</th>
                </tr>
              </thead>
              <tbody>
                {filteredJobs.map((job) => (
                  <JobRow key={job.id} job={job} />
                ))}
                {filteredJobs.length === 0 ? (
                  <tr>
                    <td
                      colSpan={9}
                      className="py-6 text-center text-sm text-zinc-500 dark:text-zinc-400"
                    >
                      {loading
                        ? "Loading roles…"
                        : "No roles match the current filters."}
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </section>
      </main>
    </div>
  );
}

function KpiCard({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) {
  return (
    <div className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-zinc-200 dark:bg-zinc-950 dark:ring-zinc-800">
      <div className="text-xs font-medium uppercase tracking-wide text-zinc-500">
        {label}
      </div>
      <div className="mt-2 text-2xl font-semibold">{value}</div>
    </div>
  );
}

function JobRow({ job }: { job: Job }) {
  const salaryLabel =
    job.salaryMin && job.salaryMax
      ? `$${(job.salaryMin / 1000).toFixed(0)}k-$${(
          job.salaryMax / 1000
        ).toFixed(0)}k`
      : "n/a";

  return (
    <tr className="border-b border-zinc-100 align-top last:border-0 dark:border-zinc-900">
      <td className="py-3 pr-4 font-medium">
        <a
          href={job.sourceUrl}
          target="_blank"
          rel="noreferrer"
          className="hover:underline"
        >
          {job.title}
        </a>
        <div className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
          <a
            href={job.applyUrl ?? job.sourceUrl}
            target="_blank"
            rel="noreferrer"
            className="hover:underline"
          >
            Apply
          </a>
        </div>
      </td>
      <td className="py-3 pr-4 text-zinc-700 dark:text-zinc-300">
        {job.company}
      </td>
      <td className="py-3 pr-4">
        <span className="rounded-full bg-zinc-100 px-2 py-1 text-xs text-zinc-700 dark:bg-zinc-900 dark:text-zinc-300">
          {sourceLabels[job.source]}
        </span>
      </td>
      <td className="py-3 pr-4 text-zinc-700 dark:text-zinc-300">
        {job.location}
      </td>
      <td className="py-3 pr-4 text-xs uppercase text-zinc-600 dark:text-zinc-400">
        {job.roleType === "swe" ? "SWE" : "Data"}
      </td>
      <td className="py-3 pr-4 text-xs capitalize text-zinc-600 dark:text-zinc-400">
        {job.workMode}
      </td>
      <td className="py-3 pr-4 text-zinc-700 dark:text-zinc-300">
        {salaryLabel}
      </td>
      <td className="py-3 pr-4 text-xs text-zinc-600 dark:text-zinc-400">
        {new Date(job.postedAt).toLocaleDateString()}
      </td>
      <td className="py-3 pr-4 text-xs text-zinc-700 dark:text-zinc-300">
        {job.technologies.length > 0 ? job.technologies.join(", ") : "n/a"}
      </td>
    </tr>
  );
}
