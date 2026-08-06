// ⚠️ All buttons in the app MUST use this component.
// Do not create custom button styles elsewhere.

"use client";

import React from "react";

type Variant = "primary" | "secondary" | "ghost";

export type ButtonProps = Omit<
  React.ButtonHTMLAttributes<HTMLButtonElement>,
  "className"
> & {
  variant?: Variant;
  className?: string;
};

/**
 * Reusable Button component for the design system.
 * - Idle matches page background (rounded border + subtle shadow)
 * - Hover: card-surface background + stronger shadow
 * - Active: calm press (scale + tiny translate)
 *
 * Note: No legacy/global class aliases are emitted here so globals.css can't override the utility classes.
 */
const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = "primary", className = "", children, type = "button", ...rest }, ref) => {
    // Base classes: neutral idle (page bg), rounded-full, subtle border & shadow, hover->card bg + bigger shadow
    const baseClass =
      "px-4 py-2 rounded-full text-sm transition active:scale-95 active:translate-y-[1px] bg-[var(--color-bg-main)] border border-[rgba(15,23,42,0.04)] shadow-sm hover:shadow-md hover:bg-[var(--color-bg-card)]";

    // Variant tweaks:
    // - primary & secondary: keep neutral text color (page style)
    // - ghost: transparent idle background (but still gets hover bg and shadow)
    const variantClass =
      variant === "ghost"
        ? "bg-transparent border-transparent text-[var(--color-text-main)]"
        : "text-[var(--color-text-main)]";

    return (
      <button
        ref={ref}
        type={type}
        className={`btn ${baseClass} ${variantClass} ${className}`}
        {...rest}
      >
        {children}
      </button>
    );
  }
);

Button.displayName = "Button";

export default Button;
