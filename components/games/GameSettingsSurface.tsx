"use client";

type GameSettingsSurfaceProps = {
  children: React.ReactNode;
  className?: string;
};

export function GameSettingsDropdown({ children, className = "" }: GameSettingsSurfaceProps) {
  return (
    <div
      className={`absolute right-0 mt-2 w-72 rounded-2xl border border-black/8 bg-white p-4 shadow-[0_18px_48px_rgba(15,23,42,0.16)] z-[70] text-sm ${className}`}
    >
      {children}
    </div>
  );
}

export function GameSettingsModal({ children, className = "" }: GameSettingsSurfaceProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div
        className={`w-full max-w-2xl rounded-3xl border border-black/8 bg-white p-6 shadow-[0_24px_80px_rgba(15,23,42,0.18)] ${className}`}
      >
        {children}
      </div>
    </div>
  );
}
