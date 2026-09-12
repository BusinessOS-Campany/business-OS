import { forwardRef, type InputHTMLAttributes, type ReactNode } from "react";
import { cn } from "@/lib/cn";

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  startIcon?: ReactNode;
  hasError?: boolean;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, startIcon, hasError, type, ...props }, ref) => (
    <div className="relative">
      {startIcon && (
        <span
          className="pointer-events-none absolute inset-y-0 start-3 flex items-center text-muted-foreground"
          aria-hidden="true"
        >
          {startIcon}
        </span>
      )}
      <input
        ref={ref}
        type={type}
        className={cn(
          "flex h-11 w-full rounded-lg border border-input bg-card px-3.5 text-sm text-foreground shadow-sm transition-colors duration-150",
          "placeholder:text-muted-foreground",
          "focus-visible:outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30",
          "disabled:cursor-not-allowed disabled:opacity-60",
          startIcon && "ps-10",
          hasError && "border-destructive focus-visible:border-destructive focus-visible:ring-destructive/30",
          className,
        )}
        {...props}
      />
    </div>
  ),
);
Input.displayName = "Input";
