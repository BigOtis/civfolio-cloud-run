import { Suspense } from "react";

import { SiteShell } from "@/components/layout/site-shell";
import { WorldExplorer } from "@/components/world/world-explorer";
import { getWorldData } from "@/lib/content";

export default async function Home() {
  const { site, leader, world, works, github } = await getWorldData();

  return (
    <SiteShell site={site} chrome="minimal">
      <Suspense
        fallback={
          <div className="mx-auto w-full max-w-7xl px-4 py-16 text-[var(--muted-soft)] sm:px-6 lg:px-8">
            Loading the world map...
          </div>
        }
      >
        <WorldExplorer
          site={site}
          leader={leader}
          world={world}
          works={works}
          github={github}
        />
      </Suspense>
    </SiteShell>
  );
}
