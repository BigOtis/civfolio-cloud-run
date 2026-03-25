import { deriveWorldRenderModel } from "./derive";
import {
  getGithubCache,
  getLeaderProfile,
  getSiteConfig,
  getTimelineSnapshots,
  getWorkBySlug,
  getWorks,
} from "./load";

export async function getWorldData() {
  const [site, leader, works, timeline, github] = await Promise.all([
    getSiteConfig(),
    getLeaderProfile(),
    getWorks(),
    getTimelineSnapshots(),
    getGithubCache(),
  ]);

  const world = deriveWorldRenderModel(works, timeline, github);

  return { site, leader, works, timeline, github, world };
}

export { getWorkBySlug };
