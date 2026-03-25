import { notFound } from "next/navigation";

import { SiteShell } from "@/components/layout/site-shell";
import { WorkDetail } from "@/components/work/work-detail";
import { getWorldData } from "@/lib/content";

export async function generateStaticParams() {
  const { works } = await getWorldData();
  return works.map((work) => ({ slug: work.slug }));
}

export default async function WorkPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const { site, works, github, world } = await getWorldData();
  const work = works.find((entry) => entry.slug === slug);

  if (!work) {
    notFound();
  }

  const latestYear = world.years[world.years.length - 1];
  const city = world.states[latestYear].cities.find((entry) => entry.slug === slug);
  const repo = work.code?.repo;
  const cached = repo ? github.repos[`${repo.owner}/${repo.name}`] : undefined;

  return (
    <SiteShell site={site}>
      <section className="mx-auto w-full max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <WorkDetail work={work} github={cached} cityLevel={city?.level} />
      </section>
    </SiteShell>
  );
}
