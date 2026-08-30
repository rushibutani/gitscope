import GitScopeLogo from "../../components/brand/GitScopeLogo";

export default function HeroSection() {
  return (
    <div className="bg-gradient-to-b from-surface/50 to-transparent border-b border-border/50">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-surface/80 mb-6">
          <GitScopeLogo className="h-10 w-10 text-foreground" />
        </div>
        <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-3">
          GitScope
        </h1>
        <p className="text-lg text-muted max-w-xl mx-auto">
          Discover insights about any GitHub profile — contributions, languages,
          and project highlights
        </p>
      </div>
    </div>
  );
}
