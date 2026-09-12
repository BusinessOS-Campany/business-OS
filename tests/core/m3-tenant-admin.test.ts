import "@/core/config/load-env";
import { describe, expect, it } from "vitest";
import { deepMerge, isModuleEnabled, brandingCssVars, type OrgSettings } from "@/core/tenancy/settings";
import { hasPermission, requireModule } from "@/core/db/tenant-guard";
import { ApiError } from "@/core/http/api";

describe("M3 module gate", () => {
  const base: OrgSettings = { locale: "ar" };

  it("treats unset modulesEnabled as all-enabled (back-compat)", () => {
    expect(isModuleEnabled(base, "pos")).toBe(true);
    expect(isModuleEnabled(base, "ai")).toBe(true);
  });

  it("enforces the explicit enabled list", () => {
    const s: OrgSettings = { modulesEnabled: ["sales", "inventory"] };
    expect(isModuleEnabled(s, "sales")).toBe(true);
    expect(isModuleEnabled(s, "pos")).toBe(false);
  });

  it("requireModule throws canonical 404 MODULE_DISABLED", () => {
    const s: OrgSettings = { modulesEnabled: ["inventory"] };
    expect(() => requireModule(s, "pos")).toThrow(ApiError);
    try {
      requireModule(s, "pos");
    } catch (err) {
      const apiErr = err as ApiError;
      expect(apiErr.status).toBe(404);
      expect(apiErr.code).toBe("MODULE_DISABLED");
      expect(apiErr.messageEn).toMatch(/not enabled/i);
    }
    expect(() => requireModule(s, "inventory")).not.toThrow();
  });
});

describe("M3 settings deepMerge", () => {
  it("merges nested objects without mutating inputs", () => {
    const base = { branding: { primary: "#000000", radius: 8 }, locale: "ar" };
    const patch = { branding: { radius: 12 }, locale: "en" };
    const out = deepMerge(base, patch);
    expect(out).toEqual({ branding: { primary: "#000000", radius: 12 }, locale: "en" });
    expect(base.branding.radius).toBe(8); // untouched
  });

  it("replaces arrays wholesale and drops undefined keys", () => {
    const out = deepMerge(
      { modulesEnabled: ["sales", "pos"], branding: { logoUrl: "x" } },
      { modulesEnabled: ["sales"], branding: { logoUrl: undefined } },
    );
    expect(out.modulesEnabled).toEqual(["sales"]);
    expect(out.branding).toEqual({});
  });
});

describe("M3 branding css vars", () => {
  it("emits only provided tokens with correct units", () => {
    expect(brandingCssVars(undefined)).toEqual({});
    expect(brandingCssVars({ primary: "#10b981" })).toEqual({ "--brand-primary": "#10b981" });
    expect(brandingCssVars({ radius: 12 })).toEqual({ "--brand-radius": "12px" });
  });
});

describe("M3 admin permission boundaries", () => {
  it("only owner+admin manage roles; manager reads users but cannot invite", () => {
    expect(hasPermission("owner", { roles: ["manage"] })).toBe(true);
    expect(hasPermission("admin", { roles: ["manage"] })).toBe(false);
    expect(hasPermission("manager", { users: ["read"] })).toBe(true);
    expect(hasPermission("manager", { users: ["invite"] })).toBe(false);
    expect(hasPermission("cashier", { settings: ["manage"] })).toBe(false);
  });

  it("unknown roles are denied everything (defense in depth)", () => {
    expect(hasPermission("superadmin", { users: ["read"] })).toBe(false);
  });
});
