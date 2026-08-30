import {
  GitHubUser,
  GitHubRepository,
  ContributionCalendar,
  ContributionDay,
  ContributionWeek,
  ApiError,
} from "../types/github";
import { env } from "../env";
import { retryWithBackoff } from "./utils/retry";
import { logger } from "./utils/logger";

const GITHUB_API_BASE = "https://api.github.com";
let configuredTokenIsUsable = true;

// Language color mapping (subset of popular languages)
export const LANGUAGE_COLORS: Record<string, string> = {
  JavaScript: "#f1e05a",
  TypeScript: "#3178c6",
  Python: "#3572A5",
  Java: "#b07219",
  "C++": "#f34b7d",
  C: "#555555",
  "C#": "#178600",
  Go: "#00ADD8",
  Rust: "#dea584",
  Ruby: "#701516",
  PHP: "#4F5D95",
  Swift: "#F05138",
  Kotlin: "#A97BFF",
  Dart: "#00B4AB",
  Shell: "#89e051",
  HTML: "#e34c26",
  CSS: "#563d7c",
  Vue: "#41b883",
  Svelte: "#ff3e00",
  "Jupyter Notebook": "#DA5B0B",
  R: "#198CE7",
  Scala: "#c22d40",
  Elixir: "#6e4a7e",
  Haskell: "#5e5086",
  Lua: "#000080",
  Perl: "#0298c3",
  "Objective-C": "#438eff",
};

export class GitHubApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public type: ApiError["type"]
  ) {
    super(message);
    this.name = "GitHubApiError";
  }
}

async function fetchWithErrorHandling<T>(url: string): Promise<T> {
  return retryWithBackoff(
    async () => {
      try {
        const headers: HeadersInit = {
          Accept: "application/vnd.github.v3+json",
        };

        // Use GitHub token if available (increases rate limit from 60 to 5000/hour)
        const token = configuredTokenIsUsable ? env.GITHUB_TOKEN : undefined;
        if (token) {
          headers.Authorization = `Bearer ${token}`;
        }

        let response = await fetch(url, {
          headers,
          next: { revalidate: 3600 }, // Cache for 1 hour
        });

        // A token is optional for every endpoint used by this application.
        // If a locally configured token has expired or been revoked, retry the
        // public request without credentials instead of failing the profile.
        if (response.status === 401 && token) {
          configuredTokenIsUsable = false;
          logger.warn("GitHub token was rejected; retrying anonymously", {
            url,
          });
          response = await fetch(url, {
            headers: {
              Accept: "application/vnd.github.v3+json",
            },
            next: { revalidate: 3600 },
          });
        }

        if (!response.ok) {
          if (response.status === 401) {
            throw new GitHubApiError(
              "GitHub authentication failed",
              401,
              "server_error"
            );
          }

          if (response.status === 404) {
            throw new GitHubApiError("GitHub user not found", 404, "not_found");
          }

          if (response.status === 403) {
            const rateLimitRemaining = response.headers.get(
              "X-RateLimit-Remaining"
            );
            const rateLimitReset = response.headers.get("X-RateLimit-Reset");
            const rateLimitLimit = response.headers.get("X-RateLimit-Limit");

            if (rateLimitRemaining === "0") {
              let resetMessage = "";
              if (rateLimitReset) {
                const resetDate = new Date(Number(rateLimitReset) * 1000);
                const minutesUntilReset = Math.ceil(
                  (resetDate.getTime() - Date.now()) / 60000
                );
                resetMessage =
                  minutesUntilReset > 0
                    ? ` Please try again in ${minutesUntilReset} minute${minutesUntilReset > 1 ? "s" : ""}.`
                    : " You can try searching again now.";
              }

              throw new GitHubApiError(
                `Too many searches right now.${resetMessage}`,
                403,
                "rate_limit"
              );
            }
          }

          throw new GitHubApiError(
            `GitHub API error: ${response.statusText}`,
            response.status,
            "server_error"
          );
        }

        return response.json();
      } catch (error) {
        if (error instanceof GitHubApiError) {
          throw error;
        }

        throw new GitHubApiError(
          "Failed to connect to GitHub API",
          500,
          "network_error"
        );
      }
    },
    {
      maxAttempts: 3,
      onRetry: (attempt, error) => {
        logger.info("Retrying GitHub API request", {
          attempt,
          url,
          error: error.message,
        });
      },
    }
  );
}

export async function fetchUserProfile(username: string): Promise<GitHubUser> {
  return fetchWithErrorHandling<GitHubUser>(
    `${GITHUB_API_BASE}/users/${username}`
  );
}

export async function fetchUserRepositories(
  username: string
): Promise<GitHubRepository[]> {
  const repos = await fetchWithErrorHandling<GitHubRepository[]>(
    `${GITHUB_API_BASE}/users/${username}/repos?per_page=100&sort=updated`
  );

  return repos;
}

export async function fetchRepositoryLanguages(
  owner: string,
  repo: string
): Promise<Record<string, number>> {
  return fetchWithErrorHandling<Record<string, number>>(
    `${GITHUB_API_BASE}/repos/${owner}/${repo}/languages`
  );
}

