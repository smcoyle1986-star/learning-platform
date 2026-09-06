import Link from "next/link";

type BrandButtonProps = {
  className?: string;
  label?: string;
};

export default function BrandButton({ className, label = "Classendo" }: BrandButtonProps) {
  return (
    <Link
      href="/"
      className={className}
      aria-label="Classendo home"
    >
      {label}
    </Link>
  );
}
