'use client';

export function BackgroundLogo() {
  return (
    <div className="absolute -bottom-32 -left-32 w-[400px] h-[400px] rotate-[25deg] pointer-events-none">
      {/* Outer Glow */}
      <div className="absolute inset-0 rounded-full bg-amber-400/20 blur-3xl animate-pulse" />
      {/* Inner Glow */}
      <div className="absolute inset-8 rounded-full bg-amber-500/15 blur-2xl" />
      {/* Logo Frame with Border */}
      <div className="absolute inset-12 rounded-full border-2 border-amber-400/30 shadow-[0_0_60px_rgba(251,191,36,0.3)]">
        <div className="absolute inset-2 rounded-full border border-amber-300/20" />
        <img
          src="/1769648461618.png"
          alt=""
          className="w-full h-full rounded-full object-cover opacity-15"
        />
      </div>
      {/* Shimmer Effect */}
      <div className="absolute inset-12 rounded-full overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full animate-[shimmer_3s_infinite]" />
      </div>
    </div>
  );
}
