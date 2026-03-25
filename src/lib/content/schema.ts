import { z } from "zod";

export const disciplineValues = [
  "code",
  "art",
  "music",
  "video",
  "writing",
  "client",
] as const;

export const cityLevelValues = [
  "settlement",
  "town",
  "city",
  "capital",
  "wonder",
] as const;

const linkSchema = z.object({
  label: z.string(),
  url: z.string().url(),
  kind: z.enum([
    "repo",
    "live",
    "case-study",
    "streaming",
    "video",
    "download",
    "contact",
  ]),
});

const mediaSchema = z.object({
  kind: z.enum(["image", "video", "audio"]),
  src: z.string(),
  alt: z.string(),
  caption: z.string().optional(),
});

const greatWorkSchema = z.object({
  title: z.string(),
  summary: z.string(),
  xOffset: z.number().default(68),
  yOffset: z.number().default(-54),
  unlockYear: z.number().optional(),
});

const relationshipSchema = z.object({
  target: z.string(),
  type: z.enum(["trade", "series", "integration", "team", "inspiration"]),
  label: z.string().optional(),
});

const metricsSchema = z.object({
  prestige: z.number().min(0).max(10).default(5),
  activity: z.number().min(0).max(10).default(5),
  stability: z.number().min(0).max(10).default(5),
  reach: z.number().min(0).max(10).default(5),
});

export const siteConfigSchema = z.object({
  title: z.string(),
  tagline: z.string(),
  description: z.string(),
  baseUrl: z.string().url(),
  navigation: z.array(z.object({ label: z.string(), href: z.string() })),
  theme: z.object({
    accent: z.string(),
    accentStrong: z.string(),
    surface: z.string(),
    surfaceAlt: z.string(),
    worldSea: z.string(),
    worldLand: z.string(),
  }),
  audio: z.object({
    enabledByDefault: z.boolean(),
    label: z.string(),
    track: z.string().optional(),
  }),
  scene: z.object({
    introEnabled: z.boolean().default(true),
    introSequence: z.array(z.string()).default([]),
    toolUnits: z.array(
      z.object({
        id: z.string(),
        label: z.string(),
        type: z.enum(["trader", "army", "scholar", "builder", "robot", "scout", "sage", "horse", "archer", "camel-trader"]).default("trader"),
        color: z.string(),
        route: z.array(z.string()).min(2),
        speed: z.number().min(0.2).max(3).default(1),
      }),
    ).default([]),
  }).default({
    introEnabled: true,
    introSequence: [],
    toolUnits: [],
  }),
  socialLinks: z.array(z.object({ label: z.string(), url: z.string().url() })),
});

export const leaderProfileSchema = z.object({
  name: z.string(),
  headline: z.string(),
  currentRole: z.string().optional(),
  summary: z.string(),
  philosophy: z.array(z.string()),
  disciplines: z.array(z.enum(disciplineValues)),
  featuredSkills: z.array(z.string()),
  achievements: z.array(z.string()),
  contactLinks: z.array(z.object({ label: z.string(), url: z.string().url() })),
  avatar: z.string(),
});

const mapSchema = z.object({
  x: z.number(),
  y: z.number(),
  terrain: z.enum(["coast", "plains", "forest", "hills", "highlands"]),
  region: z.string(),
  bannerTone: z.string(),
});

const codeFacetSchema = z.object({
  repo: z.object({ owner: z.string(), name: z.string() }).optional(),
  role: z.string(),
  stack: z.array(z.string()),
  features: z.array(z.string()).default([]),
  integrations: z.array(z.string()).default([]),
  architectureNotes: z.array(z.string()).default([]),
});

const artFacetSchema = z.object({
  medium: z.string(),
  tools: z.array(z.string()),
  format: z.string(),
  collection: z.string().optional(),
  credits: z.array(z.string()).default([]),
});

const musicFacetSchema = z.object({
  format: z.string(),
  tools: z.array(z.string()),
  duration: z.string().optional(),
  credits: z.array(z.string()).default([]),
  platforms: z.array(z.string()).default([]),
});

const videoFacetSchema = z.object({
  format: z.string(),
  tools: z.array(z.string()),
  duration: z.string().optional(),
  credits: z.array(z.string()).default([]),
  deliverables: z.array(z.string()).default([]),
});

const writingFacetSchema = z.object({
  format: z.string(),
  publications: z.array(z.string()).default([]),
  topics: z.array(z.string()).default([]),
});

const clientFacetSchema = z.object({
  clientName: z.string(),
  sector: z.string(),
  scope: z.array(z.string()),
  deliverables: z.array(z.string()),
});

export const workSchema = z.object({
  slug: z.string(),
  title: z.string(),
  discipline: z.enum(disciplineValues),
  summary: z.string(),
  description: z.array(z.string()),
  importance: z.number().min(0).max(100),
  status: z.enum(["active", "paused", "archived"]),
  era: z.string(),
  startYear: z.number().min(2000).max(2100),
  tags: z.array(z.string()),
  map: mapSchema,
  links: z.array(linkSchema),
  media: z.array(mediaSchema),
  greatWorks: z.array(greatWorkSchema).default([]),
  relationships: z.array(relationshipSchema),
  highlights: z.array(z.string()),
  productionQueue: z.array(z.string()),
  techTree: z.array(z.string()),
  diplomacy: z.array(z.string()),
  tradeRoutes: z.array(z.string()),
  wonders: z.array(z.string()),
  metrics: metricsSchema,
  code: codeFacetSchema.optional(),
  art: artFacetSchema.optional(),
  music: musicFacetSchema.optional(),
  video: videoFacetSchema.optional(),
  writing: writingFacetSchema.optional(),
  client: clientFacetSchema.optional(),
});

const workStateOverrideSchema = z.object({
  visible: z.boolean().optional(),
  cityLevel: z.enum(cityLevelValues).optional(),
  annotation: z.string().optional(),
});

export const timelineSnapshotSchema = z.object({
  year: z.number(),
  label: z.string(),
  description: z.string(),
  workStates: z.record(z.string(), workStateOverrideSchema),
});

export const githubRepoCacheSchema = z.object({
  stars: z.number().nonnegative().default(0),
  forks: z.number().nonnegative().default(0),
  watchers: z.number().nonnegative().default(0),
  openIssues: z.number().nonnegative().default(0),
  closedIssues: z.number().nonnegative().default(0),
  contributors: z.number().nonnegative().default(0),
  releases: z.number().nonnegative().default(0),
  totalCommits: z.number().nonnegative().default(0),
  primaryLanguage: z.string().nullable().default(null),
  pushedAt: z.string().nullable().default(null),
  repoUrl: z.string().url(),
});

export const githubCacheSchema = z.object({
  generatedAt: z.string(),
  repos: z.record(z.string(), githubRepoCacheSchema),
});

export type SiteConfig = z.infer<typeof siteConfigSchema>;
export type LeaderProfile = z.infer<typeof leaderProfileSchema>;
export type Work = z.infer<typeof workSchema>;
export type TimelineSnapshot = z.infer<typeof timelineSnapshotSchema>;
export type GithubRepoCache = z.infer<typeof githubRepoCacheSchema>;
export type GithubCache = z.infer<typeof githubCacheSchema>;
export type CityLevel = (typeof cityLevelValues)[number];
export type Discipline = (typeof disciplineValues)[number];
