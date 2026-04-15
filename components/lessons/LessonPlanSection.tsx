"use client";

type LessonPlanSectionProps = {
  label: string;
  value: string;
  placeholder: string;
  rows?: number;
  onChange: (value: string) => void;
};

export default function LessonPlanSection({
  label,
  value,
  placeholder,
  rows = 4,
  onChange,
}: LessonPlanSectionProps) {
  return (
    <div className="bg-white rounded-2xl border shadow-sm p-4">
      <label className="block text-sm font-semibold text-[var(--color-text-main)] mb-2">
        {label}
      </label>
      <textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        rows={rows}
        className="w-full rounded-xl border border-black/10 bg-[var(--color-bg-main)] px-4 py-3 text-sm resize-y focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
      />
    </div>
  );
}
