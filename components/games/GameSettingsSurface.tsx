"use client";

type GameSettingsSurfaceProps = {
  children: React.ReactNode;
  className?: string;
  onClose?: () => void;
};

export function GameSettingsDropdown({ children, className = "", onClose }: GameSettingsSurfaceProps) {
  const inline = className.split(/\s+/).includes("static");

  return (
    <div
      data-game-settings-surface
      data-inline={inline ? "true" : undefined}
      className={`fixed right-4 top-[calc(4.5rem+env(safe-area-inset-top))] z-[70] flex max-h-[calc(100dvh-5.5rem-env(safe-area-inset-top)-env(safe-area-inset-bottom))] w-72 max-w-[calc(100vw-2rem-env(safe-area-inset-left)-env(safe-area-inset-right))] flex-col overflow-hidden overscroll-contain rounded-2xl border border-black/8 bg-white shadow-[0_18px_48px_rgba(15,23,42,0.16)] text-sm ${className}`}
    >
      {onClose && (
        <div className="flex shrink-0 items-center justify-between border-b border-black/8 bg-white px-4 py-3">
          <span className="font-bold">Game settings</span>
          <button type="button" onClick={onClose} aria-label="Close settings" className="rounded-full border border-black/10 px-3 py-1.5 font-semibold hover:bg-black/5">
            Close
          </button>
        </div>
      )}
      <div data-game-settings-content className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-4">
        {children}
      </div>
    </div>
  );
}

export function GameSettingsModal({ children, className = "", onClose }: GameSettingsSurfaceProps) {
  return (
    <div data-game-settings-modal className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/40 p-4" style={{ paddingTop: "max(1rem, env(safe-area-inset-top))", paddingBottom: "max(1rem, env(safe-area-inset-bottom))" }}>
      <div
        className={`my-auto max-h-[calc(100dvh-2rem-env(safe-area-inset-top)-env(safe-area-inset-bottom))] w-full max-w-2xl overflow-y-auto overscroll-contain rounded-3xl border border-black/8 bg-white p-6 shadow-[0_24px_80px_rgba(15,23,42,0.18)] ${className}`}
        style={{ fontFamily: "var(--font-comic-neue), 'Comic Sans MS', 'Comic Sans', cursive" }}
      >
        {onClose && <div className="sticky top-0 z-10 -mx-6 -mt-6 mb-3 flex justify-end bg-white p-3"><button type="button" onClick={onClose} aria-label="Close settings" className="rounded-full border border-black/10 px-3 py-1.5 font-semibold">Close</button></div>}
        {children}
      </div>
    </div>
  );
}
