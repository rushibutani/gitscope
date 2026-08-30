"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import ProfileCard from "../components/features/ProfileCard";
import ContributionChart from "../components/features/ContributionChart";
import LanguageChart from "../components/features/LanguageChart";
import RepoTable from "../components/features/repositories/RepoTable";
import Footer from "./_components/Footer";
import { fetchGitHubAnalytics } from "./actions/github";
import type { ApiError, GitHubAnalytics, RepositoryDisplay } from "../types/github";
import { ActivityIcon, ExternalLinkIcon, GitHubIcon, LayersIcon, RepositoryIcon, SearchIcon, SpinnerIcon } from "../components/ui";
import { formatCompactNumber } from "../lib/utils/formatting";
import GitScopeBrand from "../components/brand/GitScopeBrand";

type PageState = "empty" | "loading" | "error" | "success";
const normalizeUsername = (value: string) => value.trim().replace(/^@+/, "");

export default function ClientPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const initialUser = normalizeUsername(searchParams.get("user") || "");
  const [searchValue, setSearchValue] = useState(initialUser);
  const [username, setUsername] = useState(initialUser);
  const [pageState, setPageState] = useState<PageState>(initialUser ? "loading" : "empty");
  const [analytics, setAnalytics] = useState<GitHubAnalytics | null>(null);
  const [error, setError] = useState<ApiError | null>(null);
  const [validation, setValidation] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const heroRef = useRef<HTMLElement>(null);
  const [heroPassed, setHeroPassed] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const requestIdRef = useRef(0);

  async function loadProfile(user: string) {
    const requestId = ++requestIdRef.current;
    setPageState("loading"); setError(null);
    const result = await fetchGitHubAnalytics(user);
    if (requestId !== requestIdRef.current) return;
    if (result.error) { setError(result.error); setPageState("error"); return; }
    if (result.data) { setAnalytics(result.data); setPageState("success"); }
  }

  useEffect(() => {
    const urlUser = normalizeUsername(searchParams.get("user") || "");
    if (!urlUser) {
      requestIdRef.current++;
      setUsername(""); setSearchValue(""); setAnalytics(null); setError(null); setPageState("empty");
      return;
    }
    const isCurrentUser = urlUser.toLowerCase() === username.toLowerCase();
    const requestAlreadyStarted = requestIdRef.current > 0;
    if (isCurrentUser && (pageState === "success" || (pageState === "loading" && requestAlreadyStarted))) return;
    setUsername(urlUser); setSearchValue(urlUser); void loadProfile(urlUser);
    // Reconcile state from the URL so browser Back and Forward restore profiles.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);
  useEffect(() => {
    if (pageState !== "empty") { setHeroPassed(true); return; }
    const hero = heroRef.current;
    if (!hero) return;
    const observer = new IntersectionObserver(([entry]) => setHeroPassed(!entry.isIntersecting), { rootMargin: "-64px 0px 0px" });
    observer.observe(hero);
    return () => observer.disconnect();
  }, [pageState]);
  useEffect(() => {
    const updateHeader = () => setScrolled(window.scrollY > 4);
    updateHeader();
    window.addEventListener("scroll", updateHeader, { passive: true });
    return () => window.removeEventListener("scroll", updateHeader);
  }, []);
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "/" && !event.metaKey && !event.ctrlKey && !["INPUT", "TEXTAREA"].includes((event.target as HTMLElement).tagName)) { event.preventDefault(); inputRef.current?.focus(); }
    };
    window.addEventListener("keydown", onKeyDown); return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  function submit(value = searchValue) {
    const clean = normalizeUsername(value);
    if (!clean) { setValidation("Enter a GitHub username to continue."); inputRef.current?.focus(); return; }
    if (!/^[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,37}[a-zA-Z0-9])?$/.test(clean)) { setValidation("Use a valid GitHub username (letters, numbers, and hyphens)."); inputRef.current?.focus(); return; }
    if (loading) return;
    // The URL is the source of truth for the selected profile. Updating
    // `username` here would make the URL-sync effect think this profile was
    // already loaded and skip the request when navigating from one result to
    // another.
    setValidation(""); setSearchValue(clean);
    router.push(`/?user=${encodeURIComponent(clean.toLowerCase())}`, { scroll: false });
  }
  const loading = pageState === "loading";
  const showHeaderSearch = pageState !== "empty" || heroPassed;

  return <div className="min-h-screen bg-background text-foreground">
    <a href="#main-content" className="skip-link">Skip to content</a>
    <header className={`sticky top-0 z-40 border-b transition-[background-color,border-color,box-shadow,backdrop-filter] duration-300 ${scrolled ? "border-[#303844] bg-background shadow-[0_8px_24px_rgba(0,0,0,.32)]" : "border-[#272e37] bg-background/95 backdrop-blur-md"}`}>
      <div className={`mx-auto flex min-h-16 max-w-7xl items-center justify-between gap-3 px-4 py-2 sm:px-6 sm:py-2.5 lg:px-8 ${showHeaderSearch ? "flex-wrap md:flex-nowrap" : "flex-nowrap"}`}>
        <button onClick={() => router.push("/")} className="focus-ring shrink-0 rounded-lg text-left" aria-label="GitScope home">
          <GitScopeBrand />
        </button>
        <div className={`header-actions ${showHeaderSearch ? "header-actions-searching" : ""}`}>
          <div className={`header-search ${showHeaderSearch ? "header-search-visible" : ""}`}>
            <SearchForm inputRef={pageState === "empty" ? undefined : inputRef} value={searchValue} setValue={setSearchValue} submit={submit} loading={loading} validation={validation} compact />
          </div>
          <a href="https://github.com/rushibutani/gitscope" target="_blank" rel="noreferrer" className="header-repo-link focus-ring w-11 shrink-0 justify-center px-0 sm:w-auto sm:justify-start sm:px-3" aria-label="View the GitScope repository on GitHub"><GitHubIcon size={17} className="shrink-0" /><span className="hidden sm:inline">GitHub</span><ExternalLinkIcon className="hidden shrink-0 sm:block" /></a>
        </div>
      </div>
    </header>
    <main id="main-content" aria-busy={loading} className="mx-auto min-h-[calc(100vh-9rem)] w-full max-w-7xl px-4 py-9 sm:px-6 md:py-12 lg:px-8">
      {pageState === "empty" && <LandingSearch value={searchValue} setValue={setSearchValue} submit={submit} loading={loading} validation={validation} inputRef={inputRef} heroRef={heroRef} />}
      {pageState === "loading" && <DashboardSkeleton />}
      {pageState === "error" && error && <ErrorState error={error} username={username} retry={() => void loadProfile(username)} focusSearch={() => inputRef.current?.focus()} />}
      {pageState === "success" && analytics && <Dashboard analytics={analytics} />}
    </main>
    <Footer />
  </div>;
}

