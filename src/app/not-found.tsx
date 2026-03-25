import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto flex min-h-screen w-full max-w-3xl flex-col items-center justify-center gap-6 px-6 text-center">
      <div className="text-[10px] uppercase tracking-[0.28em] text-[var(--accent-strong)]">
        Lost in the fog of war
      </div>
      <h1 className="font-display text-6xl text-[var(--parchment)]">404</h1>
      <p className="max-w-xl text-lg leading-8 text-[var(--muted-soft)]">
        The requested city dossier could not be found. Return to the world map and explore from
        there.
      </p>
      <Link
        href="/"
        className="rounded-full border border-[var(--accent)] bg-[rgba(244,211,141,0.08)] px-5 py-3 text-sm text-[var(--accent-strong)]"
      >
        Back to world map
      </Link>
    </div>
  );
}
