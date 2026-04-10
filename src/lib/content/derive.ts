import { type GithubCache, type TimelineSnapshot, type Work } from "./schema";

export type CityLevel = "settlement" | "town" | "city" | "capital" | "wonder";

export type WorldHex = {
  id: string;
  x: number;
  y: number;
  points: string;
  terrain: "coast" | "plains" | "forest" | "hills" | "highlands";
};

export type WorldRoute = {
  id: string;
  from: string;
  to: string;
  label: string;
  type: Work["relationships"][number]["type"];
  path: string;
};

export type RenderCity = {
  slug: string;
  title: string;
  discipline: Work["discipline"];
  summary: string;
  x: number;
  y: number;
  radius: number;
  level: CityLevel;
  foundedYear: number;
  ageYears: number;
  derivedScore: number;
  terrain: Work["map"]["terrain"];
  region: string;
  era: string;
  metrics: Work["metrics"];
  github?: GithubCache["repos"][string];
  bannerTone: string;
  tags: string[];
  greatWorks: Work["greatWorks"];
};

export type WorldState = {
  year: number;
  label: string;
  description: string;
  cities: RenderCity[];
  routes: WorldRoute[];
};

export type WorldRenderModel = {
  width: number;
  height: number;
  years: number[];
  hexes: WorldHex[];
  works: Work[];
  states: Record<number, WorldState>;
};

const worldWidth = 1320;
const worldHeight = 880;
const hexRadius = 56;
const sqrt3 = Math.sqrt(3);

const cityRank: Record<CityLevel, number> = {
  settlement: 0,
  town: 1,
  city: 2,
  capital: 3,
  wonder: 4,
};

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function buildHexPoints(centerX: number, centerY: number) {
  const points: Array<string> = [];

  for (let index = 0; index < 6; index += 1) {
    const angle = (Math.PI / 180) * (60 * index - 30);
    const x = centerX + hexRadius * Math.cos(angle);
    const y = centerY + hexRadius * Math.sin(angle);
    points.push(`${x},${y}`);
  }

  return points.join(" ");
}

function terrainAt(x: number, y: number): WorldHex["terrain"] {
  const seed = Math.sin(x * 0.017) + Math.cos(y * 0.022) + Math.sin((x + y) * 0.01);

  if (seed < -1.1) return "coast";
  if (seed < -0.25) return "plains";
  if (seed < 0.35) return "forest";
  if (seed < 0.95) return "hills";
  return "highlands";
}

function buildHexes(): WorldHex[] {
  const hexes: WorldHex[] = [];
  const horizontal = hexRadius * sqrt3;
  const vertical = hexRadius * 1.5;

  let row = 0;
  for (let y = 90; y < worldHeight + hexRadius; y += vertical) {
    const rowOffset = row % 2 === 0 ? 0 : horizontal / 2;
    for (let x = 80 + rowOffset; x < worldWidth + hexRadius; x += horizontal) {
      hexes.push({
        id: `hex-${row}-${Math.round(x)}`,
        x,
        y,
        points: buildHexPoints(x, y),
        terrain: terrainAt(x, y),
      });
    }
    row += 1;
  }

  return hexes;
}

function scoreToLevel(score: number): CityLevel {
  if (score >= 92) return "wonder";
  if (score >= 77) return "capital";
  if (score >= 59) return "city";
  if (score >= 36) return "town";
  return "settlement";
}

function levelRadius(level: CityLevel) {
  return {
    settlement: 14,
    town: 18,
    city: 24,
    capital: 30,
    wonder: 36,
  }[level];
}

function getSnapshotForYear(snapshots: TimelineSnapshot[], year: number): TimelineSnapshot {
  const snapshot = [...snapshots].reverse().find((item) => item.year <= year);
  return snapshot ?? snapshots[0];
}

