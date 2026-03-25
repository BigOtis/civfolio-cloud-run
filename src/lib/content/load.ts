import { promises as fs } from "node:fs";
import path from "node:path";

import {
  githubCacheSchema,
  leaderProfileSchema,
  siteConfigSchema,
  timelineSnapshotSchema,
  workSchema,
  type GithubCache,
  type LeaderProfile,
  type SiteConfig,
  type TimelineSnapshot,
  type Work,
} from "./schema";

const root = process.cwd();
const contentDir = path.join(root, "content");
const worksDir = path.join(contentDir, "works");

async function readJson<T>(
  filePath: string,
  parser: { parse: (value: unknown) => T },
): Promise<T> {
  const raw = await fs.readFile(filePath, "utf8");
  return parser.parse(JSON.parse(raw));
}

export async function getSiteConfig(): Promise<SiteConfig> {
  return readJson(path.join(contentDir, "site.json"), siteConfigSchema);
}

export async function getLeaderProfile(): Promise<LeaderProfile> {
  return readJson(path.join(contentDir, "leader.json"), leaderProfileSchema);
}

export async function getTimelineSnapshots(): Promise<TimelineSnapshot[]> {
  const snapshots = await readJson(path.join(contentDir, "timeline", "snapshots.json"), {
    parse: (value) => timelineSnapshotSchema.array().parse(value),
  });

  return snapshots.sort((a, b) => a.year - b.year);
}

export async function getWorks(): Promise<Work[]> {
  const files = (await fs.readdir(worksDir)).filter((file) => file.endsWith(".json")).sort();
  const works = await Promise.all(
    files.map((file) => readJson(path.join(worksDir, file), workSchema)),
  );

  return works.sort((a, b) => a.map.x - b.map.x);
}

export async function getGithubCache(): Promise<GithubCache> {
  return readJson(path.join(contentDir, "generated", "github-cache.json"), githubCacheSchema);
}

export async function getWorkBySlug(slug: string): Promise<Work | undefined> {
  const works = await getWorks();
  return works.find((work) => work.slug === slug);
}
