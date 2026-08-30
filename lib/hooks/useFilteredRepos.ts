import { useMemo } from "react";

export type SortOption = "stars" | "forks" | "recent" | "name";

export interface Repository {
  id: number;
  name: string;
  description: string;
  stars: number;
  language: string;
  updatedAt: string;
  updatedAtIso?: string;
  forks?: number;
}

/**
 * Custom hook to filter and sort repositories
 */
export function useFilteredRepos<T extends Repository>(
  repositories: T[],
  searchQuery: string,
  sortBy: SortOption
): T[] {
  return useMemo(() => {
    let filtered = repositories;

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (repo) =>
          repo.name.toLowerCase().includes(query) ||
          repo.description.toLowerCase().includes(query) ||
          repo.language.toLowerCase().includes(query)
      );
    }

    // Apply sorting
    if (sortBy === "stars") {
      return [...filtered].sort((a, b) => b.stars - a.stars);
    } else if (sortBy === "forks") {
      return [...filtered].sort((a, b) => (b.forks || 0) - (a.forks || 0));
    } else if (sortBy === "name") {
      return [...filtered].sort((a, b) => a.name.localeCompare(b.name));
    } else {
      return [...filtered].sort(
        (a, b) =>
          new Date(b.updatedAtIso || b.updatedAt).getTime() -
          new Date(a.updatedAtIso || a.updatedAt).getTime()
      );
    }
  }, [repositories, sortBy, searchQuery]);
}
