"use client";

import { useEffect, useMemo, useState } from "react";
import type { Job, RoleType, WorkMode } from "@/lib/jobs";

interface JobsResponse {
  jobs: Job[];
  fetchedAt: string;
}

export default function Home() {
  const [data, setData] = useState<JobsResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [roleFilter, setRoleFilter] = useState<RoleType | "all">("all");
  const [workModeFilter, setWorkModeFilter] = useState<WorkMode | "all">(
    "all",
  );

  const fetchJobs = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch("/api/jobs");
      if (!res.ok) {
        throw new Error(`Request failed with status ${res.status}`);
      }
      const json = (await res.json()) as JobsResponse;
      setData(json);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchJobs();
  }, []);

  const filteredJobs = useMemo(() => {
    if (!data) return [];
    return data.jobs.filter((job) => {
      if (roleFilter !== "all" && job.roleType !== roleFilter) return false;
      if (workModeFilter !== "all" && job.workMode !== workModeFilter)
        return false;
      return true;
    });
  }, [data, roleFilter, workModeFilter]);

  const totalJobs = filteredJobs.length;
  const sweJobs = filteredJobs.filter((j) => j.roleType === "swe").length;
  const dataJobs = filteredJobs.filter((j) => j.roleType === "data").length;

  const workModeCounts: Record<WorkMode, number> = useMemo(() => {
    const base: Record<WorkMode, number> = {
      remote: 0,
      hybrid: 0,
      onsite: 0,
    };
    for (const job of filteredJobs) {
      base[job.workMode] += 1;
    }
    return base;
  }, [filteredJobs]);

  const lastUpdated = data?.fetchedAt
    ? new Date(data.fetchedAt).toLocaleTimeString()
    : null;

  return (
    <div className="min-h-screen bg-zinc-50 px-4 py-8 font-sans text-zinc-900 dark:bg-black dark:text-zinc-50">
      <main className="mx-auto flex max-w-5xl flex-col gap-8">
        <header className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">
              US Software &amp; Data Job Market
            </h1>
            <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
              Local v0 – sample data, simple filters, and a real-time refresh
              button.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => void fetchJobs()}
              disabled={loading}
              className="rounded-full bg-zinc-900 px-4 py-2 text-sm font-medium text-zinc-50 shadow-sm transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
            >
              {loading ? "Refreshing…" : "Refresh data"}
            </button>
            <div className="text-xs text-zinc-500 dark:text-zinc-400">
              {lastUpdated ? `Last updated: ${lastUpdated}` : "Loading…"}
            </div>
          </div>
        </header>

        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-200">
            Failed to load jobs: {error}
          </div>
        )}

        {/* Filters */}
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

        {/* KPI cards */}
        <section className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-zinc-200 dark:bg-zinc-950 dark:ring-zinc-800">
            <div className="text-xs font-medium uppercase tracking-wide text-zinc-500">
              Total roles
            </div>
            <div className="mt-2 text-2xl font-semibold">
              {loading && !data ? "…" : totalJobs}
            </div>
          </div>
          <div className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-zinc-200 dark:bg-zinc-950 dark:ring-zinc-800">
            <div className="text-xs font-medium uppercase tracking-wide text-zinc-500">
              SWE roles
            </div>
            <div className="mt-2 text-2xl font-semibold">{sweJobs}</div>
          </div>
          <div className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-zinc-200 dark:bg-zinc-950 dark:ring-zinc-800">
            <div className="text-xs font-medium uppercase tracking-wide text-zinc-500">
              Data roles
            </div>
            <div className="mt-2 text-2xl font-semibold">{dataJobs}</div>
          </div>
        </section>

        {/* Simple bar chart for work mode */}
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
                      className="w-full rounded-full bg-gradient-to-t from-zinc-900 to-zinc-600 text-xs text-zinc-50 dark:from-zinc-100 dark:to-zinc-300"
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

        {/* Jobs table */}
        <section className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-zinc-200 dark:bg-zinc-950 dark:ring-zinc-800">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold">Roles (sample data)</h2>
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
                  <tr
                    key={job.id}
                    className="border-b border-zinc-100 align-top last:border-0 dark:border-zinc-900"
                  >
                    <td className="py-2 pr-4 font-medium">{job.title}</td>
                    <td className="py-2 pr-4 text-zinc-700 dark:text-zinc-300">
                      {job.company}
                    </td>
                    <td className="py-2 pr-4 text-zinc-700 dark:text-zinc-300">
                      {job.location}
                    </td>
                    <td className="py-2 pr-4 text-xs uppercase text-zinc-600 dark:text-zinc-400">
                      {job.roleType === "swe" ? "SWE" : "Data"}
                    </td>
                    <td className="py-2 pr-4 text-xs capitalize text-zinc-600 dark:text-zinc-400">
                      {job.workMode}
                    </td>
                    <td className="py-2 pr-4 text-zinc-700 dark:text-zinc-300">
                      {job.salaryMin && job.salaryMax
                        ? `$${(job.salaryMin / 1000).toFixed(0)}k–$${(
                            job.salaryMax / 1000
                          ).toFixed(0)}k`
                        : "n/a"}
                    </td>
                    <td className="py-2 pr-4 text-xs text-zinc-600 dark:text-zinc-400">
                      {new Date(job.postedAt).toLocaleDateString()}
                    </td>
                    <td className="py-2 pr-4 text-xs text-zinc-700 dark:text-zinc-300">
                      {job.technologies.join(", ")}
                    </td>
                  </tr>
                ))}
                {filteredJobs.length === 0 && (
                  <tr>
                    <td
                      colSpan={8}
                      className="py-6 text-center text-sm text-zinc-500 dark:text-zinc-400"
                    >
                      {loading
                        ? "Loading roles…"
                        : "No roles match the current filters."}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </main>
    </div>
  );
}

