import "@/core/config/load-env";
import { describe, expect, it } from "vitest";
import { readFileSync, existsSync, statSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();

describe("M10 — PWA manifest", () => {
  it("manifest.json exists and has required fields", () => {
    const manifestPath = join(root, "public", "manifest.json");
    expect(existsSync(manifestPath)).toBe(true);

    const manifest = JSON.parse(readFileSync(manifestPath, "utf-8"));
    expect(manifest.name).toBeTruthy();
    expect(manifest.short_name).toBeTruthy();
    expect(manifest.start_url).toBe("/");
    expect(manifest.display).toBe("standalone");
    expect(manifest.icons).toBeInstanceOf(Array);
    expect(manifest.icons.length).toBeGreaterThanOrEqual(1);
    expect(manifest.icons[0].sizes).toBeTruthy();
  });

  it("icons exist at declared sizes", () => {
    const manifest = JSON.parse(readFileSync(join(root, "public", "manifest.json"), "utf-8"));
    for (const icon of manifest.icons) {
      const iconPath = join(root, "public", icon.src);
      expect(existsSync(iconPath)).toBe(true);
      const stat = statSync(iconPath);
      expect(stat.size).toBeGreaterThan(0);
    }
  });
});

describe("M10 — Service worker source", () => {
  it("sw.ts exists with precacheAndRoute", () => {
    const swPath = join(root, "src", "app", "sw.ts");
    expect(existsSync(swPath)).toBe(true);
    const content = readFileSync(swPath, "utf-8");
    expect(content).toContain("installSerwist");
    expect(content).toContain("__SW_MANIFEST");
  });

  it("next.config.ts configures serwist", () => {
    const configPath = join(root, "next.config.ts");
    const content = readFileSync(configPath, "utf-8");
    expect(content).toContain("serwist");
    expect(content).toContain("swSrc");
    expect(content).toContain("swDest");
  });
});

describe("M10 — Mobile bottom-nav", () => {
  it("bottom-nav.tsx exists with 5 nav items and 44px min targets", () => {
    const navPath = join(root, "src", "components", "bottom-nav.tsx");
    expect(existsSync(navPath)).toBe(true);
    const content = readFileSync(navPath, "utf-8");
    // Should have 5 nav items
    expect(content).toContain("Home");
    expect(content).toContain("Sales");
    expect(content).toContain("Inventory");
    expect(content).toContain("Customers");
    expect(content).toContain("More");
    // Touch targets ≥ 44px
    expect(content).toContain("min-w-[44px]");
    expect(content).toContain("min-h-[44px]");
    // Hidden on desktop (md:hidden)
    expect(content).toContain("md:hidden");
  });
});

describe("M10 — SW update toast", () => {
  it("sw-update-toast.tsx exists with skip waiting message", () => {
    const toastPath = join(root, "src", "components", "sw-update-toast.tsx");
    expect(existsSync(toastPath)).toBe(true);
    const content = readFileSync(toastPath, "utf-8");
    expect(content).toContain("SKIP_WAITING");
    expect(content).toContain("updatefound");
    expect(content).toContain("controllerchange");
  });
});

describe("M10 — Root layout PWA meta", () => {
  it("root layout has manifest and viewport metadata", () => {
    const layoutPath = join(root, "src", "app", "layout.tsx");
    const content = readFileSync(layoutPath, "utf-8");
    expect(content).toContain("manifest");
    expect(content).toContain("themeColor");
    expect(content).toContain("/manifest.json");
    expect(content).toContain("appleWebApp");
  });
});

describe("M10 — App layout responsive nav", () => {
  it("app layout sidebar is hidden on mobile, bottom nav added", () => {
    const layoutPath = join(root, "src", "app", "app", "layout.tsx");
    const content = readFileSync(layoutPath, "utf-8");
    // Sidebar hidden on mobile
    expect(content).toContain("hidden");
    expect(content).toContain("md:block");
    // Bottom nav included
    expect(content).toContain("BottomNav");
    expect(content).toContain("SwUpdateToast");
    // Extra bottom padding for mobile nav
    expect(content).toContain("pb-20");
    expect(content).toContain("md:pb-6");
  });
});
