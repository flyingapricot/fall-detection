import { useEffect, useState } from "react";

export default function FallAlertBanner({ active }: { active: boolean }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (active) {
      setVisible(true);
      return;
    }
    const timer = setTimeout(() => setVisible(false), 5000);
    return () => clearTimeout(timer);
  }, [active]);

  return (
    <div
      className={`overflow-hidden transition-all duration-500 ease-in-out ${
        visible ? "max-h-20 opacity-100" : "max-h-0 opacity-0"
      }`}
    >
      <div className="animate-pulse rounded-lg border border-red-500/50 bg-red-500/10 px-4 py-3 text-center font-semibold text-red-400">
        !! FALL DETECTED !!
      </div>
    </div>
  );
}