/**
 * Fetch the real public contribution calendar rendered by GitHub profiles.
 * GitHub's REST user endpoint does not expose this data, while this public
 * profile endpoint includes exact daily counts and GitHub's intensity levels.
 */
export async function fetchPublicContributionCalendar(
  username: string
): Promise<ContributionCalendar> {
  const response = await fetch(
    `https://github.com/users/${encodeURIComponent(username)}/contributions`,
    {
      headers: {
        Accept: "text/html",
        "User-Agent": "gitscope",
      },
      next: { revalidate: 3600 },
    }
  );

  if (!response.ok) {
    throw new GitHubApiError(
      "GitHub contribution data is unavailable",
      response.status,
      response.status === 429 ? "rate_limit" : "server_error"
    );
  }

  const html = await response.text();
  const tooltipCounts = new Map<string, number>();
  const tooltipPattern =
    /<tool-tip[^>]*for="([^"]+)"[^>]*>([^<]*)<\/tool-tip>/g;

  for (const match of html.matchAll(tooltipPattern)) {
    const countMatch = match[2].match(/([\d,]+) contribution/);
    tooltipCounts.set(
      match[1],
      countMatch ? Number(countMatch[1].replace(/,/g, "")) : 0
    );
  }

  const days: ContributionDay[] = [];
  const cellPattern = /<td[^>]*data-date="([^"]+)"[^>]*id="([^"]+)"[^>]*data-level="([0-4])"[^>]*>/g;

  for (const match of html.matchAll(cellPattern)) {
    days.push({
      date: match[1],
      count: tooltipCounts.get(match[2]) ?? 0,
      level: Number(match[3]) as ContributionDay["level"],
    });
  }

  if (days.length < 300) {
    throw new GitHubApiError(
      "GitHub contribution data could not be read",
      502,
      "server_error"
    );
  }

  days.sort((a, b) => a.date.localeCompare(b.date));
  const weekMap = new Map<string, ContributionDay[]>();

  for (const day of days) {
    const date = new Date(`${day.date}T00:00:00`);
    date.setDate(date.getDate() - date.getDay());
    const weekKey = [
      date.getFullYear(),
      String(date.getMonth() + 1).padStart(2, "0"),
      String(date.getDate()).padStart(2, "0"),
    ].join("-");
    const week = weekMap.get(weekKey) ?? [];
    week.push(day);
    weekMap.set(weekKey, week);
  }

  return {
    totalContributions: days.reduce((sum, day) => sum + day.count, 0),
    weeks: Array.from(weekMap.values()).map((contributionDays) => ({
      contributionDays,
    })),
    source: "github",
  };
}

/**
 * Build a calendar of public repository update signals. This is deliberately
 * not presented as a commit or GitHub contribution count.
 */
export async function generateContributionCalendar(
  repositories: GitHubRepository[]
): Promise<ContributionCalendar> {
  const now = new Date();
  const oneYearAgo = new Date(
    now.getFullYear() - 1,
    now.getMonth(),
    now.getDate()
  );

  // Create a map of dates to contribution counts
  const contributionMap = new Map<string, number>();

  // Initialize all dates in the past year with 0 contributions
  let currentDate = new Date(oneYearAgo);
  while (currentDate <= now) {
    const dateStr = currentDate.toISOString().split("T")[0];
    contributionMap.set(dateStr, 0);
    currentDate.setDate(currentDate.getDate() + 1);
  }

  // Record repository update signals from public pushed_at timestamps.
  repositories.forEach((repo) => {
    const pushedDate = new Date(repo.pushed_at);
    if (pushedDate >= oneYearAgo && pushedDate <= now) {
      const dateStr = pushedDate.toISOString().split("T")[0];
      const current = contributionMap.get(dateStr) || 0;
      contributionMap.set(dateStr, current + 1);
    }
  });

  // Convert to week-based structure
  const weeks: ContributionWeek[] = [];
  let currentWeek: ContributionWeek = { contributionDays: [] };

  currentDate = new Date(oneYearAgo);
  let totalContributions = 0;

  while (currentDate <= now) {
    const dateStr = currentDate.toISOString().split("T")[0];
    const count = contributionMap.get(dateStr) || 0;
    totalContributions += count;

    let level: 0 | 1 | 2 | 3 | 4 = 0;
    if (count > 0) level = 1;
    if (count >= 2) level = 2;
    if (count >= 4) level = 3;
    if (count >= 6) level = 4;

    currentWeek.contributionDays.push({
      date: dateStr,
      count,
      level,
    });

    // Start new week on Sunday
    if (currentDate.getDay() === 6) {
      weeks.push(currentWeek);
      currentWeek = { contributionDays: [] };
    }

    currentDate.setDate(currentDate.getDate() + 1);
  }

  // The range usually ends mid-week. Always retain that final partial week;
  // comparing timestamps with `now` is unreliable across daylight-saving
  // changes and previously caused the last cell to be omitted.
  if (currentWeek.contributionDays.length > 0) {
    weeks.push(currentWeek);
  }

  return {
    totalContributions,
    weeks,
    source: "repository_updates",
  };
}

export function getLanguageColor(language: string): string {
  return LANGUAGE_COLORS[language] || "#8b949e";
}
