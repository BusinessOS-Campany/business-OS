"use strict";
// Rewrites the Windows build path baked into the platform's Next runtime
// manifest so `next start` works from the phone's Linux path.
//
// Only `required-server-files.json` (and its `.js` twin) carry a runtime-
// relevant absolute path; every other occurrence in `.next` is an inert
// error-message string and is left untouched.
const fs = require("fs");
const path = require("path");

const app = process.argv[2];
if (!app) {
  console.error("usage: node patch-paths.js <app-dir>");
  process.exit(1);
}

const jsonPath = path.join(app, ".next", "required-server-files.json");
const manifest = JSON.parse(fs.readFileSync(jsonPath, "utf8"));
manifest.appDir = app;
if ("root" in manifest) manifest.root = app;
if ("repoRoot" in manifest) manifest.repoRoot = app;
if ("outputFileTracingRoot" in manifest) manifest.outputFileTracingRoot = app;
// The serialized build config also carries the build-time distDir
// (NEXT_DIST_DIR was used to keep the live .next untouched) and the build
// root paths; both must match the shipped layout on the phone.
if (manifest.config) {
  if ("repoRoot" in manifest.config) manifest.config.repoRoot = app;
  if ("outputFileTracingRoot" in manifest.config) manifest.config.outputFileTracingRoot = app;
  if ("distDir" in manifest.config) manifest.config.distDir = ".next";
  if ("distDirRoot" in manifest.config) manifest.config.distDirRoot = ".next";
}
fs.writeFileSync(jsonPath, JSON.stringify(manifest));
console.log("patched", jsonPath, "->", app);

const jsPath = path.join(app, ".next", "required-server-files.js");
if (fs.existsSync(jsPath)) {
  let source = fs.readFileSync(jsPath, "utf8");
  const escaped = app.replace(/\\/g, "\\\\");
  source = source.replace(/D:\\\\Business OS\\\\ERP\\\\ERP/g, escaped);
  source = source.replace(/D:\\Business OS\\ERP\\ERP/g, escaped);
  fs.writeFileSync(jsPath, source);
  console.log("patched", jsPath);
}