function buildRoutePath(from: Work, to: Work) {
  const midX = (from.map.x + to.map.x) / 2;
  const midY = (from.map.y + to.map.y) / 2 - Math.abs(from.map.x - to.map.x) * 0.08;
  return `M ${from.map.x} ${from.map.y} Q ${midX} ${midY} ${to.map.x} ${to.map.y}`;
}

function computeGithubBoost(work: Work, githubCache: GithubCache) {
  const repo = work.code?.repo;
  if (!repo) {
    return 0;
  }

  const cached = githubCache.repos[`${repo.owner}/${repo.name}`];
  if (!cached) {
    return 0;
  }

  return (
    cached.stars * 0.08 +
    cached.forks * 0.12 +
    cached.contributors * 1.1 +
    cached.releases * 1.5 +
    cached.closedIssues * 0.04 +
    cached.totalCommits * 0.01
  );
}

export function deriveWorldRenderModel(
  works: Work[],
  snapshots: TimelineSnapshot[],
  githubCache: GithubCache,
): WorldRenderModel {
  const hexes = buildHexes();
  const years = snapshots.map((snapshot) => snapshot.year);
  const stateEntries = years.map((year) => {
    const snapshot = getSnapshotForYear(snapshots, year);
    const cities = works
      .filter((work) => {
        const override = snapshot.workStates[work.slug];
        if (override?.visible === false) return false;
        if (override?.visible === true) return true;
        return work.startYear <= year;
      })
      .map((work) => {
        const ageFactor = clamp((year - work.startYear + 1) / 4, 0.45, 1.15);
        const manualScore =
          work.importance * 0.65 +
          work.metrics.prestige * 3 +
          work.metrics.activity * 2.5 +
          work.metrics.stability * 2 +
          work.metrics.reach * 1.6;
        const derivedScore = clamp(
          manualScore * ageFactor + computeGithubBoost(work, githubCache),
          0,
          100,
        );
        const override = snapshot.workStates[work.slug];
        const level = override?.cityLevel ?? scoreToLevel(derivedScore);
        const repo = work.code?.repo;
        const github = repo ? githubCache.repos[`${repo.owner}/${repo.name}`] : undefined;

        return {
          slug: work.slug,
          title: work.title,
          discipline: work.discipline,
          summary: work.summary,
          x: work.map.x,
          y: work.map.y,
          radius: levelRadius(level),
          level,
          foundedYear: work.startYear,
          ageYears: Math.max(1, year - work.startYear + 1),
          derivedScore,
          terrain: work.map.terrain,
          region: work.map.region,
          era: work.era,
          metrics: work.metrics,
          github,
          bannerTone: work.map.bannerTone,
          tags: work.tags,
          greatWorks: work.greatWorks,
        } satisfies RenderCity;
      })
      .sort((left, right) => cityRank[left.level] - cityRank[right.level]);

    const cityMap = new Map(cities.map((city) => [city.slug, city]));
    const routes = works.flatMap((work) => {
      const from = cityMap.get(work.slug);
      if (!from) {
        return [];
      }

      return work.relationships
        .map((relationship) => {
          const targetWork = works.find((candidate) => candidate.slug === relationship.target);
          if (!targetWork) {
            return undefined;
          }

          const to = cityMap.get(relationship.target);
          if (!to || from.slug > to.slug) {
            return undefined;
          }

          return {
            id: `${from.slug}-${to.slug}`,
            from: from.slug,
            to: to.slug,
            label: relationship.label ?? relationship.type,
            type: relationship.type,
            path: buildRoutePath(work, targetWork),
          } satisfies WorldRoute;
        })
        .filter((route): route is NonNullable<typeof route> => Boolean(route));
    });

    return [
      year,
      {
        year,
        label: snapshot.label,
        description: snapshot.description,
        cities,
        routes,
      } satisfies WorldState,
    ] as const;
  });

  return {
    width: worldWidth,
    height: worldHeight,
    years,
    hexes,
    works,
    states: Object.fromEntries(stateEntries),
  };
}
