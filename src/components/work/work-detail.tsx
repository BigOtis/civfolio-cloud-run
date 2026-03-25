import type { ReactNode } from "react";

import Image from "next/image";
import Link from "next/link";

import type { GithubRepoCache, Work } from "@/lib/content/schema";
import { formatDisciplineLabel, formatDisplayLabel } from "@/lib/utils";

function Section({ title, items }: { title: string; items: string[] }) {
  if (items.length === 0) {
    return null;
  }

  return (
    <section className="space-y-3">
      <h3 className="font-display text-2xl text-[var(--accent-strong)]">{title}</h3>
      <ul className="space-y-2 text-sm text-[var(--muted-soft)]">
        {items.map((item) => (
          <li
            key={item}
            className="rounded-2xl border border-white/8 bg-black/20 px-4 py-3"
          >
            {item}
          </li>
        ))}
      </ul>
    </section>
  );
}

function Stat({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
      <div className="text-[10px] uppercase tracking-[0.24em] text-[var(--muted)]">{label}</div>
      <div className="mt-1 text-lg text-[var(--parchment)]">{value}</div>
    </div>
  );
}

function formatFacetLabel(key: string) {
  return key
    .replace(/([A-Z])/g, " $1")
    .replace(/^./, (value) => value.toUpperCase());
}

function renderFacetValue(value: unknown): ReactNode {
  if (Array.isArray(value)) {
    return value.map((item) =>
      typeof item === "object" && item !== null
        ? Object.entries(item as Record<string, unknown>)
            .map(([key, entry]) => `${formatFacetLabel(key)}: ${String(entry)}`)
            .join(" · ")
        : String(item),
    ).join(", ");
  }

  if (value && typeof value === "object") {
    return (
      <div className="space-y-1">
        {Object.entries(value as Record<string, unknown>).map(([key, entry]) => (
          <div key={key}>
            <span className="text-[var(--parchment)]">{formatFacetLabel(key)}:</span>{" "}
            <span>{Array.isArray(entry) ? entry.join(", ") : String(entry)}</span>
          </div>
        ))}
      </div>
    );
  }

  return String(value);
}

export function WorkDetail({
  work,
  github,
  cityLevel,
  mode = "page",
}: {
  work: Work;
  github?: GithubRepoCache;
  cityLevel?: string;
  mode?: "page" | "panel";
}) {
  const facet =
    work.code ?? work.art ?? work.music ?? work.video ?? work.writing ?? work.client;
  const compact = mode === "panel";
  const hero = work.media[0];
  const gallery = work.media.slice(1);
  const surfaceClass = compact
    ? "overflow-hidden rounded-[26px] border border-[rgba(244,211,141,0.24)] bg-[linear-gradient(180deg,rgba(52,34,23,0.9),rgba(22,15,11,0.96))] shadow-[inset_0_1px_0_rgba(255,240,200,0.08)]"
    : "overflow-hidden rounded-[28px] border border-[rgba(244,211,141,0.24)] bg-[rgba(18,11,8,0.74)] shadow-[0_22px_80px_rgba(0,0,0,0.35)] lg:grid lg:grid-cols-[1.15fr_0.85fr]";
  const panelClass = compact
    ? "space-y-4 p-5"
    : "space-y-5 p-5 sm:p-6 lg:flex lg:flex-col lg:justify-between";
  const cardClass = compact
    ? "rounded-[20px] border border-white/10 bg-[rgba(255,255,255,0.04)] px-4 py-3"
    : "rounded-2xl border border-white/10 bg-white/5 px-4 py-3";

  return (
    <article className="space-y-6">
      <div className={surfaceClass}>
        {hero ? (
          <Image
            src={hero.src}
            alt={hero.alt}
            width={1200}
            height={720}
            className={compact ? "h-44 w-full object-cover object-center" : "h-56 w-full object-cover object-center sm:h-72 lg:h-full lg:min-h-[28rem]"}
            loading={compact ? "eager" : undefined}
            priority={!compact}
            unoptimized
          />
        ) : null}
        <div className={panelClass}>
          <div className="flex flex-wrap items-center gap-2 text-[10px] uppercase tracking-[0.28em] text-[var(--muted)]">
            <span className="rounded-full border border-white/10 px-3 py-1">
              {formatDisciplineLabel(work.discipline)}
            </span>
            <span className="rounded-full border border-white/10 px-3 py-1">{work.era}</span>
            <span className="rounded-full border border-white/10 px-3 py-1">{formatDisplayLabel(work.status)}</span>
            {cityLevel ? (
              <span className="rounded-full border border-[var(--accent)] px-3 py-1 text-[var(--accent-strong)]">
                {formatDisplayLabel(cityLevel)}
              </span>
            ) : null}
          </div>

          <div className="space-y-3">
            <h1 className={compact ? "font-display text-4xl leading-none text-[var(--parchment)]" : "font-display text-4xl leading-none text-[var(--parchment)] sm:text-5xl"}>
              {work.title}
            </h1>
            <p className="max-w-3xl text-base leading-7 text-[var(--muted-soft)]">
              {work.summary}
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            {work.links.map((link) => (
              <a
                key={link.url}
                href={link.url}
                target="_blank"
                rel="noreferrer"
                className="rounded-full border border-[var(--accent)] bg-[rgba(244,211,141,0.08)] px-4 py-2 text-sm text-[var(--accent-strong)] transition hover:bg-[rgba(244,211,141,0.16)]"
              >
                {link.label}
              </a>
            ))}
            {compact ? (
              <Link
                href={`/work/${work.slug}`}
                className="rounded-full border border-white/10 px-4 py-2 text-sm text-[var(--muted-soft)] transition hover:border-[var(--accent)] hover:text-[var(--accent-strong)]"
              >
                Open full dossier
              </Link>
            ) : null}
          </div>
        </div>
      </div>

      {gallery.length > 0 ? (
        <section className={compact ? "grid gap-3 sm:grid-cols-2" : "grid gap-4 sm:grid-cols-2"}>
          {gallery.map((item) => (
            <figure
              key={`${item.src}-${item.alt}`}
              className="overflow-hidden rounded-[24px] border border-[rgba(244,211,141,0.18)] bg-[rgba(16,11,9,0.72)]"
            >
              <Image
                src={item.src}
                alt={item.alt}
                width={900}
                height={540}
                className="h-44 w-full object-cover object-center"
                unoptimized
              />
              {item.caption ? (
                <figcaption className="px-4 py-3 text-sm leading-6 text-[var(--muted-soft)]">
                  {item.caption}
                </figcaption>
              ) : null}
            </figure>
          ))}
        </section>
      ) : null}

      <section className={compact ? "grid gap-3 sm:grid-cols-2" : "grid gap-3 sm:grid-cols-2 lg:grid-cols-4"}>
        <Stat label="Importance" value={`${work.importance}/100`} />
        <Stat label="Founding Year" value={work.startYear} />
        <Stat label="Region" value={work.map.region} />
        <Stat label="Terrain" value={formatDisplayLabel(work.map.terrain)} />
        <Stat label="Prestige" value={work.metrics.prestige} />
        <Stat label="Activity" value={work.metrics.activity} />
        <Stat label="Stability" value={work.metrics.stability} />
        <Stat label="Reach" value={work.metrics.reach} />
        {github ? <Stat label="Stars" value={github.stars} /> : null}
        {github ? <Stat label="Forks" value={github.forks} /> : null}
        {github ? <Stat label="Contributors" value={github.contributors} /> : null}
        {github ? <Stat label="Releases" value={github.releases} /> : null}
      </section>

      <section className={compact ? "space-y-4 rounded-[26px] border border-white/10 bg-[rgba(0,0,0,0.18)] p-5" : "space-y-4 rounded-[28px] border border-white/10 bg-black/20 p-5 sm:p-6"}>
        <h2 className="font-display text-3xl text-[var(--accent-strong)]">Overview</h2>
        <div className="space-y-4 text-base leading-8 text-[var(--muted-soft)]">
          {work.description.map((paragraph) => (
            <p key={paragraph}>{paragraph}</p>
          ))}
        </div>
      </section>

      <div className={`grid gap-6 ${compact ? "xl:grid-cols-1" : "xl:grid-cols-2"}`}>
        <Section title="Buildings" items={work.highlights} />
        <Section title="Production Queue" items={work.productionQueue} />
        <Section title="Tech Tree" items={work.techTree} />
        <Section title="Diplomacy" items={work.diplomacy} />
        <Section title="Trade Routes" items={work.tradeRoutes} />
        <Section title="Wonders" items={work.wonders} />
      </div>

      {work.greatWorks.length > 0 ? (
        <section className={compact ? "space-y-4 rounded-[26px] border border-white/10 bg-[rgba(0,0,0,0.18)] p-5" : "space-y-4 rounded-[28px] border border-white/10 bg-black/20 p-5 sm:p-6"}>
          <h2 className="font-display text-3xl text-[var(--accent-strong)]">Great Works</h2>
          <div className="grid gap-4 md:grid-cols-2">
            {work.greatWorks.map((item) => (
              <div
                key={item.title}
                className={cardClass}
              >
                <div className="text-[10px] uppercase tracking-[0.28em] text-[var(--muted)]">
                  Landmark
                </div>
                <div className="mt-2 text-xl text-[var(--parchment)]">{item.title}</div>
                <div className="mt-2 text-sm leading-7 text-[var(--muted-soft)]">{item.summary}</div>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      <section className={compact ? "space-y-4 rounded-[26px] border border-white/10 bg-[rgba(0,0,0,0.18)] p-5" : "space-y-4 rounded-[28px] border border-white/10 bg-black/20 p-5 sm:p-6"}>
        <h2 className="font-display text-3xl text-[var(--accent-strong)]">Civilopedia Entry</h2>
        <div className="grid gap-4 md:grid-cols-2">
          <div className={cardClass}>
            <div className="text-[10px] uppercase tracking-[0.28em] text-[var(--muted)]">
              Facet Type
            </div>
            <div className="mt-2 text-lg text-[var(--parchment)]">
              {formatDisciplineLabel(work.discipline)}
            </div>
          </div>
          {facet ? (
            Object.entries(facet).map(([key, value]) => (
              <div
                key={key}
                className={cardClass}
              >
                <div className="text-[10px] uppercase tracking-[0.28em] text-[var(--muted)]">
                  {formatFacetLabel(key)}
                </div>
                <div className="mt-2 text-sm leading-7 text-[var(--muted-soft)]">
                  {renderFacetValue(value)}
                </div>
              </div>
            ))
          ) : null}
        </div>
      </section>
    </article>
  );
}
