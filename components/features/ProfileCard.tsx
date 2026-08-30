import Image from "next/image";
import type { ProfileData } from "../../types/github";
import { CalendarIcon, CompanyIcon, ExternalLinkIcon, LocationIcon } from "../ui";
import { formatCompactNumber } from "../../lib/utils/formatting";

export default function ProfileCard({ profile }: { profile: ProfileData }) {
  const website = profile.blog && (profile.blog.startsWith("http") ? profile.blog : `https://${profile.blog}`);
  return <section aria-labelledby="profile-title" className="border-b border-border pb-10">
    <p className="eyebrow mb-6">Profile overview</p>
    <div className="grid gap-7 md:grid-cols-[auto_minmax(0,1fr)_auto] md:items-center">
      <Image src={profile.avatarUrl} alt={`${profile.name}'s avatar`} width={96} height={96} priority className="h-20 w-20 rounded-xl bg-surface object-cover ring-1 ring-border sm:h-24 sm:w-24" />
      <div className="min-w-0"><h1 id="profile-title" className="truncate text-3xl font-semibold tracking-[-.03em]">{profile.name}</h1><p className="mt-1 font-mono text-sm text-primary">@{profile.username}</p>
        {profile.bio && <p className="mt-4 max-w-2xl text-sm leading-6 text-muted">{profile.bio}</p>}
        <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-xs text-muted">{profile.location && <span className="inline-flex items-center gap-1.5"><LocationIcon />{profile.location}</span>}{profile.company && <span className="inline-flex items-center gap-1.5"><CompanyIcon />{profile.company}</span>}<span className="inline-flex items-center gap-1.5"><CalendarIcon />Joined {profile.joinDate}</span></div>
        <div className="mt-4 flex flex-wrap gap-4 text-xs"><a className="text-link" href={profile.profileUrl} target="_blank" rel="noreferrer">View on GitHub <ExternalLinkIcon /></a>{website && <a className="text-link" href={website} target="_blank" rel="noreferrer">Website <ExternalLinkIcon /></a>}</div>
      </div>
      <dl className="grid grid-cols-3 gap-6 border-t border-border pt-5 text-right md:grid-cols-1 md:border-l md:border-t-0 md:pl-8 md:pt-0">{[["Followers", profile.followers], ["Following", profile.following], ["Public repos", profile.publicRepos]].map(([label, value]) => <div key={label}><dt className="text-[11px] uppercase tracking-wider text-muted">{label}</dt><dd className="mt-1 font-mono text-base font-medium" title={Number(value).toLocaleString()}>{formatCompactNumber(Number(value))}</dd></div>)}</dl>
    </div>
  </section>;
}
