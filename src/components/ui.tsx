import type { ButtonHTMLAttributes, ReactNode } from "react";

export function cn(...parts: (string | false | null | undefined)[]): string {
  return parts.filter(Boolean).join(" ");
}

/* --------------------------------- Button -------------------------------- */

type Variant = "primary" | "secondary" | "ghost" | "danger" | "gold";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  fullWidth?: boolean;
}

const VARIANTS: Record<Variant, string> = {
  primary:
    "bg-navy-800 text-white hover:bg-navy-700 active:bg-navy-900 shadow-sm shadow-navy-800/20 dark:bg-white dark:text-[#0B1F4B] dark:hover:bg-[#DCE5F2] dark:active:bg-white dark:shadow-none",
  secondary:
    "bg-white text-navy-800 border border-navy-200 hover:bg-navy-50 dark:bg-[#0F172A] dark:text-[#E2E8F0] dark:border-[#1E293B] dark:hover:bg-[#1E293B]",
  ghost: "bg-transparent text-navy-700 hover:bg-navy-50 dark:text-[#CBD5E1] dark:hover:bg-[#1E293B]",
  danger: "bg-red-600 text-white hover:bg-red-500 dark:bg-red-500 dark:hover:bg-red-400",
  gold: "bg-gradient-to-r from-amber-400 to-amber-500 text-navy-900 hover:from-amber-300 shadow-sm shadow-amber-500/30",
};

export function Button({
  variant = "primary",
  fullWidth,
  className,
  children,
  ...rest
}: ButtonProps) {
  return (
    <button
      {...rest}
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-2xl px-4 py-3 text-sm font-semibold transition-all active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50",
        VARIANTS[variant],
        fullWidth && "w-full",
        className
      )}
    >
      {children}
    </button>
  );
}

/* ---------------------------------- Chip --------------------------------- */

export function Chip({
  active,
  children,
  onClick,
  className,
  disabled,
}: {
  active?: boolean;
  children: ReactNode;
  onClick?: () => void;
  className?: string;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "shrink-0 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-45",
        active
          ? "border-navy-800 bg-navy-800 text-white dark:border-white dark:bg-white dark:text-[#0B1F4B]"
          : "border-navy-200 bg-white text-navy-600 hover:border-navy-300 dark:border-[#1E293B] dark:bg-[#0F172A] dark:text-[#94A3B8] dark:hover:border-[#334155]",
        className
      )}
    >
      {children}
    </button>
  );
}

/* -------------------------------- ProBadge ------------------------------- */

export function ProBadge({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full bg-gradient-to-r from-amber-400 to-amber-500 px-2 py-0.5 text-[10px] font-bold tracking-wide text-navy-900",
        className
      )}
    >
      PRO
    </span>
  );
}

/* ---------------------------------- Card --------------------------------- */

export function Card({
  children,
  className,
  onClick,
}: {
  children: ReactNode;
  className?: string;
  onClick?: () => void;
}) {
  return (
    <div
      onClick={onClick}
      className={cn(
        "rounded-3xl border border-navy-100 bg-white p-4 shadow-sm shadow-navy-900/5 dark:border-[#1E293B] dark:bg-[#0F172A] dark:shadow-none",
        onClick && "cursor-pointer transition-all hover:shadow-md hover:-translate-y-0.5",
        className
      )}
    >
      {children}
    </div>
  );
}

/* ------------------------------ SectionTitle ----------------------------- */

export function SectionTitle({
  children,
  action,
}: {
  children: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="mb-3 flex items-center justify-between">
      <h2 className="text-sm font-bold uppercase tracking-wider text-navy-500 dark:text-[#94A3B8]">{children}</h2>
      {action}
    </div>
  );
}

/* ------------------------------- EmptyState ------------------------------ */

export function EmptyState({
  title,
  body,
  action,
  icon = "👕",
}: {
  title: string;
  body?: string;
  action?: ReactNode;
  icon?: string;
}) {
  return (
    <div className="flex flex-col items-center rounded-2xl border border-dashed border-navy-200 bg-white px-6 py-10 text-center dark:border-[#1E293B] dark:bg-[#0F172A]">
      <div className="mb-3 text-4xl">{icon}</div>
      <p className="font-semibold text-navy-800 dark:text-white">{title}</p>
      {body && <p className="mt-1 max-w-xs text-sm text-navy-500 dark:text-[#94A3B8]">{body}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

/* -------------------------------- Spinner -------------------------------- */

export function Spinner({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent",
        className
      )}
    />
  );
}

/* -------------------------------- LockedPanel ---------------------------- */

export function ProLock({ onUpgrade, note }: { onUpgrade: () => void; note: string }) {
  return (
    <div className="rounded-2xl border border-amber-200 bg-amber-50/60 p-5 text-center dark:border-amber-900/50 dark:bg-amber-950/30">
      <ProBadge />
      <p className="mt-3 text-sm font-medium text-navy-800 dark:text-amber-100">{note}</p>
      <Button variant="gold" className="mt-3" onClick={onUpgrade}>
        Upgrade to Pro
      </Button>
    </div>
  );
}
