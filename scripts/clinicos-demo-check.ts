/**
 * End-to-end check for the mounted clinic app (demo or an org's own copy).
 *
 * It drives a real browser through the platform, because the defects it guards
 * against are invisible to the server-side suites:
 *
 *  - The app is served from a mount (`/demo/clinicos`, `/{org}/clinicos`) and
 *    Next prefixes that mount to every middleware matcher. A lone catch-all
 *    matcher therefore never matched the mount root, which 404'd instead of
 *    being redirected to the locale's login — and that root is the PWA's
 *    `start_url`.
 *  - Next rewrites `next/link` and `redirect()`, but nothing normalizes a URL
 *    the app builds by hand, so a `fetch("/api/…")` leaves the mount and hits
 *    the platform (404). The report export was one of those.
 *  - Metadata is not prefixed either, so a bare `manifest: "/manifest.webmanifest"`
 *    asks the platform for the manifest and the app is not installable.
 *  - The app shipped pinned to TypeScript 7, whose checker accepted real type
 *    errors (and which typescript-eslint cannot even run), so a profile query
 *    could name relations the schema does not define and still build. The
 *    merge-requests query did exactly that; the merges tab below runs it.
 *
 * Usage: npx tsx scripts/clinicos-demo-check.ts [baseUrl] [username] [password]
 *   baseUrl defaults to http://127.0.0.1:3100 (the platform), and the demo
 *   instance's own port 3110 works too. Set PROBE_BROWSER to pick a browser.
 */
import puppeteer from "puppeteer-core";

const BASE = (process.argv[2] ?? "http://127.0.0.1:3100").replace(/\/+$/, "");
const USERNAME = process.argv[3] ?? "demo";
const PASSWORD = process.argv[4] ?? "demo123";

/** Where this app is mounted. Keep in sync with the platform registry. */
const MOUNT = "/demo/clinicos";

const CHROME =
  process.env.PROBE_BROWSER ?? "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";

interface ManifestBody {
  name?: string;
  short_name?: string;
  start_url?: string;
  scope?: string;
  display?: string;
  dir?: string;
  lang?: string;
  icons?: Array<{ src: string; sizes?: string; type?: string; purpose?: string }>;
}

