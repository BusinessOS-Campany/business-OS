import { config } from "dotenv";
import { resolve } from "node:path";
import { exec } from "node:child_process";
import { promisify } from "node:util";
import { Pool } from "pg";
import * as readline from "node:readline";
import dns from "node:dns";

// Force IPv4-first DNS resolution (Supabase hostname may only have AAAA records)
dns.setDefaultResultOrder("ipv4first");

const root = resolve(__dirname, "..");
config({ path: resolve(root, ".env.local") });
config({ path: resolve(root, ".env") });

const execAsync = promisify(exec);

const dbUrl = process.env.DATABASE_URL;
if (!dbUrl) {
  console.error("\n  No DATABASE_URL found. Set it in .env or .env.local");
  process.exit(1);
}

const pool = new Pool({
  connectionString: dbUrl,
  max: 5,
  connectionTimeoutMillis: 15000,
  ssl: /supabase\.(co|com)/i.test(dbUrl) ? { rejectUnauthorized: false } : undefined,
  // Force IPv4 — some networks block IPv6
  ...(dbUrl.includes("supabase") ? { family: 4 } : {}),
});

console.log(`  Database: ${dbUrl.replace(/:[^@]+@/, ":****@")}`);

function ask(question: string): Promise<string> {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => {
    rl.question(question, (answer: string) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

function parseNetView(stdout: string): string[] {
  const shares: string[] = [];
  for (const line of stdout.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    if (
      trimmed.startsWith("Share name") ||
      /^-+$/.test(trimmed) ||
      trimmed.startsWith("Shared resources") ||
      trimmed.startsWith("The command") ||
      trimmed.startsWith("Server")
    ) {
      continue;
    }
    const parts = trimmed.split(/\s{2,}/);
    const name = (parts[0] || "").trim();
    const type = (parts[1] || "").trim();
    if (name && type.toLowerCase().startsWith("disk")) {
      shares.push(name);
    }
  }
  return [...new Set(shares)];
}

async function authenticate(host: string, username: string, password: string): Promise<void> {
  console.log(`\n  Authenticating to \\\\${host} as ${username} ...`);
  try {
    await execAsync(
      `net use "\\\\${host}\\IPC$" "${password}" /user:${username}`,
      { timeout: 15000, windowsHide: true },
    );
    console.log("  Authenticated.");
  } catch {
    throw new Error(`Authentication failed for \\\\${host} with user ${username}`);
  }
}

async function discoverShares(host: string): Promise<string[]> {
  console.log(`\n  Discovering shares on \\\\${host} ...`);
  try {
    const { stdout } = await execAsync(
      `net view "\\\\${host}"`,
      { timeout: 20000, maxBuffer: 4 * 1024 * 1024, windowsHide: true },
    );
    return parseNetView(stdout);
  } catch (error: unknown) {
    const err = error as { stdout?: string };
    if (err.stdout) {
      return parseNetView(err.stdout);
    }
    throw error;
  }
}

async function saveShares(host: string, shares: string[]): Promise<number> {
  const client = await pool.connect();
  let saved = 0;
  try {
    const existing = await client.query(
      "SELECT share FROM nas_shares WHERE host = $1",
      [host],
    );
    const existingSet = new Set(
      (existing.rows as { share: string }[]).map((r) => r.share.toLowerCase()),
    );

    for (const share of shares) {
      if (existingSet.has(share.toLowerCase())) {
        await client.query(
          "UPDATE nas_shares SET is_active = true, updated_at = NOW() WHERE host = $1 AND LOWER(share) = LOWER($2)",
          [host, share],
        );
        console.log(`  [reactivated] \\\\${host}\\${share}`);
      } else {
        await client.query(
          "INSERT INTO nas_shares (name, host, protocol, share, is_active, created_at, updated_at) VALUES ($1, $2, 'SMB', $3, true, NOW(), NOW())",
          [share, host, share],
        );
        console.log(`  [added]       \\\\${host}\\${share}`);
        saved++;
      }
    }
  } finally {
    client.release();
  }
  return saved;
}

async function main() {
  console.log("==========================================");
  console.log("   Celia - NAS Server Discovery Tool");
  console.log("==========================================\n");

  let host = process.argv[2]?.trim() ?? null;
  if (!host) {
    host = await ask("  Enter NAS server IP (e.g. 192.168.1.104): ");
  }

  if (!host) {
    console.error("\n  No host provided. Exiting.");
    process.exit(1);
  }

  host = host.replace(/\\+/g, "").replace(/^\/+|\/+$/g, "").trim();
  console.log(`  Target: \\\\${host}`);

  const username = process.argv[3]?.trim();
  const password = process.argv[4]?.trim();
  
  if (username && password) {
    await authenticate(host, username, password);
  } else {
    const needAuth = await ask("  Does this server require authentication? (y/N): ");
    if (needAuth.toLowerCase() === "y") {
      const u = await ask("  Username: ");
      const p = await ask("  Password: ");
      if (!u) {
        console.error("\n  No username provided. Exiting.");
        process.exit(1);
      }
      await authenticate(host, u, p);
    }
  }

  const shares = await discoverShares(host);
  if (shares.length === 0) {
    console.log("\n  No disk shares found on this server.");
    process.exit(1);
  }

  console.log(`\n  Found ${shares.length} share(s): ${shares.join(", ")}`);

  const saved = await saveShares(host, shares);
  console.log(`\n  Done! ${saved} new share(s) saved to database.`);
  console.log("  Go to https://celia-internet.vercel.app/transfers/settings to see them.\n");

  await pool.end();
}

main().catch((error) => {
  console.error("\n  Error:", error instanceof Error ? error.message : error);
  process.exit(1);
});
