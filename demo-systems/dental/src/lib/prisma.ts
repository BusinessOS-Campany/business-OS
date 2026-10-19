import { PrismaClient } from "@/generated/prisma/client"
import { PrismaPg } from "@prisma/adapter-pg"

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient }

function createClient() {
  const url = process.env.DATABASE_URL
  if (!url) throw new Error("DATABASE_URL is not set")
  const schema = process.env.DATABASE_SCHEMA ?? "dental"
  // pg does not understand Prisma's ?schema= convention — strip it and pass explicitly.
  const [base, query] = url.split("?")
  const params = new URLSearchParams(query ?? "")
  params.delete("schema")
  params.delete("options")
  const rest = params.toString()
  const pgUrl = rest ? `${base}?${rest}` : base
  // search_path is set at the connection level so $queryRaw/_executeRaw calls
  // (which bypass the adapter's schema option) resolve to the dental schema.
  const adapter = new PrismaPg(
    { connectionString: pgUrl, options: `-c search_path=${schema}` },
    { schema },
  )
  return new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  })
}

export const prisma = globalForPrisma.prisma ?? createClient()

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma