export type CameraLike = {
  zoom: number;
  x: number;
  y: number;
};

type Size = {
  width: number;
  height: number;
};

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

export function getViewportScale(viewport: Size, container: Size) {
  return {
    x: container.width > 0 ? viewport.width / container.width : 1,
    y: container.height > 0 ? viewport.height / container.height : 1,
  };
}

export function localPointToViewportPoint(localX: number, localY: number, viewport: Size, container: Size) {
  const scale = getViewportScale(viewport, container);
  return {
    x: localX * scale.x,
    y: localY * scale.y,
  };
}

export function viewportPointToLocalPoint(viewportX: number, viewportY: number, viewport: Size, container: Size) {
  const scale = getViewportScale(viewport, container);
  return {
    x: viewportX / scale.x,
    y: viewportY / scale.y,
  };
}

export function clampCameraToViewport(next: CameraLike, viewport: Size, world: Size) {
  const marginX = Math.min(120, viewport.width * 0.08);
  const marginY = Math.min(88, viewport.height * 0.08);
  const minX = viewport.width - world.width * next.zoom - marginX;
  const maxX = marginX;
  const minY = viewport.height - world.height * next.zoom - marginY;
  const maxY = marginY;

  return {
    ...next,
    x: clamp(next.x, Math.min(minX, maxX), Math.max(minX, maxX)),
    y: clamp(next.y, Math.min(minY, maxY), Math.max(minY, maxY)),
  };
}

export function zoomCameraAtPoint(
  current: CameraLike,
  delta: number,
  anchor: { x: number; y: number },
  limits = { min: 0.58, max: 1.52 },
) {
  const zoomFactor = Math.exp(delta);
  const nextZoom = clamp(current.zoom * zoomFactor, limits.min, limits.max);
  const worldX = (anchor.x - current.x) / current.zoom;
  const worldY = (anchor.y - current.y) / current.zoom;

  return {
    zoom: nextZoom,
    x: anchor.x - worldX * nextZoom,
    y: anchor.y - worldY * nextZoom,
  };
}

export function worldPointToLocalPoint(
  worldPoint: { x: number; y: number },
  camera: CameraLike,
  viewport: Size,
  container: Size,
) {
  const viewportPoint = {
    x: camera.x + worldPoint.x * camera.zoom,
    y: camera.y + worldPoint.y * camera.zoom,
  };

  return viewportPointToLocalPoint(viewportPoint.x, viewportPoint.y, viewport, container);
}

export function localPointToWorldPoint(
  localPoint: { x: number; y: number },
  camera: CameraLike,
  viewport: Size,
  container: Size,
  world: Size,
) {
  const viewportPoint = localPointToViewportPoint(localPoint.x, localPoint.y, viewport, container);

  return {
    x: clamp((viewportPoint.x - camera.x) / camera.zoom, 0, world.width),
    y: clamp((viewportPoint.y - camera.y) / camera.zoom, 0, world.height),
    viewportX: viewportPoint.x,
    viewportY: viewportPoint.y,
  };
}
