import type { SVGProps } from "react";

type GitScopeLogoProps = SVGProps<SVGSVGElement> & { title?: string };

export default function GitScopeLogo({ title, ...props }: GitScopeLogoProps) {
  return (
    <svg viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden={title ? undefined : true} aria-label={title} role={title ? "img" : undefined} {...props}>
      <circle cx="14" cy="14" r="9.5" stroke="currentColor" strokeWidth="2.25" />
      <path d="M20.7 20.7 27 27M14 14h7" stroke="currentColor" strokeWidth="2.25" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M9.5 17v-2.5M14 17v-5M18.5 17V9" className="text-primary" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}
