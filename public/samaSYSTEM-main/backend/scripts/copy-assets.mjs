import { cpSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');

const pairs = [
  ['src/views', 'dist/src/views'],
  ['src/public', 'dist/src/public'],
];

for (const [from, to] of pairs) {
  const srcPath = resolve(root, from);
  const dstPath = resolve(root, to);
  if (!existsSync(srcPath)) {
    console.error(`Source not found: ${srcPath}`);
    process.exit(1);
  }
  cpSync(srcPath, dstPath, { recursive: true });
  console.log(`Copied ${from} → ${to}`);
}
