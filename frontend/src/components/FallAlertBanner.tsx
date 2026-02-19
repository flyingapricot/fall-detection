export default function FallAlertBanner({ active }: { active: boolean }) {
  return (
    <>
      <style>{`
        @keyframes fall-over {
          0%, 12%  { transform: rotate(0deg); }
          40%, 58% { transform: rotate(85deg); }
          85%, 100% { transform: rotate(0deg); }
        }
        @keyframes fall-over-delayed {
          0%, 12%  { transform: rotate(0deg); }
          40%, 58% { transform: rotate(-85deg); }
          85%, 100% { transform: rotate(0deg); }
        }
        .fall-figure-left {
          animation: fall-over 2.4s ease-in-out infinite;
          transform-origin: center bottom;
          display: block;
        }
        .fall-figure-right {
          animation: fall-over-delayed 2.4s ease-in-out infinite;
          animation-delay: 1.2s;
          transform-origin: center bottom;
          display: block;
        }
      `}</style>
      <div className={`overflow-hidden transition-all duration-500 ease-in-out ${active ? "max-h-24 opacity-100" : "max-h-0 opacity-0"}`}>
        <div className="flex items-center justify-center gap-5 rounded-lg border border-red-500/40 bg-red-500/10 px-6 py-3">
          <svg
            className="fall-figure-left"
            viewBox="0 0 24 40" width="26" height="44"
            stroke="#f87171" strokeWidth="2.2" strokeLinecap="round" fill="none"
          >
            <circle cx="12" cy="5" r="3.8" />
            <line x1="12" y1="9" x2="12" y2="23" />
            <line x1="12" y1="14" x2="4"  y2="19" />
            <line x1="12" y1="14" x2="20" y2="19" />
            <line x1="12" y1="23" x2="7"  y2="36" />
            <line x1="12" y1="23" x2="17" y2="36" />
          </svg>

          <span className="text-sm font-bold tracking-widest text-red-400 uppercase">
            Fall Detected
          </span>

          <svg
            className="fall-figure-right"
            viewBox="0 0 24 40" width="26" height="44"
            stroke="#f87171" strokeWidth="2.2" strokeLinecap="round" fill="none"
          >
            <circle cx="12" cy="5" r="3.8" />
            <line x1="12" y1="9" x2="12" y2="23" />
            <line x1="12" y1="14" x2="4"  y2="19" />
            <line x1="12" y1="14" x2="20" y2="19" />
            <line x1="12" y1="23" x2="7"  y2="36" />
            <line x1="12" y1="23" x2="17" y2="36" />
          </svg>
        </div>
      </div>
    </>
  );
}
