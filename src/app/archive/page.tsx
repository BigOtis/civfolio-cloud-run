import Image from "next/image";
import Link from "next/link";

import { SiteShell } from "@/components/layout/site-shell";
import { getWorldData } from "@/lib/content";
import { formatDisciplineLabel, formatDisplayLabel } from "@/lib/utils";

export default async function ArchivePage() {
  const { site, works, world } = await getWorldData();
  const latestYear = world.years[world.years.length - 1];
  const latestState = world.states[latestYear];

  return (
    <SiteShell site={site}>
      <section className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-4 py-10 sm:px-6 lg:px-8">
        <div className="space-y-4">
          <div className="inline-flex rounded-full border border-[var(--accent)] bg-[rgba(244,211,141,0.08)] px-4 py-2 text-[10px] uppercase tracking-[0.28em] text-[var(--accent-strong)]">
            Civilopedia archive
          </div>
          <h1 className="font-display text-5xl text-[var(--parchment)] sm:text-6xl">
            Browse the empire without the fog.
          </h1>
          <p className="max-w-3xl text-lg leading-8 text-[var(--muted-soft)]">
            The archive is the conventional fallback view. Every work still reads clearly as a
            portfolio item, even without the map layer.
          </p>
        </div>

        <div className="grid grid-cols-[repeat(auto-fit,minmax(18rem,1fr))] justify-items-center gap-6">
          {works.map((work) => {
            const city = latestState.cities.find((entry) => entry.slug === work.slug);

            return (
              <article
                key={work.slug}
                className="w-full max-w-[24rem] overflow-hidden rounded-[28px] border border-white/10 bg-[rgba(18,12,9,0.74)] shadow-[0_18px_50px_rgba(0,0,0,0.18)]"
              >
                <Image
                  src={work.media[0]?.src ?? "/assets/leader/standard.svg"}
                  alt={work.media[0]?.alt ?? work.title}
                  width={1200}
                  height={720}
                  className="h-52 w-full object-cover"
                  unoptimized
                />
                <div className="space-y-4 p-5">
                  <div className="flex flex-wrap gap-2 text-[10px] uppercase tracking-[0.24em] text-[var(--muted)]">
                    <span>{formatDisciplineLabel(work.discipline)}</span>
                    <span>{work.map.region}</span>
                    {city ? <span>{formatDisplayLabel(city.level)}</span> : null}
                  </div>
                  <h2 className="font-display text-4xl text-[var(--parchment)]">{work.title}</h2>
                  <p className="text-sm leading-7 text-[var(--muted-soft)]">{work.summary}</p>
                  <div className="flex flex-wrap gap-2">
                    {work.tags.map((tag) => (
                      <span
                        key={tag}
                        className="rounded-full border border-white/10 px-3 py-1 text-[10px] uppercase tracking-[0.18em] text-[var(--muted)]"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                  <div className="flex flex-wrap gap-3">
                    <Link
                      href={`/work/${work.slug}`}
                      className="rounded-full border border-[var(--accent)] bg-[rgba(244,211,141,0.08)] px-4 py-2 text-sm text-[var(--accent-strong)]"
                    >
                      Open dossier
                    </Link>
                    <Link
                      href={`/?work=${work.slug}`}
                      className="rounded-full border border-white/10 px-4 py-2 text-sm text-[var(--muted-soft)]"
                    >
                      Center on map
                    </Link>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </section>
    </SiteShell>
  );
}
