import { PrismaClient } from "@prisma/client";
const p = new PrismaClient();
// @ts-ignore
p.$queryRawUnsafe("SELECT column_name FROM information_schema.columns WHERE table_name='Product' AND column_name IN ('brand','brandLogo')")
  .then((r: any) => { console.log("Columns:", JSON.stringify(r)); process.exit(0); })
  .catch((e: any) => { console.error(e.message); process.exit(1); });
