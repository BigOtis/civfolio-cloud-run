import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import { getWorks } from "../src/lib/content/load";
import { githubCacheSchema } from "../src/lib/content/schema";

type RepoRef = { owner: string; name: string };

function getHeaders() {
  const token = process.env.GITHUB_TOKEN ?? process.env.GH_TOKEN;

  return {
    Accept: "application/vnd.github+json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    "User-Agent": "civfolio-sync-script",
  };
}

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, init);
  if (!response.ok) {
    throw new Error(`GitHub request failed: ${response.status} ${response.statusText}`);
  }
  return (await response.json()) as T;
}

async function getRepoSummary(ref: RepoRef) {
  const headers = getHeaders();
  const repo = await fetchJson<{
    stargazers_count: number;
    forks_count: number;
    subscribers_count: number;
    open_issues_count: number;
    html_url: string;
    pushed_at: string | null;
    language: string | null;
  }>(`https://api.github.com/repos/${ref.owner}/${ref.name}`, { headers });

  const releases = await fetchJson<Array<{ id: number }>>(
    `https://api.github.com/repos/${ref.owner}/${ref.name}/releases?per_page=100`,
    { headers },
  );
  const contributors = await fetchJson<Array<{ id: number }>>(
    `https://api.github.com/repos/${ref.owner}/${ref.name}/contributors?per_page=100`,
    { headers },
  );

  let closedIssues = 0;
  let totalCommits = 0;

  if (headers.Authorization) {
    const graph = await fetchJson<{
      data: {
        repository: {
          closedIssues: { totalCount: number };
          defaultBranchRef: {
            target: {
              history: { totalCount: number };
            } | null;
          } | null;
        } | null;
      };
    }>("https://api.github.com/graphql", {
      method: "POST",
      headers: {
        ...headers,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        query: `
          query RepoStats($owner: String!, $name: String!) {
            repository(owner: $owner, name: $name) {
              closedIssues: issues(states: CLOSED) { totalCount }
              defaultBranchRef {
                target {
                  ... on Commit {
                    history(first: 1) { totalCount }
                  }
                }
              }
            }
          }
        `,
        variables: ref,
      }),
    });

    closedIssues = graph.data.repository?.closedIssues.totalCount ?? 0;
    totalCommits = graph.data.repository?.defaultBranchRef?.target?.history.totalCount ?? 0;
  }

  return {
    stars: repo.stargazers_count,
    forks: repo.forks_count,
    watchers: repo.subscribers_count,
    openIssues: repo.open_issues_count,
    closedIssues,
    contributors: contributors.length,
    releases: releases.length,
    totalCommits,
    primaryLanguage: repo.language,
    pushedAt: repo.pushed_at,
    repoUrl: repo.html_url,
  };
}

async function main() {
  const works = await getWorks();
  const repos = works.map((work) => work.code?.repo).filter((repo): repo is RepoRef => Boolean(repo));

  if (repos.length === 0) {
    console.log("No GitHub repos declared in content.");
    return;
  }

  const records = await Promise.all(
    repos.map(async (repo) => {
      try {
        return [`${repo.owner}/${repo.name}`, await getRepoSummary(repo)] as const;
      } catch (error) {
        console.warn(`Skipping ${repo.owner}/${repo.name}:`, error);
        return undefined;
      }
    }),
  );
  const repoMap = records.reduce<Record<string, unknown>>((accumulator, record) => {
    if (record) {
      const [key, value] = record;
      accumulator[key] = value;
    }

    return accumulator;
  }, {});

  const cache = githubCacheSchema.parse({
    generatedAt: new Date().toISOString(),
    repos: repoMap,
  });

  const outputPath = path.join(process.cwd(), "content", "generated", "github-cache.json");
  await mkdir(path.dirname(outputPath), { recursive: true });
  await writeFile(outputPath, JSON.stringify(cache, null, 2));
  console.log(`Wrote ${Object.keys(cache.repos).length} GitHub cache entries.`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
