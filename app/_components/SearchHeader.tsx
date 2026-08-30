import { Suspense } from "react";
import SearchForm from "../../components/layout/SearchForm";
import GitScopeBrand from "../../components/brand/GitScopeBrand";

interface SearchHeaderProps {
  hasResults?: boolean;
}

export default function SearchHeader({
  hasResults = false,
}: SearchHeaderProps) {
  return (
    <header className="border-b border-border/50 bg-card/80 backdrop-blur-sm sticky top-0 z-50">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          {hasResults && (
            <GitScopeBrand />
          )}
          <Suspense
            fallback={
              <div className="h-10 w-80 bg-surface/50 animate-pulse rounded-xl" />
            }
          >
            <SearchForm />
          </Suspense>
        </div>
      </div>
    </header>
  );
}
