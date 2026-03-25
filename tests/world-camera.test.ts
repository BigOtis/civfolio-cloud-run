import { describe, expect, it } from "vitest";

import {
  clampCameraToViewport,
  localPointToViewportPoint,
  localPointToWorldPoint,
  viewportPointToLocalPoint,
  worldPointToLocalPoint,
  zoomCameraAtPoint,
} from "../src/components/world/world-camera";

describe("world camera math", () => {
  const viewport = { width: 1400, height: 900 };
  const container = { width: 1750, height: 1000 };
  const world = { width: 1400, height: 900 };

  it("converts local pointer coordinates into viewport coordinates", () => {
    const point = localPointToViewportPoint(875, 500, viewport, container);

    expect(point).toEqual({ x: 700, y: 450 });
    expect(viewportPointToLocalPoint(point.x, point.y, viewport, container)).toEqual({
      x: 875,
      y: 500,
    });
  });

  it("round-trips between world and local coordinates", () => {
    const camera = { zoom: 1.08, x: -148, y: 34 };
    const worldPoint = { x: 612, y: 284 };

    const localPoint = worldPointToLocalPoint(worldPoint, camera, viewport, container);
    const roundTrip = localPointToWorldPoint(localPoint, camera, viewport, container, world);

    expect(roundTrip.x).toBeCloseTo(worldPoint.x, 6);
    expect(roundTrip.y).toBeCloseTo(worldPoint.y, 6);
  });

  it("keeps the hovered world point anchored while zooming", () => {
    const camera = { zoom: 0.84, x: 72, y: 48 };
    const anchorLocal = { x: 1020, y: 420 };
    const anchorViewport = localPointToViewportPoint(anchorLocal.x, anchorLocal.y, viewport, container);
    const anchoredWorldPoint = localPointToWorldPoint(anchorLocal, camera, viewport, container, world);

    const next = clampCameraToViewport(
      zoomCameraAtPoint(camera, 0.19, { x: anchorViewport.x, y: anchorViewport.y }),
      viewport,
      world,
    );

    const nextLocal = worldPointToLocalPoint(
      { x: anchoredWorldPoint.x, y: anchoredWorldPoint.y },
      next,
      viewport,
      container,
    );

    expect(nextLocal.x).toBeCloseTo(anchorLocal.x, 6);
    expect(nextLocal.y).toBeCloseTo(anchorLocal.y, 6);
    expect(next.zoom).toBeGreaterThan(camera.zoom);
  });
});
