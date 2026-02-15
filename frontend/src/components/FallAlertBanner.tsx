import { useEffect, useState } from "react";

export default function FallAlertBanner({ active }: { active: boolean }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (active) {
      setVisible(true);
      return;
    }
    // Keep visible for 5s after last fall event
    const timer = setTimeout(() => setVisible(false), 5000);
    return () => clearTimeout(timer);
  }, [active]);

  if (!visible) return null;

  return (
    <div className="animate-pulse rounded-lg border border-red-500/50 bg-red-500/10 px-4 py-3 text-center font-semibold text-red-400">
      !! FALL DETECTED !!
    </div>
  );
}
