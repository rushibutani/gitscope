import { Suspense } from "react";
import type { Metadata } from "next";
import ClientPage from "./ClientPage";
import { fetchGitHubAnalytics } from "./actions/github";

interface PageProps {
  searchParams: Promise<{ user?: string }>;
}

export async function generateMetadata({
  searchParams,
}: PageProps): Promise<Metadata> {
  const params = await searchParams;
  const username = params.user;

  if (!username) {
    return {
      title: "GitScope — GitHub Developer Insights",
      description:
        "Explore public GitHub profiles through repository, language, contribution, and development activity insights.",
    };
  }

  // Try to fetch basic info for better metadata (silent fail)
  try {
    const result = await fetchGitHubAnalytics(username);
    if (result.data) {
      const { profile } = result.data;
      return {
        title: `${profile.name} (@${profile.username}) — GitScope`,
        description: `Explore public GitHub repository, language, contribution, and activity insights for @${profile.username}.`,
        openGraph: {
          title: `${profile.name} (@${profile.username}) — GitScope`,
          description:
            profile.bio ||
            `Explore public GitHub repository, language, contribution, and activity insights for @${profile.username}.`,
          images: [profile.avatarUrl],
        },
      };
    }
  } catch (error) {
    // Silent fail - use default metadata
  }

  return {
    title: `@${username} — GitScope`,
    description: `Explore public GitHub repository, language, contribution, and activity insights for @${username}.`,
  };
}

export default function HomePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-background flex items-center justify-center">
          <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
        </div>
      }
    >
      <ClientPage />
    </Suspense>
  );
}
