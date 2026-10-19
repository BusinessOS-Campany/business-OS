import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * Report exports are rendered by driving a real Chrome through puppeteer-core,
 * so the app has to find one. The search it shipped listed only `/usr/bin/...`,
 * which is empty on the platform this app is deployed on — every export
 * answered "No local Chromium found". The list is now per-platform, and these
 * assertions keep the Windows half from being dropped again.
 */
const APP = join(__dirname, "..", "..", "demo-systems", "clinicos");
const src = readFileSync(join(APP, "src", "lib", "reports", "report-pdf.ts"), "utf8");

describe("the report PDF's browser discovery", () => {
  it("knows where Windows installs Chrome and Edge", () => {
    expect(src).toContain("chrome.exe");
    expect(src).toContain("msedge.exe");
    expect(src).toContain("PROGRAMFILES");
    expect(src).toContain("LOCALAPPDATA");
  });

  it("still keeps the Linux candidates", () => {
    expect(src).toContain("/usr/bin/google-chrome");
    expect(src).toContain("/usr/bin/chromium");
  });

  it("probes both names a Playwright cache may use", () => {
    // The cache holds `chrome` on Linux and `chrome.exe` on Windows.
    expect(src).toMatch(/for \(const exe of \["chrome", "chrome\.exe"\]\)/);
  });

  it("lets an explicit CHROME_PATH win over every guess", () => {
    const envCheck = src.indexOf("process.env.CHROME_PATH");
    // The call site, not the definition (which also reads `localChromiumCandidates()`).
    const firstCandidate = src.indexOf("of localChromiumCandidates()");
    expect(envCheck).toBeGreaterThan(-1);
    expect(firstCandidate).toBeGreaterThan(-1);
    expect(envCheck).toBeLessThan(firstCandidate);
  });
});