type SearchProps = { value: string; setValue: (value: string) => void; submit: (value?: string) => void; loading: boolean; validation: string; inputRef?: React.RefObject<HTMLInputElement | null>; compact?: boolean };

function SearchForm({ value, setValue, submit, loading, validation, inputRef, compact }: SearchProps) {
  return <form role="search" onSubmit={(e) => { e.preventDefault(); submit(); }} className={`search-form ${compact ? "md:max-w-[520px]" : "max-w-2xl"}`}>
    <div className="relative min-w-0 flex-1">
      {!compact && <span className="absolute left-3.5 top-1/2 -translate-y-1/2 border-r border-border pr-3 font-mono text-xs text-muted">github.com/</span>}
      {compact && <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />}
      <input ref={inputRef} name="github-username" value={value} onChange={(e) => setValue(e.target.value)} disabled={loading} aria-invalid={!!validation} aria-describedby={validation ? "search-error" : undefined} aria-label="GitHub username" autoCapitalize="none" autoComplete="on" spellCheck={false} placeholder="e.g. torvalds" className={`search-input ${compact ? "pl-9" : "pl-[106px]"}`} />
    </div>
    <button className="primary-button min-w-[142px]" disabled={loading} type="submit">{loading ? <><SpinnerIcon /> Analyzing…</> : "Analyze profile"}</button>
    {validation && <p id="search-error" role="alert" className="basis-full text-left text-xs text-danger">{validation}</p>}
  </form>;
}

