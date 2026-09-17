import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Generated files:
    "public/sw.js",
    // Sub-apps live in public/ with their own toolchains (matches tsconfig exclude):
    "public/grocery/**",
    "public/muafa-store-main/**",
    "public/samaSYSTEM-main/**",
    "public/GMstore/**",
    "public/celia-main/**",
    "public/Hospital--main/**",
    "public/dental-Clinic--main/**",
    "public/pharmacy/**",
  ]),
]);

export default eslintConfig;
