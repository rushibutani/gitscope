"use client";

import { useState } from "react";
import type { AnalysisCoverage, LanguageStats } from "../../types/github";
import { formatBytes } from "../../lib/utils/formatting";

const INITIAL_LANGUAGE_COUNT = 5;

/**
 * What every percentage below is a share of, said beside the chart. Languages are read for
 * up to ten of the latest original repositories; one that times out is left out, so the note
 * counts the ones that arrived.
 */
function sampleNote({ languageRepos }: AnalysisCoverage) {
  const sample = languageRepos === 1
    ? "the most recently updated original repository"
    : `${languageRepos} of the most recently updated original repositories`;
  return `Share of code by size, across ${sample}. Forks aren’t counted.`;
}

export default function LanguageChart({ languages, coverage }: { languages: LanguageStats[]; coverage: AnalysisCoverage }) {
  const [expanded, setExpanded] = useState(false);
  const primary = languages[0];
  const rows = expanded ? languages : languages.slice(0, INITIAL_LANGUAGE_COUNT);
  const remaining = Math.max(0, languages.length - INITIAL_LANGUAGE_COUNT);
  return <section aria-labelledby="technology-heading">
    <h2 id="technology-heading" className="text-xl font-semibold tracking-tight">Technology Profile</h2><p className="mt-1.5 text-sm text-muted">{sampleNote(coverage)}</p>
    {!primary ? <p className="mt-8 border-y border-border py-8 text-sm text-muted">No language data is available for these repositories.</p> : <>
      <div className="mt-7 flex items-end justify-between border-b border-border pb-6"><div><span className="text-xs uppercase tracking-wider text-muted">Primary language</span><p className="mt-2 font-mono text-2xl font-semibold">{primary.language}</p></div><p className="text-right text-sm text-muted"><strong className="block font-mono text-lg text-foreground">{primary.percentage.toFixed(1)}%</strong>of analyzed code</p></div>
      <div className="mt-6 space-y-5">{rows.map((language) => <div key={language.language} title={`${language.language}: ${formatBytes(language.bytes)}`}><div className="mb-2 flex items-center justify-between gap-3 text-sm"><span className="flex min-w-0 items-center gap-2 font-mono"><span className="h-2 w-2 rounded-sm" style={{backgroundColor: language.color}} aria-hidden="true" />{language.language}</span><span className="font-mono text-xs text-muted">{language.percentage.toFixed(1)}%</span></div><div className="relative h-1.5 rounded-sm bg-surface-2"><div className="h-full rounded-sm" style={{ width: `${language.percentage}%`, backgroundColor: language.color }} />{language.percentage > 0 && language.percentage < 1 && <span className="absolute left-0 top-1/2 h-2.5 w-0.5 -translate-y-1/2 rounded-full" style={{backgroundColor: language.color}} aria-hidden="true" />}</div></div>)}</div>
      {remaining > 0 && <button type="button" className="focus-ring mt-6 min-h-11 rounded text-sm font-medium text-primary hover:text-[#55e294]" onClick={() => setExpanded(value => !value)} aria-expanded={expanded}>{expanded ? "Show fewer languages" : `View ${remaining} more language${remaining === 1 ? "" : "s"}`}</button>}
      <p className="sr-only">{languages.map(language => `${language.language} ${language.percentage.toFixed(1)} percent`).join(", ")}</p>
    </>}
  </section>;
}
