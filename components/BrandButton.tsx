"use client";

import { useBrandMenu } from "@/components/BrandMenuContext";

type BrandButtonProps = {
  className?: string;
  label?: string;
};

export default function BrandButton({ className, label = "Classendo" }: BrandButtonProps) {
  const { toggle } = useBrandMenu();

  return (
    <button
      type="button"
      onClick={toggle}
      className={className}
      aria-label="Open Classendo menu"
    >
      {label}
    </button>
  );
}