function LandingSearch({ heroRef, ...props }: SearchProps & { heroRef: React.RefObject<HTMLElement | null> }) {
  return <section ref={heroRef} className="mx-auto flex max-w-5xl flex-col items-center pt-5 text-center md:pt-[clamp(2rem,6vh,3.5rem)]">
    <p className="eyebrow">GitHub developer insights</p>
    <h1 className="mt-5 max-w-3xl text-balance text-4xl font-semibold tracking-[-.04em] sm:text-5xl">Understand any GitHub profile at a glance.</h1>
    <p className="mt-5 max-w-2xl text-balance text-base leading-7 text-muted">Explore repositories, languages, activity patterns, and public development signals from GitHub data.</p>
    <div className="mt-8 w-full"><SearchForm {...props} /></div>
    <div className="mt-4 flex flex-wrap items-center justify-center gap-x-3 gap-y-2 text-xs text-muted"><span>Try an example</span>{["torvalds", "sindresorhus", "gaearon"].map((name) => <button key={name} onClick={() => props.submit(name)} className="focus-ring rounded font-mono text-foreground transition-colors hover:text-primary">{name}</button>)}</div>
    <div className="mt-16 w-full border-y border-border text-left"><div className="grid md:grid-cols-3">{[["01", "Activity", "Public repository update patterns across the last year.", ActivityIcon], ["02", "Stack", "Languages represented across original public repositories.", LayersIcon], ["03", "Repositories", "Projects ranked by stars, forks, and recency.", RepositoryIcon]].map(([number, title, copy, Icon], index) => <div key={title as string} className={`preview-item ${index ? "md:border-l md:border-border" : ""}`}><div className="flex items-center gap-3 text-primary"><Icon size={20} /><span className="font-mono text-xs">{number as string}</span></div><h2 className="mt-7 text-base font-medium">{title as string}</h2><p className="mt-2 text-sm leading-6 text-muted">{copy as string}</p></div>)}</div></div>
  </section>;
}

function Dashboard({ analytics }: { analytics: GitHubAnalytics }) {
  const { profile, activity, repositories, languages, contributions } = analytics;
  const totalForks = repositories.reduce((sum, repo) => sum + repo.forks, 0);
  return <div className="space-y-14"><ProfileCard profile={profile} />
    <section aria-label="Key profile metrics" className="metric-strip">{[["Total stars", activity.totalStars], ["Total forks", totalForks], [contributions.source === "github" ? "Contributions" : "Updated repos", contributions.totalContributions]].map(([label, value]) => <div key={label} className="metric-item"><strong title={Number(value).toLocaleString()}>{formatCompactNumber(Number(value))}</strong><span>{label}</span></div>)}</section>
    {!repositories.length ? <section className="rounded-xl border border-border bg-surface px-6 py-14 text-center"><p className="eyebrow">No repositories yet</p><h2 className="mt-3 text-2xl font-semibold">Nothing to analyze</h2><p className="mx-auto mt-3 max-w-lg text-sm leading-6 text-muted">This account has no original public repositories, so language, activity, and repository insights aren’t available yet.</p></section> : <><ContributionChart contributions={contributions} activity={activity} />
    <div className="grid gap-12 lg:grid-cols-[minmax(0,1.45fr)_minmax(280px,.55fr)]"><LanguageChart languages={languages} /><ProfileSignals analytics={analytics} /></div>
    <RepositoryHighlights repositories={repositories} /><RepoTable repositories={repositories} /></>}
  </div>;
}

function ProfileSignals({ analytics }: { analytics: GitHubAnalytics }) {
  const { languages, repositories, activity } = analytics; const top = languages[0];
  const totalStars = repositories.reduce((sum, r) => sum + r.stars, 0); const topShare = totalStars && repositories[0] ? Math.round((repositories[0].stars / totalStars) * 100) : 0;
  const topRepo = [...repositories].sort((a, b) => b.stars - a.stars)[0];
  const signals = [["Primary language", top ? `${top.language} · ${top.percentage.toFixed(1)}% of analyzed code` : "No language data"], ["Language breadth", languages.length ? `${languages.length} language${languages.length === 1 ? "" : "s"} represented` : "Not available"], ["Repository concentration", totalStars ? `${topShare}% of stars belong to the top repository (${topRepo.name})` : "No stars across analyzed repositories"], ["Recent maintenance", `${activity.activeReposCount} repos updated in the last 3 months`]];
  return <section><SectionHeading title="Profile Signals" description="Deterministic observations from public data." /><dl className="mt-6 divide-y divide-border border-y border-border">{signals.map(([term, detail]) => <div key={term} className="py-4"><dt className="text-xs uppercase tracking-wider text-muted">{term}</dt><dd className="mt-1.5 text-sm leading-6">{detail}</dd></div>)}</dl></section>;
}

