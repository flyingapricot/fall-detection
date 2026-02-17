export default function FallAlertBanner({ active }: { active: boolean }) {
  return (
    <div
      className={`overflow-hidden transition-all duration-500 ease-in-out ${
        active ? "max-h-20 opacity-100" : "max-h-0 opacity-0"
      }`}
    >
      <div className="animate-pulse rounded-lg border border-red-500/50 bg-red-500/10 px-4 py-3 text-center font-semibold text-red-400">
        !! FALL DETECTED !!
      </div>
    </div>
  );
}