const results: Array<{ name: string; ok: boolean }> = [];
const rec = (name: string, ok: unknown, detail = ""): void => {
  results.push({ name, ok: Boolean(ok) });
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? `  — ${detail}` : ""}`);
};
const note = (message: string): void => console.log(`      · ${message}`);

async function main(): Promise<void> {
  const browser = await puppeteer.launch({
    executablePath: CHROME,
    headless: true,
    args: ["--no-sandbox", "--disable-dev-shm-usage", "--lang=ar", "--window-size=1440,900"],
  });

  try {
    const page = await browser.newPage();
    page.setDefaultTimeout(60000);
    await page.setViewport({ width: 1440, height: 900 });

    const netErrors: string[] = [];
    const badResponses: string[] = [];
    const consoleErrors: string[] = [];
    page.on("requestfailed", (r) => netErrors.push(`${r.method()} ${r.url()} ${r.failure()?.errorText}`));
    page.on("response", (r) => {
      if (r.status() >= 400) badResponses.push(`${r.status()} ${r.request().method()} ${r.url()}`);
    });
    page.on("pageerror", (e: unknown) =>
      consoleErrors.push(`pageerror: ${e instanceof Error ? e.message : String(e)}`),
    );
    page.on("console", (m) => {
      if (m.type() === "error") consoleErrors.push(`console: ${m.text()}`);
    });

    console.log(`\n— mount root (${BASE}${MOUNT}) —`);
    const root = await page.goto(`${BASE}${MOUNT}`, { waitUntil: "networkidle2" });
    rec("mount root stays inside the mount", page.url().startsWith(`${BASE}${MOUNT}`), page.url());
    rec("mount root redirects to the login page", page.url() === `${BASE}${MOUNT}/login`, page.url());
    rec("login page answered 200", root?.status() === 200, String(root?.status()));

    console.log("\n— PWA —");
    const manifest = await page.evaluate(async () => {
      const r = await fetch(`/demo/clinicos/manifest.webmanifest`);
      return { status: r.status, body: r.ok ? ((await r.json()) as unknown) : null };
    });
    rec("manifest served at the mount", manifest.status === 200, String(manifest.status));
    const body = manifest.body as ManifestBody | null;
    const scoped = String(body?.scope ?? "").replace(/\/+$/, "") === MOUNT;
    rec(
      "manifest is scoped to the mount",
      body?.start_url === MOUNT && scoped,
      `name=${body?.name} start_url=${body?.start_url} scope=${body?.scope} display=${body?.display}`,
    );
    const iconSrcs = (body?.icons ?? []).map((i) => i.src);
    const icons = await page.evaluate(async (srcs: string[]) => {
      const out: Array<{ src: string; status: number }> = [];
      for (const src of srcs) out.push({ src, status: (await fetch(src)).status });
      return out;
    }, iconSrcs);
    rec(
      "every manifest icon loads",
      icons.length > 0 && icons.every((i) => i.status === 200),
      icons.map((i) => `${i.src} -> ${i.status}`).join(" | "),
    );
    const sw = await page.evaluate(async () => {
      const r = await fetch(`/demo/clinicos/sw.js`);
      const text = r.ok ? await r.text() : "";
      let registration = "unsupported";
      if ("serviceWorker" in navigator) {
        registration = await navigator.serviceWorker
          .register("/demo/clinicos/sw.js", { scope: "/demo/clinicos/" })
          .then((reg) => `registered scope=${reg.scope}`)
          .catch((e: unknown) => `error: ${e instanceof Error ? e.message : String(e)}`);
      }
      return { status: r.status, bytes: text.length, registration };
    });
    rec("service worker served at the mount", sw.status === 200 && sw.bytes > 1000, `${sw.status}, ${sw.bytes} bytes`);
    rec("service worker registers under the mount scope", sw.registration.startsWith("registered"), sw.registration);

    console.log("\n— sign in —");
    await page.waitForSelector("#username");
    await page.type("#username", USERNAME);
    await page.type("#password", PASSWORD);
    const authResponse = page.waitForResponse(
      (r) => r.url().includes("/api/auth/") && r.request().method() === "POST",
      { timeout: 45000 },
    );
    await page.click('button[type="submit"]');
    const auth = await authResponse;
    rec("sign-in posts to the mounted auth endpoint", auth.url().includes(`${MOUNT}/api/auth/`), `${auth.status()} ${auth.url()}`);
    rec("sign-in returned 200", auth.status() === 200, String(auth.status()));
    const deadline = Date.now() + 45000;
    while (Date.now() < deadline && page.url().endsWith("/login")) {
      await new Promise((r) => setTimeout(r, 400));
    }
    rec("sign-in lands inside the app", !page.url().endsWith("/login"), page.url());

    console.log("\n— populated pages —");
    const dashboard = await page.evaluate(() => document.body.innerText);
    rec("dashboard rendered content", dashboard.length > 300, `${dashboard.length} chars`);
    note(dashboard.replace(/\s+/g, " ").slice(0, 200));

    const patients = await page.goto(`${BASE}${MOUNT}/patients`, { waitUntil: "networkidle2" });
    rec("patients page answered 200", patients?.status() === 200, String(patients?.status()));
    const patientsText = await page.evaluate(() => document.body.innerText);
    // The demo fixtures' patients — proving the page rendered data, not a shell.
    const seeded = ["أحمد الشمري", "فاطمة الحدادي", "محمد اليزيدي", "نور الحكيمي"];
    const found = seeded.filter((n) => patientsText.includes(n));
    rec("patients page lists the seeded patients", found.length === seeded.length, `${found.length}/${seeded.length} found`);

    // A patient profile runs the profile queries against the real schema. The
    // merge-requests query used to include relations the schema does not define
    // (`requestedBy` / `approvedBy`), which Prisma rejects at runtime — the tab
    // 500'd, and only the type checker could see it.
    const profileHref = await page.evaluate(() => {
      const hrefs = Array.from(document.querySelectorAll<HTMLAnchorElement>('a[href*="/patients/"]')).map(
        (a) => a.getAttribute("href") ?? "",
      );
      return hrefs.find((h) => /\/patients\/[^/?#]+$/.test(h) && !/\/patients\/(new|merges)$/.test(h)) ?? "";
    });
    rec("patients page links to a patient profile", Boolean(profileHref), profileHref || "(no link found)");
    if (profileHref) {
      const profile = await page.goto(`${BASE}${profileHref}`, { waitUntil: "networkidle2" });
      rec("patient profile answered 200", profile?.status() === 200, String(profile?.status()));
      const merges = await page.goto(`${BASE}${profileHref}?tab=merges`, { waitUntil: "networkidle2" });
      rec("patient profile · merges tab answered 200", merges?.status() === 200, String(merges?.status()));
      note(`merges tab rendered ${(await page.evaluate(() => document.body.innerText)).length} chars`);
    }

    const appointments = await page.goto(`${BASE}${MOUNT}/appointments`, { waitUntil: "networkidle2" });
    rec("appointments page answered 200", appointments?.status() === 200, String(appointments?.status()));

    console.log("\n— mount-aware API calls —");
    const consoleBeforeProbe = consoleErrors.length;
    const api = await page.evaluate(async () => {
      const search = await fetch(`/demo/clinicos/api/patients/search?q=${encodeURIComponent("أحمد")}`);
      const searchBody = search.ok ? ((await search.json()) as unknown) : null;
      const notifications = await fetch("/demo/clinicos/api/notifications?limit=5", { credentials: "include" });
      // What the app used to do: a bare path leaves the mount entirely. The
      // marker keeps the deliberate 404 out of the diagnostics below.
      const outsideMount = await fetch(`/api/patients/search?q=x&probe=outside-mount`);
      return { search: search.status, searchBody, notifications: notifications.status, outsideMount: outsideMount.status };
    });
    rec("mounted patient search answers 200", api.search === 200, `status=${api.search}`);
    const rows = Array.isArray(api.searchBody)
      ? api.searchBody.length
      : Number((api.searchBody as { items?: unknown[] } | null)?.items?.length ?? -1);
    rec("patient search returns rows", rows > 0, `${rows} row(s)`);
    rec("mounted notifications endpoint answers 200", api.notifications === 200, `status=${api.notifications}`);
    note(`bare /api/patients/search (outside the mount) -> ${api.outsideMount} — this is what the app used to call`);

    console.log("\n— report PDF export (real button) —");
    const reports = await page.goto(`${BASE}${MOUNT}/reports`, { waitUntil: "networkidle2" });
    rec("reports page answered 200", reports?.status() === 200, String(reports?.status()));
    const pdfResponse = page.waitForResponse(
      (r) => r.url().includes("/api/reports/") && r.url().includes("/pdf"),
      { timeout: 90000 },
    );
    const clicked = await page.evaluate(() => {
      const button = Array.from(document.querySelectorAll<HTMLButtonElement>("button")).find((b) =>
        /PDF/i.test(b.innerText),
      );
      if (!button) return false;
      button.click();
      return true;
    });
    rec("report PDF button is present", clicked);
    if (clicked) {
      const pdf = await pdfResponse;
      rec("report PDF is fetched from the mount", pdf.url().includes(`${MOUNT}/api/reports/`), pdf.url());
      rec("report PDF answered 200", pdf.status() === 200, String(pdf.status()));
      rec("report PDF content-type is a PDF", (pdf.headers()["content-type"] ?? "").includes("pdf"), pdf.headers()["content-type"] ?? "");
      const bytes = await page.evaluate(async () => {
        const r = await fetch(`/demo/clinicos/api/reports/monthly/pdf?locale=ar`);
        if (!r.ok) return { status: r.status, head: "", length: 0 };
        const buffer = new Uint8Array(await r.arrayBuffer());
        return { status: r.status, head: String.fromCharCode(...buffer.subarray(0, 5)), length: buffer.length };
      });
      rec("report PDF body starts with %PDF-", bytes.head === "%PDF-", `${bytes.head || "(empty)"} ${bytes.length} bytes`);
    }

    console.log("\n— locales —");
    const english = await page.goto(`${BASE}${MOUNT}/en/reports`, { waitUntil: "networkidle2" });
    rec("english route serves while signed in", english?.status() === 200, `${english?.status()} ${page.url()}`);

    console.log("\n— diagnostics —");
    const noise = netErrors.filter((e) => !/favicon|_rsc=|ERR_ABORTED/i.test(e));
    rec("no failed requests on the app origin", noise.length === 0, noise.slice(0, 4).join(" | "));
    const unexpected = badResponses.filter((b) => !/probe=outside-mount/.test(b));
    rec("no unexpected 4xx/5xx responses", unexpected.length === 0, unexpected.slice(0, 6).join(" | "));
    rec(
      "no console/page errors before the deliberate probe",
      consoleBeforeProbe === 0,
      consoleErrors.slice(0, Math.max(0, consoleBeforeProbe)).slice(0, 3).join(" | "),
    );
    if (consoleErrors.length > consoleBeforeProbe) {
      note(`${consoleErrors.length - consoleBeforeProbe} console entry(ies) belong to the deliberate outside-mount 404`);
    }
  } finally {
    await browser.close();
  }

  const failed = results.filter((r) => !r.ok);
  console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
  if (failed.length) {
    console.log(`failed: ${failed.map((f) => f.name).join("; ")}`);
    process.exitCode = 1;
  }
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