function RepositoryHighlights({ repositories }: { repositories: RepositoryDisplay[] }) {
  if (!repositories.length) return null;
  const starred = [...repositories].sort((a,b) => b.stars-a.stars)[0];
  const pickDifferent = (sorted: RepositoryDisplay[], used: Set<number>) => sorted.find(repo => !used.has(repo.id)) || sorted[0];
  const used = new Set([starred.id]);
  const forked = pickDifferent([...repositories].sort((a,b) => b.forks-a.forks), used); used.add(forked.id);
  const recent = pickDifferent([...repositories].sort((a,b) => new Date(b.updatedAtIso).getTime()-new Date(a.updatedAtIso).getTime()), used);
  return <section><SectionHeading title="Repository Highlights" description="Notable projects based on stars, forks, and recent activity." /><div className="mt-6 grid border-y border-border md:grid-cols-3">{[["Most starred", starred, `${formatCompactNumber(starred.stars)} stars`], ["Most forked", forked, `${formatCompactNumber(forked.forks)} forks`], ["Recently updated", recent, recent.updatedAt]].map(([label, repo, stat], i) => { const item = repo as RepositoryDisplay; return <a key={label as string} href={item.url} target="_blank" rel="noreferrer" className={`highlight-row ${i ? "md:border-l md:border-border" : ""}`}><span className="text-xs text-muted">{label as string}</span><strong className="mt-5 flex items-center gap-2 truncate font-mono text-sm font-medium">{item.name}<ExternalLinkIcon /></strong><span className="mt-2 text-xs text-muted">{stat as string}</span></a>; })}</div></section>;
}

function SectionHeading({ title, description }: { title: string; description: string }) { return <div><h2 className="text-xl font-semibold tracking-tight">{title}</h2><p className="mt-1.5 text-sm text-muted">{description}</p></div>; }
function DashboardSkeleton() { return <div aria-label="Analyzing profile" aria-busy="true" className="space-y-10"><span className="sr-only">Analyzing profile</span><div className="skeleton h-36"/><div className="grid grid-cols-2 gap-px border-y border-border py-6 md:grid-cols-3">{[1,2,3].map(i=><div key={i} className="px-4"><div className="skeleton h-8 w-20"/><div className="skeleton mt-3 h-3 w-24"/></div>)}</div><div className="skeleton h-72"/><div className="grid gap-8 md:grid-cols-2"><div className="skeleton h-72"/><div className="skeleton h-72"/></div><div className="skeleton h-80"/></div>; }
function ErrorState({ error, username, retry, focusSearch }: { error: ApiError; username: string; retry: () => void; focusSearch: () => void }) {
  const content = error.type === "not_found" ? ["User not found", `We couldn't find a public GitHub profile for @${username}.`] : error.type === "rate_limit" ? ["GitHub rate limit reached", "GitHub's API limit has been reached. Please try again shortly."] : error.type === "network_error" ? ["Connection interrupted", "We couldn't reach GitHub. Check your connection and try again."] : ["Something went wrong", "The profile couldn't be analyzed right now. Please try again."];
  return <section role="alert" aria-live="polite" className="mx-auto max-w-xl border-y border-border py-16 text-center"><p className="eyebrow">Analysis unavailable</p><h1 className="mt-4 text-3xl font-semibold tracking-tight">{content[0]}</h1><p className="mt-3 text-sm leading-6 text-muted">{content[1]}</p><div className="mt-7 flex justify-center gap-3"><button className="secondary-button" onClick={focusSearch}>Try another username</button>{error.type !== "not_found" && <button className="primary-button" onClick={retry}>Retry</button>}</div></section>;
}
