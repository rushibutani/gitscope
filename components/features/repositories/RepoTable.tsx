"use client";
import { useMemo, useState } from "react";
import type { AnalysisCoverage, RepositoryDisplay } from "../../../types/github";
import { ExternalLinkIcon, SearchIcon } from "../../ui";
import { formatCompactNumber } from "../../../lib/utils/formatting";

type SortKey = "name" | "language" | "stars" | "forks" | "updated";
type SortDirection = "asc" | "desc";
const PAGE_SIZE = 20;

/** Which repositories the table holds: all public ones, or only the most recent 100. */
function scopeNote({ publicRepos, fetchedRepos }: AnalysisCoverage) {
  return publicRepos > fetchedRepos
    ? `Original repositories among the ${fetchedRepos} most recently updated of ${publicRepos.toLocaleString("en-US")} public ones.`
    : "Every original public repository. Forks aren’t listed.";
}

export default function RepoTable({ repositories, coverage }: { repositories: RepositoryDisplay[]; coverage: AnalysisCoverage }) {
  const [query, setQuery] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("stars");
  const [direction, setDirection] = useState<SortDirection>("desc");
  const [limit, setLimit] = useState(PAGE_SIZE);
  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const rows = needle ? repositories.filter(repo => [repo.name, repo.description, repo.language].some(value => value.toLowerCase().includes(needle))) : repositories;
    return [...rows].sort((a, b) => {
      const multiplier = direction === "asc" ? 1 : -1;
      if (sortKey === "name") return a.name.localeCompare(b.name) * multiplier;
      if (sortKey === "language") return a.language.localeCompare(b.language) * multiplier;
      if (sortKey === "updated") return (new Date(a.updatedAtIso).getTime() - new Date(b.updatedAtIso).getTime()) * multiplier;
      return (a[sortKey] - b[sortKey]) * multiplier;
    });
  }, [repositories, query, sortKey, direction]);
  const visible = filtered.slice(0, limit);
  function sortBy(key: SortKey) {
    setLimit(PAGE_SIZE);
    if (key === sortKey) setDirection(current => current === "asc" ? "desc" : "asc");
    else { setSortKey(key); setDirection(key === "name" || key === "language" ? "asc" : "desc"); }
  }
  const headers: [string, SortKey][] = [["Repository", "name"], ["Language", "language"], ["Stars", "stars"], ["Forks", "forks"], ["Updated", "updated"]];
  return <section aria-labelledby="repository-heading"><div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between"><div><h2 id="repository-heading" className="text-xl font-semibold tracking-tight">Repository Explorer</h2><p className="mt-1.5 text-sm text-muted">{scopeNote(coverage)}</p></div>
    <div className="flex flex-col gap-2 sm:flex-row"><label className="relative"><span className="sr-only">Search repositories</span><SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-muted"/><input value={query} onChange={event => { setQuery(event.target.value); setLimit(PAGE_SIZE); }} className="control-input pl-9" placeholder="Search repositories…"/></label><label className="md:hidden"><span className="sr-only">Sort repositories</span><select className="control-input min-w-40" value={`${sortKey}:${direction}`} onChange={event => { const [key, nextDirection] = event.target.value.split(":") as [SortKey, SortDirection]; setSortKey(key); setDirection(nextDirection); setLimit(PAGE_SIZE); }}><option value="stars:desc">Stars ↓</option><option value="forks:desc">Forks ↓</option><option value="updated:desc">Recently updated</option><option value="name:asc">Name A–Z</option></select></label></div></div>
    <p className="mt-5 text-xs text-muted">Showing {visible.length} of {filtered.length} matching repositories</p><div className="mt-3 border-y border-border">
      <div className="hidden grid-cols-[minmax(0,1fr)_140px_90px_90px_130px] gap-4 border-b border-border px-4 py-3 text-xs uppercase tracking-wider text-muted md:grid" role="group" aria-label="Sort repositories">{headers.map(([label, key], index) => <div key={key}><button type="button" onClick={() => sortBy(key)} className={`focus-ring flex w-full min-h-8 items-center gap-1 rounded hover:text-foreground ${index > 1 ? "justify-end" : ""}`} aria-label={`Sort by ${label}${sortKey === key ? (direction === "asc" ? ", ascending" : ", descending") : ""}`}>{label}<span aria-hidden="true">{sortKey === key ? (direction === "asc" ? "↑" : "↓") : "↕"}</span></button></div>)}</div>
      <div className="divide-y divide-border">{visible.map(repo => <article key={repo.id} className="repo-row"><div className="min-w-0"><a href={repo.url} target="_blank" rel="noopener noreferrer" aria-label={`${repo.name} repository on GitHub (opens in a new tab)`} className="focus-ring inline-flex max-w-full items-center gap-2 rounded font-mono text-[15px] font-medium hover:text-primary"><span className="truncate">{repo.name}</span><ExternalLinkIcon className="shrink-0"/></a><p className="mt-2 line-clamp-2 text-[13px] leading-5 text-muted">{repo.description}</p><div className="mt-4 flex flex-wrap items-center gap-4 text-xs text-muted md:hidden"><Language repo={repo}/><span aria-label={`${repo.stars} stars`}>★ {formatCompactNumber(repo.stars)}</span><span>{formatCompactNumber(repo.forks)} forks</span><span>Updated {repo.updatedAt}</span></div></div><div className="hidden md:block"><Language repo={repo}/></div><span className="hidden text-right font-mono text-xs tabular-nums md:block" title={`${repo.stars.toLocaleString()} stars`}>{formatCompactNumber(repo.stars)}</span><span className="hidden text-right font-mono text-xs tabular-nums text-muted md:block" title={`${repo.forks.toLocaleString()} forks`}>{formatCompactNumber(repo.forks)}</span><span className="hidden text-right text-xs text-muted md:block">{repo.updatedAt}</span></article>)}</div>
      {!filtered.length && <p role="status" className="py-10 text-center text-sm text-muted">No repositories match your search.</p>}
    </div>{visible.length < filtered.length && <div className="mt-6 text-center"><button type="button" className="secondary-button" onClick={() => setLimit(current => current + PAGE_SIZE)}>Load more</button></div>}
  </section>;
}
function Language({ repo }: { repo: RepositoryDisplay }) { return <span className="inline-flex items-center gap-2 text-xs text-muted"><span className="h-2 w-2 rounded-full" style={{ backgroundColor: repo.languageColor }}/>{repo.language || "Unknown"}</span>; }
