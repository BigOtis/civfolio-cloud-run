"use client";

import Image from "next/image";
import Link from "next/link";
import { startTransition, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { WorkDetail } from "@/components/work/work-detail";
import { WorldMapPixi } from "@/components/world/world-map-pixi";
import {
  clamp,
  getTravelerFlavor,
  OverlayButton,
  StatChip,
  usePresence,
  useRetainedPresence,
  useWorldAudio,
} from "@/components/world/world-explorer-support";
import {
  clampCameraToViewport,
  localPointToWorldPoint,
  worldPointToLocalPoint,
  zoomCameraAtPoint,
} from "@/components/world/world-camera";
import type { WorldRenderModel } from "@/lib/content/derive";
import type { GithubCache, LeaderProfile, SiteConfig, Work } from "@/lib/content/schema";
import { cn, formatDisciplineLabel, formatDisplayLabel } from "@/lib/utils";

const disciplineTone = {
  code: "#f2c36f",
  art: "#e6aa72",
  music: "#80cadc",
  video: "#95dab7",
  writing: "#d2c77e",
  client: "#d59750",
} as const;

type CameraState = {
  zoom: number;
  x: number;
  y: number;
};

const initialCamera: CameraState = {
  zoom: 0.82,
  x: 80,
  y: 30,
};

declare global {
  interface Window {
    __CIVFOLIO_INTRO_STEP_MS?: number;
    __CIVFOLIO_INTRO_FINAL_MS?: number;
    __CIVFOLIO_CREATOR_PROMPT_DELAY_MS?: number;
    __CIVFOLIO_CREATOR_PROMPT_LIFETIME_MS?: number;
  }
}

export function WorldExplorer({
  site,
  leader,
  world,
  works,
  github,
}: {
  site: SiteConfig;
  leader: LeaderProfile;
  world: WorldRenderModel;
  works: Work[];
  github: GithubCache;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const cameraTargetRef = useRef<CameraState>(initialCamera);
  const cameraFrameRef = useRef<number | null>(null);
  const isDraggingRef = useRef(false);
  const introCancelledRef = useRef(false);
  const introTimeoutRef = useRef<number | null>(null);
  const introCueKeyRef = useRef<string | null>(null);
  const selectionSourceRef = useRef<"map" | "route">("route");
  const [selectedYear, setSelectedYear] = useState(world.years[world.years.length - 1]);
  const [filter, setFilter] = useState<Work["discipline"] | "all">("all");
  const [camera, setCamera] = useState<CameraState>(initialCamera);
  const [cameraMotionToken, setCameraMotionToken] = useState(0);
  const [containerSize, setContainerSize] = useState({ width: 1200, height: 840 });
  const [hoveredCity, setHoveredCity] = useState<string | null>(null);
  const [hoveredGreatWork, setHoveredGreatWork] = useState<string | null>(null);
  const [selectedUnitId, setSelectedUnitId] = useState<string | null>(null);
  const [selectedUnitCard, setSelectedUnitCard] = useState<{
    id: string;
    label: string;
    type: string;
    x: number;
    y: number;
  } | null>(null);
  const [selectedUnitLock, setSelectedUnitLock] = useState<{ id: string; x: number; y: number } | null>(null);
  const [introActive, setIntroActive] = useState(site.scene.introEnabled);
  const [introIndex, setIntroIndex] = useState(0);
  const [showLeader, setShowLeader] = useState(false);
  const [showLegend, setShowLegend] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [showCreatorPrompt, setShowCreatorPrompt] = useState(false);
  const audio = useWorldAudio(site.audio);
  const isTablet = containerSize.width < 1100;
  const isMobile = containerSize.width < 760;
  const isShort = containerSize.height < 760;

  useEffect(() => {
    const element = containerRef.current;
    if (!element) {
      return;
    }

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) {
        return;
      }

      setContainerSize({
        width: entry.contentRect.width,
        height: entry.contentRect.height,
      });
    });

    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    isDraggingRef.current = isDragging;
  }, [isDragging]);

  useEffect(() => {
    if (cameraFrameRef.current !== null) {
      window.cancelAnimationFrame(cameraFrameRef.current);
      cameraFrameRef.current = null;
    }

    const tick = () => {
      setCamera((current) => {
        const target = cameraTargetRef.current;
        const ease = isDraggingRef.current ? 0.34 : 0.16;
        const next = {
          zoom: current.zoom + (target.zoom - current.zoom) * ease,
          x: current.x + (target.x - current.x) * ease,
          y: current.y + (target.y - current.y) * ease,
        };

        if (
          Math.abs(next.zoom - target.zoom) < 0.001 &&
          Math.abs(next.x - target.x) < 0.5 &&
          Math.abs(next.y - target.y) < 0.5
        ) {
          cameraFrameRef.current = null;
          return target;
        }

        cameraFrameRef.current = window.requestAnimationFrame(tick);
        return next;
      });
    };

    cameraFrameRef.current = window.requestAnimationFrame(tick);

    return () => {
      if (cameraFrameRef.current !== null) {
        window.cancelAnimationFrame(cameraFrameRef.current);
        cameraFrameRef.current = null;
      }
    };
  }, [cameraMotionToken]);

  const currentState = world.states[selectedYear];
  const currentCityMap = useMemo(
    () => new Map(currentState.cities.map((city) => [city.slug, city])),
    [currentState.cities],
  );
  const routeSelectedSlug = searchParams.get("work");
  const [optimisticSelectedSlug, setOptimisticSelectedSlug] = useState<string | null>(routeSelectedSlug);
  const selectedSlug = optimisticSelectedSlug;
  const cityLookup = currentCityMap;
  const selectedWork = works.find((work) => work.slug === selectedSlug);
  useEffect(() => {
    setOptimisticSelectedSlug(routeSelectedSlug);
  }, [routeSelectedSlug]);
  const workBySlug = useMemo(() => new Map(works.map((work) => [work.slug, work])), [works]);
  const selectedCity = selectedSlug ? cityLookup.get(selectedSlug) : undefined;
  const selectedWorkVisible = Boolean(selectedCity);
  const introSequence = useMemo(
    () =>
      site.scene.introSequence
        .map((slug) => works.find((work) => work.slug === slug))
        .filter((work): work is Work => Boolean(work)),
    [site.scene.introSequence, works],
  );
  const introFoundedSlugs = useMemo(() => {
    if (!introActive) {
      return null;
    }

    return new Set(introSequence.slice(0, introIndex + 1).map((work) => work.slug));
  }, [introActive, introIndex, introSequence]);
  const mapState = useMemo(() => {
    if (!introFoundedSlugs) {
      return currentState;
    }

    return {
      ...currentState,
      cities: currentState.cities.filter((city) => introFoundedSlugs.has(city.slug)),
      routes: currentState.routes.filter(
        (route) => introFoundedSlugs.has(route.from) && introFoundedSlugs.has(route.to),
      ),
    };
  }, [currentState, introFoundedSlugs]);
  const visibleCities = useMemo(
    () => mapState.cities.filter((city) => filter === "all" || city.discipline === filter),
    [filter, mapState.cities],
  );
  const currentIntroWork = introSequence[Math.min(introIndex, Math.max(introSequence.length - 1, 0))];
  const introFocusSlug = introActive && currentIntroWork ? currentIntroWork.slug : null;
  const latestYear = world.years[world.years.length - 1];
  const introPanelVisible = usePresence(introActive && Boolean(currentIntroWork), 260);
  const leaderPanelVisible = usePresence(showLeader, 220);
  const legendPanelVisible = usePresence(showLegend, 220);
  const creatorPromptVisible = usePresence(showCreatorPrompt, 220);
  const commandBriefVisible = usePresence(!selectedWork && !showLeader && !isTablet && !isShort, 220);
  const selectedWorkPanel = useRetainedPresence(selectedWorkVisible ? selectedWork ?? null : null, Boolean(selectedWork && selectedWorkVisible), 240);
  const hiddenWorkPanel = useRetainedPresence(
    !selectedWorkVisible ? selectedWork ?? null : null,
    Boolean(selectedWork && !selectedWorkVisible),
    240,
  );
  const selectedPanelCity = selectedWorkPanel.retained
    ? world.states[selectedYear].cities.find((city) => city.slug === selectedWorkPanel.retained?.slug) ?? selectedCity
    : undefined;
  const selectedPanelGithub =
    selectedWorkPanel.retained?.code?.repo &&
    github.repos[`${selectedWorkPanel.retained.code.repo.owner}/${selectedWorkPanel.retained.code.repo.name}`];
  const introProgress = introSequence.length > 0 ? (introIndex + 1) / introSequence.length : 0;
  const viewportSize = useMemo(
    () => ({
      width: Math.max(1, containerSize.width),
      height: Math.max(1, containerSize.height),
    }),
    [containerSize.height, containerSize.width],
  );
  const terrainAtPoint = useCallback((x: number, y: number) => {
    return world.hexes.reduce<{ terrain: (typeof world.hexes)[number]["terrain"]; distance: number }>(
      (closest, hex) => {
        const distance = (hex.x - x) ** 2 + (hex.y - y) ** 2;
        if (distance < closest.distance) {
          return { terrain: hex.terrain, distance };
        }
        return closest;
      },
      { terrain: "plains", distance: Number.POSITIVE_INFINITY },
    ).terrain;
  }, [world]);
  function clampCameraToWorld(next: CameraState) {
    return clampCameraToViewport(next, viewportSize, { width: world.width, height: world.height });
  }

  function setCameraTarget(
    next:
      | CameraState
      | ((current: CameraState) => CameraState),
  ) {
    const resolved =
      typeof next === "function" ? next(cameraTargetRef.current) : next;
    const clamped = clampCameraToWorld(resolved);
    cameraTargetRef.current = clamped;
    setCameraMotionToken((value) => value + 1);
  }

  function adjustZoom(
    delta: number,
    anchorX = viewportSize.width * 0.5,
    anchorY = viewportSize.height * 0.5,
    immediate = false,
  ) {
    const next = clampCameraToWorld(
      zoomCameraAtPoint(cameraTargetRef.current, delta, { x: anchorX, y: anchorY }),
    );
    cameraTargetRef.current = next;
    if (immediate) {
      setCamera(next);
      return;
    }
    setCameraTarget(next);
  }

  function updateWorkInRoute(slug?: string) {
    setOptimisticSelectedSlug(slug ?? null);
    const params = new URLSearchParams(searchParams.toString());
    if (slug) {
      params.set("work", slug);
    } else {
      params.delete("work");
    }
    const query = params.toString();
    startTransition(() => {
      router.push(query ? `${pathname}?${query}` : pathname, { scroll: false });
    });
  }

  function startIntro() {
    if (introTimeoutRef.current) {
      window.clearTimeout(introTimeoutRef.current);
      introTimeoutRef.current = null;
    }

    introCancelledRef.current = false;
    introCueKeyRef.current = null;
    setShowLeader(false);
    setFilter("all");
    setIntroIndex(0);
    setCameraTarget(initialCamera);
    updateWorkInRoute();
    setIntroActive(true);
  }

  function stopIntro() {
    if (introTimeoutRef.current) {
      window.clearTimeout(introTimeoutRef.current);
      introTimeoutRef.current = null;
    }
    introCancelledRef.current = true;
    introCueKeyRef.current = null;
    setSelectedYear(latestYear);
    setIntroActive(false);
  }

  function openWork(slug: string) {
    selectionSourceRef.current = "map";
    audio.playUiClick("city");
    stopIntro();
    setShowLeader(false);
    updateWorkInRoute(slug);
  }

  function closePanels() {
    audio.playUiClick("close");
    setShowLeader(false);
    clearSelectedUnit();
    updateWorkInRoute();
  }

  function nudgeTowardsPoint(x: number, y: number) {
    const current = cameraTargetRef.current;
    const viewportWidth = viewportSize.width;
    const viewportHeight = viewportSize.height;
    const desiredX = viewportWidth * (isTablet ? 0.52 : 0.58) - x * current.zoom;
    const desiredY = viewportHeight * 0.54 - y * current.zoom;
    const dx = clamp(desiredX - current.x, -120, 120);
    const dy = clamp(desiredY - current.y, -72, 72);

    setCameraTarget({
      zoom: current.zoom,
      x: current.x + dx * 0.22,
      y: current.y + dy * 0.18,
    });
  }

  function focusPointForIntro(x: number, y: number) {
    const current = cameraTargetRef.current;
    const introZoom = clamp(Math.max(current.zoom, isMobile ? 0.96 : 1.02), 0.72, 1.18);
    const viewportWidth = viewportSize.width;
    const viewportHeight = viewportSize.height;
    const desiredX = viewportWidth * 0.5 - x * introZoom;
    const desiredY = viewportHeight * (isMobile ? 0.58 : 0.56) - y * introZoom;

    setCameraTarget({
      zoom: introZoom,
      x: current.x + clamp(desiredX - current.x, -340, 340) * 0.78,
      y: current.y + clamp(desiredY - current.y, -220, 220) * 0.72,
    });
  }

  function resetView() {
    audio.playUiClick("toggle");
    stopIntro();
    setCameraTarget(initialCamera);
  }

  function jumpToWorkYear(work: Work) {
    audio.playUiClick("button");
    const year = world.years.find((entry) => entry >= work.startYear) ?? world.years[0];
    setSelectedYear(year);
  }

  function worldPointToScreen(x: number, y: number) {
    return worldPointToLocalPoint({ x, y }, camera, viewportSize, containerSize);
  }

  function clampCardPosition(x: number, y: number, width: number, height: number) {
    return {
      x: clamp(x, 12, containerSize.width - width),
      y: clamp(y, 12, containerSize.height - height),
    };
  }

  function screenPointToWorld(clientX: number, clientY: number) {
    const rect = containerRef.current?.getBoundingClientRect();
    const localX = clientX - (rect?.left ?? 0);
    const localY = clientY - (rect?.top ?? 0);
    const worldPoint = localPointToWorldPoint(
      { x: localX, y: localY },
      camera,
      viewportSize,
      containerSize,
      { width: world.width, height: world.height },
    );
    return { x: worldPoint.x, y: worldPoint.y, localX, localY };
  }

  function clearSelectedUnit(unitId?: string | null) {
    if (!unitId) {
      setSelectedUnitId(null);
      setSelectedUnitCard(null);
      setSelectedUnitLock(null);
      return;
    }

    setSelectedUnitId((current) => (current === unitId ? null : current));
    setSelectedUnitCard((current) => (current?.id === unitId ? null : current));
    setSelectedUnitLock((current) => (current?.id === unitId ? null : current));
  }

  function selectUnit(unit: {
    id: string;
    label: string;
    type: string;
    worldX: number;
    worldY: number;
  }, clientX?: number, clientY?: number) {
    if (selectedUnitId !== unit.id) {
      audio.playUiClick("troop");
    }

    const next =
      typeof clientX === "number" && typeof clientY === "number"
        ? screenPointToWorld(clientX, clientY)
        : null;

    setSelectedUnitId(unit.id);
    setSelectedUnitLock({ id: unit.id, x: unit.worldX, y: unit.worldY });
    setSelectedUnitCard({
      id: unit.id,
      label: unit.label,
      type: unit.type,
      ...(next
        ? {
            ...clampCardPosition(next.localX + 12, next.localY - 12, 268, 156),
          }
        : clampCardPosition(worldPointToScreen(unit.worldX, unit.worldY).x + 12, worldPointToScreen(unit.worldX, unit.worldY).y - 12, 268, 156)),
    });
  }

  useEffect(() => {
    if (!selectedCity) {
      return;
    }

    if (selectionSourceRef.current === "map") {
      selectionSourceRef.current = "route";
      return;
    }

    nudgeTowardsPoint(selectedCity.x, selectedCity.y);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCity?.slug, containerSize.height, containerSize.width]);

  useEffect(() => {
    if (selectedSlug || showLeader) {
      setIntroActive(false);
    }
  }, [selectedSlug, showLeader]);

  useEffect(() => {
    if (!introActive && introCancelledRef.current) {
      setSelectedYear(latestYear);
    }
  }, [introActive, latestYear]);

  useEffect(() => {
    if (!introActive || introSequence.length === 0 || selectedSlug || showLeader) {
      return;
    }

    const currentWork = introSequence[Math.min(introIndex, introSequence.length - 1)];
    const stepDuration = window.__CIVFOLIO_INTRO_STEP_MS ?? 2100;
    const finalDuration = window.__CIVFOLIO_INTRO_FINAL_MS ?? 1800;
    const cueKey = `${currentWork.slug}:${introIndex}`;
    if (introCueKeyRef.current !== cueKey) {
      audio.playIntroCue(introIndex >= introSequence.length - 1 ? "complete" : "founding");
      introCueKeyRef.current = cueKey;
    }
    const year = world.years.find((entry) => entry >= currentWork.startYear) ?? world.years[0];
    const state = world.states[year];
    const city = state.cities.find((entry) => entry.slug === currentWork.slug);
    setSelectedYear(year);
    if (city) {
      focusPointForIntro(city.x, city.y);
    }

    introTimeoutRef.current = window.setTimeout(() => {
      if (introIndex >= introSequence.length - 1) {
        setSelectedYear(latestYear);
        setCameraTarget(initialCamera);
        setIntroActive(false);
        return;
      }
      setIntroIndex((value) => value + 1);
    }, introIndex === introSequence.length - 1 ? finalDuration : stepDuration);

    return () => {
      if (introTimeoutRef.current) {
        window.clearTimeout(introTimeoutRef.current);
        introTimeoutRef.current = null;
      }
    };
    // focusPointForIntro intentionally tracks the latest layout/camera refs without driving effect resets.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [audio.playIntroCue, containerSize.width, introActive, introIndex, introSequence, isMobile, latestYear, selectedSlug, showLeader, world.states, world.years]);

  useEffect(() => {
    const delayMs = window.__CIVFOLIO_CREATOR_PROMPT_DELAY_MS ?? 60_000;
    const timeout = window.setTimeout(() => {
      setShowCreatorPrompt(true);
    }, delayMs);

    return () => window.clearTimeout(timeout);
  }, []);

  useEffect(() => {
    if (!showCreatorPrompt) {
      return;
    }

    const lifetimeMs = window.__CIVFOLIO_CREATOR_PROMPT_LIFETIME_MS ?? 20_000;
    const timeout = window.setTimeout(() => {
      setShowCreatorPrompt(false);
    }, lifetimeMs);

    return () => window.clearTimeout(timeout);
  }, [showCreatorPrompt]);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        stopIntro();
        closePanels();
      }

      if (event.key === "+") {
        stopIntro();
        adjustZoom(0.08);
      }

      if (event.key === "-") {
        stopIntro();
        adjustZoom(-0.08);
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
    // Keyboard handlers intentionally bind to the latest route/camera closures without re-attaching per render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [containerSize.height, containerSize.width, pathname, router, searchParams]);

  return (
    <section className="select-none px-3 pb-4 sm:px-4 lg:px-6">
      <div
        ref={containerRef}
        data-map-drag-surface="true"
        className={cn(
          "relative isolate min-h-[calc(100vh-6.75rem)] overflow-hidden rounded-[34px] border border-[rgba(244,211,141,0.18)] bg-[radial-gradient(circle_at_top,_rgba(70,120,160,0.28),_rgba(11,12,17,0.98)_56%)] shadow-[0_40px_120px_rgba(0,0,0,0.42)]",
          isDragging ? "cursor-grabbing" : "cursor-grab",
        )}
      >
        <div className="world-atmosphere pointer-events-none absolute inset-0" />
        <WorldMapPixi
          world={world}
          currentState={mapState}
          visibleCities={visibleCities}
          workBySlug={workBySlug}
          selectedYear={selectedYear}
          selectedSlug={selectedSlug}
          introFocusSlug={introFocusSlug}
          hoveredCity={hoveredCity}
          hoveredGreatWork={hoveredGreatWork}
          selectedUnitId={selectedUnitId}
          selectedUnitLock={selectedUnitLock}
          introActive={introActive}
          toolUnits={site.scene.toolUnits}
          camera={camera}
          terrainAtPoint={terrainAtPoint}
          onCameraChange={(nextCamera) => {
            const clamped = clampCameraToWorld(nextCamera);
            cameraTargetRef.current = clamped;
            setCamera(clamped);
          }}
          onDragStateChange={setIsDragging}
          onBackgroundClick={closePanels}
          onOpenWork={openWork}
          onSetHoveredCity={setHoveredCity}
          onSetHoveredGreatWork={setHoveredGreatWork}
          onStopIntro={stopIntro}
          onClearSelectedUnit={clearSelectedUnit}
          onSelectUnit={selectUnit}
        />

        <div
          className="world-fog pointer-events-none absolute inset-0"
        />

        <div
          className={cn("pointer-events-none absolute inset-x-4 top-4 z-20 flex items-start justify-between gap-4", isMobile ? "flex-col gap-3" : "flex-wrap")}
        >
            <div
              className={cn(
                "hud-drift pointer-events-auto rounded-[26px] border border-[rgba(244,211,141,0.14)] bg-[rgba(14,10,8,0.64)] shadow-[0_20px_45px_rgba(0,0,0,0.28)] backdrop-blur-xl",
                isMobile
                  ? "max-w-[17rem] px-4 py-3"
                  : isTablet
                  ? "max-w-[28rem] px-5 py-4"
                  : "max-w-[36rem] px-5 py-4",
            )}
          >
            <div className="flex flex-wrap items-center gap-3">
              <span className="rounded-full border border-[var(--accent)] bg-[rgba(244,211,141,0.08)] px-3 py-1 text-[10px] uppercase tracking-[0.28em] text-[var(--accent-strong)]">
                Living world portfolio
              </span>
              <span className="rounded-full border border-white/10 px-3 py-1 text-[10px] uppercase tracking-[0.24em] text-[var(--muted)]">
                {currentState.label}
              </span>
            </div>
            <h1 className={cn("mt-3 font-display leading-[0.94] text-[var(--parchment)]", isMobile ? "text-[2.35rem]" : isTablet ? "text-5xl" : "text-6xl")}>
              {leader.name}
              <span className="mt-2 block text-[0.5em] leading-[1.08] uppercase tracking-[0.18em] text-[var(--accent-strong)]">
                Strategy Map of Work
              </span>
            </h1>
            {isMobile ? null : (
              <p className={cn("mt-3 max-w-xl text-[var(--muted-soft)]", isTablet ? "text-sm leading-6" : "text-sm leading-7")}>
                Pan, zoom, scrub time, and open cities to inspect the systems, products, and media work that built this world.
              </p>
            )}
            <div className="mt-4 flex flex-wrap gap-2">
              <OverlayButton
                active={showLeader}
                onClick={() => {
                  audio.playUiClick("button");
                  stopIntro();
                  setShowLeader((value) => !value);
                  updateWorkInRoute();
                }}
              >
                Leader Profile
              </OverlayButton>
              {isMobile ? null : (
                <>
                  <Link
                    href="/archive"
                    className="inline-flex min-h-10 items-center justify-center rounded-full border border-white/12 bg-[rgba(255,255,255,0.06)] px-4 py-2 text-[11px] uppercase tracking-[0.24em] text-[var(--muted-soft)] transition hover:border-[var(--accent)] hover:text-[var(--accent-strong)]"
                  >
                    Civilopedia
                  </Link>
                  <Link
                    href="/about"
                    className="inline-flex min-h-10 items-center justify-center rounded-full border border-white/12 bg-[rgba(255,255,255,0.06)] px-4 py-2 text-[11px] uppercase tracking-[0.24em] text-[var(--muted-soft)] transition hover:border-[var(--accent)] hover:text-[var(--accent-strong)]"
                  >
                    About
                  </Link>
                </>
              )}
            </div>
          </div>

          <div className={cn("pointer-events-auto flex items-start justify-end gap-3", isMobile ? "w-full flex-wrap" : "flex-wrap")}>
            {isMobile ? null : <StatChip label="Visible Cities" value={visibleCities.length} />}
            {isMobile ? null : (
              <StatChip
                label="Map Focus"
                value={filter === "all" ? "All" : formatDisciplineLabel(filter)}
              />
            )}
            <div className={cn("rounded-[24px] border border-white/10 bg-[rgba(14,10,8,0.62)] p-2 shadow-[0_18px_45px_rgba(0,0,0,0.24)] backdrop-blur-xl", isMobile ? "w-full max-w-[19.5rem]" : "")}>
              <div className={cn("flex flex-wrap gap-2", isMobile ? "justify-start" : "")}>
                <OverlayButton
                  onClick={() => {
                    audio.playUiClick("toggle");
                    stopIntro();
                    adjustZoom(-0.08);
                  }}
                >
                  -
                </OverlayButton>
                <OverlayButton
                  onClick={() => {
                    audio.playUiClick("toggle");
                    stopIntro();
                    adjustZoom(0.08);
                  }}
                >
                  +
                </OverlayButton>
                <OverlayButton onClick={resetView}>Reset</OverlayButton>
                <OverlayButton
                  onClick={() => {
                    audio.playUiClick("toggle");
                    void audio.toggleMusic();
                  }}
                  className={isMobile ? "min-w-[8.75rem]" : undefined}
                >
                  {audio.status === "on"
                    ? `${site.audio.label} on`
                    : audio.status === "blocked"
                      ? "Audio blocked"
                      : `${site.audio.label} off`}
                </OverlayButton>
                <OverlayButton
                  active={showLegend}
                  onClick={() => {
                    audio.playUiClick("toggle");
                    stopIntro();
                    setShowLegend((value) => !value);
                  }}
                  className={isMobile ? "px-3" : undefined}
                >
                  Map Key
                </OverlayButton>
                {introActive ? null : (
                  <OverlayButton
                    onClick={() => {
                      audio.playUiClick("button");
                      startIntro();
                    }}
                    className={isMobile ? "min-w-[8.75rem]" : undefined}
                  >
                    Replay Intro
                  </OverlayButton>
                )}
              </div>
            </div>
          </div>
        </div>

        {introPanelVisible && currentIntroWork ? (
          <div className={cn("pointer-events-none absolute inset-x-4 z-20 flex justify-center", isMobile ? "top-44" : "top-28")}>
            <div
              data-testid="intro-panel"
              className={cn(
                "panel-enter hud-drift rounded-[26px] border border-[rgba(244,211,141,0.18)] bg-[rgba(17,12,9,0.72)] text-center shadow-[0_24px_70px_rgba(0,0,0,0.34)] backdrop-blur-xl transition-[opacity,transform,filter] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] will-change-transform",
                isMobile ? "w-[min(22rem,100%)] px-4 py-4" : "w-[min(30rem,100%)] px-5 py-4",
                introActive
                  ? "pointer-events-auto opacity-100 translate-y-0 scale-100 blur-0"
                  : "pointer-events-none opacity-0 -translate-y-3 scale-[0.985] blur-[2px]",
              )}
            >
              <div className="text-[10px] uppercase tracking-[0.28em] text-[var(--accent-strong)]">
                Campaign Replay · {introIndex + 1}/{introSequence.length}
              </div>
              <div
                data-testid="intro-title"
                className={cn("mt-2 font-display text-[var(--parchment)]", isMobile ? "text-[2rem] leading-none" : "text-3xl")}
              >
                Founding {currentIntroWork.title}
              </div>
              <div className="mt-3 flex flex-wrap items-center justify-center gap-2 text-[10px] uppercase tracking-[0.22em] text-[var(--muted)]">
                <span className="rounded-full border border-white/10 px-3 py-1">{currentIntroWork.era}</span>
                <span className="rounded-full border border-white/10 px-3 py-1">{currentIntroWork.startYear}</span>
                <span className="rounded-full border border-white/10 px-3 py-1">{formatDisciplineLabel(currentIntroWork.discipline)}</span>
              </div>
              <p className={cn("mt-3 text-[var(--muted-soft)]", isMobile ? "text-sm leading-6" : "text-sm leading-7")}>
                {currentIntroWork.summary}
              </p>
              <div className="mt-4 h-2 overflow-hidden rounded-full border border-white/10 bg-[rgba(255,255,255,0.05)]">
                <div
                  className="h-full rounded-full bg-[linear-gradient(90deg,rgba(244,211,141,0.72),rgba(244,211,141,0.96))] transition-[width] duration-500 ease-out"
                  style={{ width: `${introProgress * 100}%` }}
                />
              </div>
              <p className="mt-3 text-[11px] uppercase tracking-[0.2em] text-[var(--muted)]">
                The world is founding itself. Drag, zoom, or open any city to take control.
              </p>
              <div className="mt-4 flex flex-wrap justify-center gap-2">
                <OverlayButton
                  onClick={() => {
                    audio.playUiClick("close");
                    stopIntro();
                  }}
                >
                  Skip Intro
                </OverlayButton>
              </div>
            </div>
          </div>
        ) : null}

        <div
          data-map-interactive="true"
          className={cn(
            "absolute z-20 rounded-[28px] border border-[rgba(244,211,141,0.14)] bg-[rgba(14,10,8,0.68)] shadow-[0_20px_45px_rgba(0,0,0,0.28)] backdrop-blur-xl",
            isMobile
              ? "bottom-4 left-4 right-4 px-4 py-3"
              : isTablet
                ? "bottom-4 left-4 right-40 px-5 py-4"
                : "bottom-4 left-4 max-w-[620px] px-5 py-4",
          )}
        >
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="text-[10px] uppercase tracking-[0.28em] text-[var(--muted)]">Time progression</div>
              <div className="mt-1 font-display text-3xl text-[var(--accent-strong)]">{selectedYear}</div>
            </div>
            <div className={cn("text-[var(--muted-soft)]", isMobile ? "max-w-full text-[13px] leading-5" : "text-sm leading-7")}>{currentState.description}</div>
          </div>
          <input
            type="range"
            min={0}
            max={world.years.length - 1}
            step={1}
            value={world.years.indexOf(selectedYear)}
            onChange={(event) => {
              stopIntro();
              setSelectedYear(world.years[Number(event.currentTarget.value)]);
            }}
            className="mt-4 w-full accent-[var(--accent)]"
            aria-label="Timeline slider"
          />
          <div className="mt-3 flex justify-between text-[10px] uppercase tracking-[0.18em] text-[var(--muted)]">
            {world.years.map((year) => (
              <span key={year}>{year}</span>
            ))}
          </div>
          <div className={cn("mt-4", isMobile ? "-mx-1 overflow-x-auto pb-1" : "")}>
            <div className={cn("flex gap-2", isMobile ? "min-w-max px-1" : "flex-wrap")}>
              {(["all", "code", "art", "music", "video", "writing", "client"] as const).map((discipline) => (
                <OverlayButton
                  key={discipline}
                  active={filter === discipline}
                  onClick={() => {
                    audio.playUiClick("toggle");
                    stopIntro();
                    setFilter(discipline);
                  }}
                  className="px-3 py-1.5 text-[10px]"
                >
                  {discipline === "all" ? "All" : formatDisplayLabel(discipline)}
                </OverlayButton>
              ))}
            </div>
          </div>
        </div>

        <div className="absolute bottom-4 right-4 z-20 hidden flex-col items-end gap-3 md:flex">
          {legendPanelVisible ? (
            <div
              data-map-interactive="true"
              className={cn(
                "panel-enter w-80 rounded-[24px] border border-[rgba(244,211,141,0.14)] bg-[rgba(14,10,8,0.78)] p-4 text-sm leading-7 text-[var(--muted-soft)] shadow-[0_20px_45px_rgba(0,0,0,0.28)] backdrop-blur-xl transition-[opacity,transform,filter] duration-220 ease-[cubic-bezier(0.22,1,0.36,1)] will-change-transform",
                showLegend
                  ? "pointer-events-auto opacity-100 translate-y-0 scale-100 blur-0"
                  : "pointer-events-none opacity-0 translate-y-2 scale-[0.985] blur-[2px]",
              )}
            >
              <div className="font-display text-3xl text-[var(--accent-strong)]">Map Key</div>
              <div className="mt-4 space-y-3">
                <div className="flex items-start gap-3">
                  <svg width="24" height="24" viewBox="0 0 24 24" className="mt-1 shrink-0">
                    <circle cx="12" cy="12" r="8" fill="#d8b470" fillOpacity="0.2" />
                    <circle cx="12" cy="12" r="5" fill="#f4d38d" />
                  </svg>
                  <p>Settlements, towns, capitals, and wonders scale with project importance, maturity, and momentum.</p>
                </div>
                <div className="flex items-start gap-3">
                  <svg width="24" height="24" viewBox="0 0 24 24" className="mt-1 shrink-0">
                    <path d="M 3 17 C 7 8 16 8 21 17" fill="none" stroke="#9ad5f6" strokeWidth="2" strokeLinecap="round" />
                  </svg>
                  <p>Rivers, roads, and routes mark shared systems, integrations, and cross-project influence.</p>
                </div>
                <div className="flex items-start gap-3">
                  <svg width="24" height="24" viewBox="0 0 24 24" className="mt-1 shrink-0">
                    <rect x="4" y="7" width="16" height="10" rx="3" fill="rgba(244,211,141,0.18)" stroke="#f4d38d" />
                    <path d="M 7 15 L 7 10 M 11 15 L 11 8 M 15 15 L 15 10" stroke="#f4d38d" strokeWidth="1.4" strokeLinecap="round" />
                  </svg>
                  <p>Improvements are skill tiles: farms, workshops, harbors, and academies that show what each city learned to grow.</p>
                </div>
                <div className="flex items-start gap-3">
                  <svg width="24" height="24" viewBox="0 0 24 24" className="mt-1 shrink-0">
                    <path d="M 5 18 L 12 4 L 19 18 Z" fill="rgba(244,211,141,0.22)" stroke="#f4d38d" />
                  </svg>
                  <p>Great Works are landmark achievements. Their names appear on hover to keep the world readable.</p>
                </div>
              </div>
            </div>
          ) : null}
          <div
            data-map-interactive="true"
            className="rounded-[24px] border border-[rgba(244,211,141,0.14)] bg-[rgba(14,10,8,0.72)] p-3 shadow-[0_20px_45px_rgba(0,0,0,0.28)] backdrop-blur-xl"
          >
            <div className="mb-2 text-[10px] uppercase tracking-[0.24em] text-[var(--muted)]">Minimap</div>
            <svg
              data-map-interactive="true"
              width="220"
              height="148"
              viewBox={`0 0 ${world.width} ${world.height}`}
              onClick={(event) => {
                stopIntro();
                const rect = event.currentTarget.getBoundingClientRect();
                const x = ((event.clientX - rect.left) / rect.width) * world.width;
                const y = ((event.clientY - rect.top) / rect.height) * world.height;
                nudgeTowardsPoint(x, y);
              }}
              className="cursor-pointer"
            >
              <rect width={world.width} height={world.height} rx={14} fill="#0b121b" />
              {mapState.routes.map((route) => (
                <path key={route.id} d={route.path} fill="none" stroke="rgba(212,176,106,0.25)" strokeWidth={8} />
              ))}
              {mapState.cities.map((city) => (
                <circle
                  key={city.slug}
                  cx={city.x}
                  cy={city.y}
                  r={city.slug === selectedSlug ? 22 : city.level === "wonder" ? 16 : 12}
                  fill={disciplineTone[city.discipline]}
                  fillOpacity={city.slug === selectedSlug ? 1 : 0.82}
                />
              ))}
              <rect
                x={clamp(-camera.x / camera.zoom, 0, world.width)}
                y={clamp(-camera.y / camera.zoom, 0, world.height)}
                width={clamp(containerSize.width / camera.zoom, 120, world.width)}
                height={clamp(containerSize.height / camera.zoom, 120, world.height)}
                fill="none"
                stroke="#f4d38d"
                strokeWidth={10}
              />
            </svg>
          </div>
        </div>

        {hoveredCity ? (
          (() => {
            const city = mapState.cities.find((candidate) => candidate.slug === hoveredCity);
            if (!city) {
              return null;
            }

            const screenPoint = worldPointToScreen(city.x, city.y);
            const tooltipWidth = 320;
            const horizontalOffset = 24;
            const verticalInset = 128;
            const spaceLeft = screenPoint.x;
            const spaceRight = containerSize.width - screenPoint.x;
            const preferRight = spaceRight >= tooltipWidth + 40 || spaceRight >= spaceLeft;
            const anchoredLeft = preferRight
              ? screenPoint.x + horizontalOffset
              : screenPoint.x - tooltipWidth - horizontalOffset;
            const anchoredCenterY = clamp(screenPoint.y, verticalInset, containerSize.height - verticalInset);
            const tooltipPosition = {
              x: clamp(anchoredLeft, 12, containerSize.width - tooltipWidth),
              y: anchoredCenterY,
            };

            return (
              <div
                data-testid="city-tooltip"
                data-city-slug={city.slug}
                data-city-screen-x={screenPoint.x.toFixed(1)}
                data-city-screen-y={screenPoint.y.toFixed(1)}
                data-map-interactive="true"
                className="pointer-events-none absolute z-[70] w-80 rounded-[24px] border border-[var(--accent)] bg-[rgba(18,12,9,0.9)] px-4 py-4 shadow-[0_18px_50px_rgba(0,0,0,0.42)]"
                style={{
                  left: tooltipPosition.x,
                  top: tooltipPosition.y,
                  transform: "translateY(-50%)",
                }}
              >
                <div className="text-[10px] uppercase tracking-[0.24em] text-[var(--accent-strong)]">
                  {formatDisplayLabel(city.level)} · {formatDisciplineLabel(city.discipline)}
                </div>
                <div className="mt-1 font-display text-3xl text-[var(--parchment)]">{city.title}</div>
                <div className="mt-2 text-sm leading-7 text-[var(--muted-soft)]">{city.summary}</div>
                <div className="mt-3 flex flex-wrap gap-2 text-[10px] uppercase tracking-[0.2em] text-[var(--muted)]">
                  <span>{city.region}</span>
                  <span>{city.era}</span>
                  <span>{formatDisplayLabel(city.terrain)}</span>
                </div>
              </div>
            );
          })()
        ) : null}

        {selectedUnitCard ? (
          <div
            data-map-interactive="true"
            className="pointer-events-none absolute z-[70] w-64 rounded-[22px] border border-[var(--accent)] bg-[rgba(18,12,9,0.92)] px-4 py-4 shadow-[0_18px_50px_rgba(0,0,0,0.42)]"
            style={{
              left: clamp(selectedUnitCard.x + 18, 12, containerSize.width - 268),
              top: clamp(selectedUnitCard.y - 84, 12, containerSize.height - 156),
            }}
          >
            <div className="text-[10px] uppercase tracking-[0.24em] text-[var(--accent-strong)]">
              Traveler · {formatDisplayLabel(selectedUnitCard.type)}
            </div>
            <div className="mt-2 font-display text-3xl text-[var(--parchment)]">{selectedUnitCard.label}</div>
            <div className="mt-2 text-sm leading-7 text-[var(--muted-soft)]">
              {getTravelerFlavor(selectedUnitCard.label, selectedUnitCard.type)}
            </div>
          </div>
        ) : null}

        {creatorPromptVisible ? (
          <div
            data-testid="creator-prompt"
            data-map-interactive="true"
            className={cn(
              "panel-enter absolute z-[55] rounded-[24px] border border-[rgba(244,211,141,0.18)] bg-[rgba(16,11,9,0.84)] shadow-[0_24px_60px_rgba(0,0,0,0.34)] backdrop-blur-xl transition-[opacity,transform,filter] duration-220 ease-[cubic-bezier(0.22,1,0.36,1)] will-change-transform",
              isMobile ? "bottom-4 left-4 right-4 p-4" : "bottom-4 left-4 w-[min(26rem,calc(100%-3rem))] p-4",
              showCreatorPrompt
                ? "pointer-events-auto opacity-100 translate-y-0 scale-100 blur-0"
                : "pointer-events-none opacity-0 translate-y-2 scale-[0.985] blur-[2px]",
            )}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-[10px] uppercase tracking-[0.24em] text-[var(--accent-strong)]">Build Your Own</div>
                <div className="mt-2 font-display text-2xl leading-tight text-[var(--parchment)]">
                  Enjoy what you&apos;re seeing here? Want to create your own?
                </div>
              </div>
              <OverlayButton
                onClick={() => setShowCreatorPrompt(false)}
                className="px-3 py-2 text-[10px]"
              >
                Close
              </OverlayButton>
            </div>
            <p className="mt-3 text-sm leading-7 text-[var(--muted-soft)]">
              Give your Codex or Claude the README link below to get started.
            </p>
            <a
              href="https://github.com/BigOtis/CivFolio"
              target="_blank"
              rel="noreferrer"
              className="mt-4 inline-flex rounded-full border border-[var(--accent)] bg-[rgba(244,211,141,0.08)] px-4 py-2 text-[11px] uppercase tracking-[0.24em] text-[var(--accent-strong)] transition hover:bg-[rgba(244,211,141,0.16)]"
            >
              CivFolio README
            </a>
          </div>
        ) : null}

        {leaderPanelVisible ? (
          <div
            className={cn(
              "pointer-events-none absolute inset-0 z-[60] flex p-4",
              isMobile ? "items-start justify-center pt-24" : "items-center justify-center",
            )}
          >
            <div
              data-map-interactive="true"
              className={cn(
                "panel-enter pointer-events-auto flex flex-col overflow-hidden rounded-[30px] border border-[rgba(244,211,141,0.18)] bg-[rgba(17,12,9,0.9)] shadow-[0_28px_90px_rgba(0,0,0,0.42)] backdrop-blur-xl transition-[opacity,transform,filter] duration-220 ease-[cubic-bezier(0.22,1,0.36,1)] will-change-transform",
                isMobile
                  ? "w-[min(36rem,calc(100%-1rem))] max-h-[calc(100vh-7rem)]"
                  : "w-[min(46rem,calc(100%-3rem))] max-h-[calc(100vh-4rem)]",
                showLeader
                  ? "opacity-100 translate-y-0 scale-100 blur-0"
                  : "pointer-events-none opacity-0 -translate-y-2 scale-[0.985] blur-[2px]",
              )}
            >
            <div className="flex items-start justify-between gap-4 border-b border-white/10 px-5 py-4">
                <div className="flex items-start gap-4">
                <Image
                  src={leader.avatar}
                  alt={leader.name}
                  width={640}
                  height={640}
                  className="h-20 w-20 rounded-[24px] border border-white/10 object-cover"
                  unoptimized
                />
                <div>
                  <div className="text-[10px] uppercase tracking-[0.24em] text-[var(--accent-strong)]">Leader Screen</div>
                  <h2 className="mt-2 font-display text-4xl leading-none text-[var(--parchment)]">{leader.name}</h2>
                  <p className="mt-2 text-sm leading-7 text-[var(--muted-soft)]">{leader.headline}</p>
                  {leader.currentRole ? (
                    <p className="mt-2 text-[10px] uppercase tracking-[0.24em] text-[var(--muted)]">
                      Current office: {leader.currentRole}
                    </p>
                  ) : null}
                </div>
              </div>
              <OverlayButton
                onClick={() => {
                  audio.playUiClick("close");
                  setShowLeader(false);
                }}
                className="px-3 py-2 text-[10px]"
              >
                Close
              </OverlayButton>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-5 pb-8">
            <p className="text-sm leading-7 text-[var(--muted-soft)]">{leader.summary}</p>

            <div className="mt-5 grid gap-3 sm:grid-cols-3">
              <div className="rounded-[20px] border border-white/10 bg-[rgba(255,255,255,0.05)] px-4 py-3">
                <div className="text-[10px] uppercase tracking-[0.24em] text-[var(--muted)]">Civilization</div>
                <div className="mt-1 text-sm text-[var(--parchment)]">Builder-Technologist</div>
              </div>
              <div className="rounded-[20px] border border-white/10 bg-[rgba(255,255,255,0.05)] px-4 py-3">
                <div className="text-[10px] uppercase tracking-[0.24em] text-[var(--muted)]">Capital</div>
                <div className="mt-1 text-sm text-[var(--parchment)]">Robot Future</div>
              </div>
              <div className="rounded-[20px] border border-white/10 bg-[rgba(255,255,255,0.05)] px-4 py-3">
                <div className="text-[10px] uppercase tracking-[0.24em] text-[var(--muted)]">Current Campaign</div>
                <div className="mt-1 text-sm text-[var(--parchment)]">Agentic AI Systems</div>
              </div>
            </div>

            <div className="mt-5 space-y-3">
              <div className="text-[10px] uppercase tracking-[0.24em] text-[var(--muted)]">Founding Principles</div>
              {leader.philosophy.map((item) => (
                <div
                  key={item}
                  className="rounded-[20px] border border-white/10 bg-[rgba(255,255,255,0.05)] px-4 py-3 text-sm text-[var(--muted-soft)]"
                >
                  {item}
                </div>
              ))}
            </div>

            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <div className="space-y-3">
                <div className="text-[10px] uppercase tracking-[0.24em] text-[var(--muted)]">Civilization Traits</div>
                {leader.featuredSkills.map((item) => (
                  <div key={item} className="rounded-[20px] border border-white/10 bg-[rgba(255,255,255,0.05)] px-4 py-3 text-sm text-[var(--muted-soft)]">
                    {item}
                  </div>
                ))}
              </div>
              <div className="space-y-3">
                <div className="text-[10px] uppercase tracking-[0.24em] text-[var(--muted)]">Historic Milestones</div>
                {leader.achievements.map((item) => (
                  <div key={item} className="rounded-[20px] border border-white/10 bg-[rgba(255,255,255,0.05)] px-4 py-3 text-sm text-[var(--muted-soft)]">
                    {item}
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-5 flex flex-wrap gap-3">
              {leader.contactLinks.map((link) => (
                <a
                  key={link.url}
                  href={link.url}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-full border border-[var(--accent)] bg-[rgba(244,211,141,0.08)] px-4 py-2 text-sm text-[var(--accent-strong)] transition hover:bg-[rgba(244,211,141,0.16)]"
                >
                  {link.label}
                </a>
              ))}
            </div>
            </div>
            </div>
          </div>
        ) : null}

        {selectedWorkPanel.present && selectedWorkPanel.retained ? (
          <div
            data-map-interactive="true"
            className={cn(
              "panel-enter absolute z-30 flex flex-col overflow-hidden rounded-[30px] border border-[rgba(244,211,141,0.18)] bg-[rgba(16,11,9,0.86)] shadow-[0_28px_90px_rgba(0,0,0,0.42)] backdrop-blur-xl transition-[opacity,transform,filter] duration-240 ease-[cubic-bezier(0.22,1,0.36,1)] will-change-transform",
              isMobile
                ? "bottom-4 left-4 right-4 top-auto max-h-[68vh]"
                : "bottom-4 right-4 top-28 w-[min(440px,calc(100%-2rem))] lg:right-6 lg:top-24",
              selectedWork && selectedWorkVisible
                ? "pointer-events-auto opacity-100 translate-x-0 scale-100 blur-0"
                : "pointer-events-none opacity-0 translate-x-4 scale-[0.985] blur-[2px]",
            )}
          >
            <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
              <div>
                <div className="text-[10px] uppercase tracking-[0.24em] text-[var(--accent-strong)]">City Management View</div>
                <div className="mt-1 font-display text-3xl leading-none text-[var(--parchment)]">{selectedWorkPanel.retained.title}</div>
              </div>
              <OverlayButton onClick={closePanels} className="px-3 py-2 text-[10px]">Close</OverlayButton>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-5 pb-8">
              <WorkDetail
                work={selectedWorkPanel.retained}
                github={selectedPanelGithub || undefined}
                cityLevel={selectedPanelCity?.level}
                mode="panel"
              />
            </div>
          </div>
        ) : hiddenWorkPanel.present && hiddenWorkPanel.retained ? (
          (() => {
            const retainedHiddenWork = hiddenWorkPanel.retained;

            return (
          <div
            data-map-interactive="true"
            className={cn(
              "panel-enter absolute z-30 rounded-[30px] border border-[rgba(244,211,141,0.18)] bg-[rgba(16,11,9,0.86)] p-6 shadow-[0_28px_90px_rgba(0,0,0,0.42)] backdrop-blur-xl transition-[opacity,transform,filter] duration-240 ease-[cubic-bezier(0.22,1,0.36,1)] will-change-transform",
              isMobile ? "left-4 right-4 top-40" : "right-4 top-28 w-[min(440px,calc(100%-2rem))]",
              selectedWork && !selectedWorkVisible
                ? "pointer-events-auto opacity-100 translate-x-0 scale-100 blur-0"
                : "pointer-events-none opacity-0 translate-x-4 scale-[0.985] blur-[2px]",
            )}
          >
            <div className="text-[10px] uppercase tracking-[0.24em] text-[var(--accent-strong)]">Not visible in {selectedYear}</div>
            <h2 className="mt-3 font-display text-4xl text-[var(--parchment)]">{retainedHiddenWork.title}</h2>
            <p className="mt-3 text-sm leading-8 text-[var(--muted-soft)]">
              This city has not appeared in the selected era. Jump to its founding year or open the full dossier route directly.
            </p>
            <div className="mt-5 flex flex-wrap gap-3">
              <OverlayButton onClick={() => jumpToWorkYear(retainedHiddenWork)} active>
                Jump to {retainedHiddenWork.startYear}
              </OverlayButton>
              <Link
                href={`/work/${retainedHiddenWork.slug}`}
                className="rounded-full border border-white/10 px-4 py-2 text-[11px] uppercase tracking-[0.24em] text-[var(--muted-soft)]"
              >
                Open Dossier
              </Link>
            </div>
          </div>
            );
          })()
        ) : commandBriefVisible ? (
          <div
            className={cn(
              "panel-enter hud-drift absolute right-4 top-28 z-20 hidden max-w-sm rounded-[26px] border border-[rgba(244,211,141,0.14)] bg-[rgba(14,10,8,0.66)] px-5 py-4 shadow-[0_18px_45px_rgba(0,0,0,0.26)] backdrop-blur-xl xl:block transition-[opacity,transform,filter] duration-220 ease-[cubic-bezier(0.22,1,0.36,1)] will-change-transform",
              !selectedWork && !showLeader && !isTablet && !isShort
                ? "pointer-events-auto opacity-100 translate-y-0 scale-100 blur-0"
                : "pointer-events-none opacity-0 translate-y-2 scale-[0.985] blur-[2px]",
            )}
          >
            <div className="text-[10px] uppercase tracking-[0.24em] text-[var(--accent-strong)]">Command Brief</div>
            <div className="mt-2 font-display text-3xl text-[var(--parchment)]">Open a city to inspect the work.</div>
            <p className="mt-2 text-sm leading-7 text-[var(--muted-soft)]">
              Hover for a quick read, click for the city management dossier, and scrub time to watch the empire grow.
            </p>
          </div>
        ) : null}
      </div>
    </section>
  );
}

