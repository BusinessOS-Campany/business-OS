"use client";

import { Toaster as Sonner, type ToasterProps } from "sonner";
import { useLocale } from "next-intl";

const Toaster = ({ ...props }: ToasterProps) => {
  const locale = useLocale();

  return (
    <Sonner
      theme="system"
      className="toaster group"
      toastOptions={{
        classNames: {
          toast:
            "group toast group-[.toaster]:bg-background group-[.toaster]:text-foreground group-[.toaster]:border-border group-[.toaster]:shadow-lg",
          description: "text-muted-foreground",
          actionButton:
            "group-[.toast]:bg-primary group-[.toast]:text-primary-foreground rounded-md px-3 py-1 text-xs font-medium",
          cancelButton:
            "group-[.toast]:bg-muted group-[.toast]:text-muted-foreground rounded-md px-3 py-1 text-xs font-medium",
        },
      }}
      {...props}
    />
  );
};

export { Toaster };