import { describe, expect, it } from "vitest";

import { getWorldData } from "../src/lib/content";

describe("world derivation", () => {
  it("reveals more cities as the timeline advances", async () => {
    const data = await getWorldData();
    const earlyYear = data.world.years[0];
    const lateYear = data.world.years[data.world.years.length - 1];
    const early = data.world.states[earlyYear];
    const late = data.world.states[lateYear];

    expect(early.cities.length).toBeLessThan(late.cities.length);
    expect(late.cities.some((city) => city.level === "wonder")).toBe(true);
  });
});
