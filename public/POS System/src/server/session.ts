import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { generateToken } from "@/server/auth";
import type { AppCurrency } from "@/lib/format";
import { DEFAULT_CURRENCY } from "@/lib/format";
import { SESSION_COOKIE, BRANCH_COOKIE } from "@/lib/constants";

export { SESSION_COOKIE, BRANCH_COOKIE };
const SESSION_DAYS = 30;

const sessionInclude = {
  user: {
    include: {
      company: true,
      roles: {
        include: {
          role: {
            include: {
              permissions: { include: { permission: true } },
            },
          },
        },
      },
    },
  },
} satisfies Prisma.SessionInclude;

export interface SessionUser {
  id: string;
  name: string;
  username: string | null;
  email: string;
  language: string;
  theme: string;
  phone: string;
  avatar: string;
  isSuperAdmin: boolean;
  branchId: string | null;
  terminalId: string | null;
  companyId: string | null;
}

export interface TenantContext {
  user: SessionUser;
  companyId: string;
  companyName: string;
  branchId: string;
  branchName: string;
  branchCode: string;
  terminalId: string | null;
  permissions: Set<string>;
  isSuperAdmin: boolean;
  settings: Record<string, unknown>;
  currency: AppCurrency;
  currencies: AppCurrency[];
  branches: { id: string; name: string; nameAr: string; code: string }[];
}

type SessionWithUser = NonNullable<Awaited<ReturnType<typeof findSession>>>;

async function findSession(token: string) {
  return prisma.session.findUnique({
    where: { token, active: true, expiresAt: { gt: new Date() } },
    include: sessionInclude,
  });
}

export const getSession = cache(async (): Promise<SessionWithUser | null> => {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const session = await findSession(token);
  if (!session) return null;
  return session;
});

export async function createSession(userId: string, ip = "", userAgent = ""): Promise<string> {
  const token = generateToken(32);
  await prisma.session.create({
    data: {
      userId,
      token,
      ip,
      userAgent,
      expiresAt: new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000),
    },
  });
  return token;
}

export async function destroySession(): Promise<void> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (token) {
    await prisma.session.updateMany({ where: { token }, data: { active: false } });
  }
}

export async function requireUser(): Promise<SessionUser> {
  const session = await getSession();
  if (!session) {
    redirect("/login");
  }
  return mapUser(session);
}

function mapUser(session: SessionWithUser): SessionUser {
  return {
    id: session.user.id,
    name: session.user.name,
    username: session.user.username,
    email: session.user.email,
    language: session.user.language,
    theme: session.user.theme,
    phone: session.user.phone,
    avatar: session.user.avatar,
    isSuperAdmin: session.user.isSuperAdmin,
    branchId: session.user.branchId,
    terminalId: session.user.terminalId,
    companyId: session.user.companyId,
  };
}

export async function getTenant(): Promise<TenantContext> {
  const session = await getSession();
  if (!session) redirect("/login");

  const user = mapUser(session);
  const isSuperAdmin = user.isSuperAdmin;

  let company = session.user.company;
  let companyId = user.companyId ?? "";
  let settingsRaw: Record<string, unknown> = {};
  let currency = DEFAULT_CURRENCY;
  let currencies: AppCurrency[] = [DEFAULT_CURRENCY];

  if (company && companyId) {
    const settings = await prisma.setting.findMany({ where: { companyId } });
    for (const s of settings) settingsRaw[s.key] = s.value as Record<string, unknown>;

    const [cs, heads, rates] = await Promise.all([
      prisma.companyCurrency.findMany({
        where: { companyId },
        include: { currency: true },
      }),
      prisma.currency.findMany({ where: { status: "ACTIVE" } }),
      prisma.exchangeRate.findMany({ where: { companyId } }),
    ]);

    currencies =
      cs.length > 0
        ? cs.map((cc) => ({
            id: cc.currency.id,
            code: cc.currency.code,
            name: cc.currency.name,
            nameAr: cc.currency.nameAr,
            symbol: cc.currency.symbol,
            symbolAr: cc.currency.symbolAr,
            precision: cc.currency.precision,
            decimalSeparator: cc.currency.decimalSeparator,
            thousandsSeparator: cc.currency.thousandsSeparator,
            isBase: cc.isDefault,
          }))
        : heads.map((c) => ({
            id: c.id,
            code: c.code,
            name: c.name,
            nameAr: c.nameAr,
            symbol: c.symbol,
            symbolAr: c.symbolAr,
            precision: c.precision,
            decimalSeparator: c.decimalSeparator,
            thousandsSeparator: c.thousandsSeparator,
            isBase: c.isBase,
          }));
    currency = currencies.find((c) => c.isBase) ?? currencies[0] ?? DEFAULT_CURRENCY;
  }

  // Resolve branch (cookie override -> user branch -> default branch)
  const branches = company
    ? (await prisma.branch.findMany({
        where: { companyId, status: "ACTIVE" },
        orderBy: { createdAt: "asc" },
      })).map((b) => ({
        id: b.id, name: b.name, nameAr: b.nameAr, code: b.code,
      }))
    : [];

  const store = await cookies();
  const cookieBranch = store.get(BRANCH_COOKIE)?.value;
  let branchId =
    cookieBranch && branches.find((b) => b.id === cookieBranch)
      ? cookieBranch
      : user.branchId && branches.find((b) => b.id === user.branchId)
        ? user.branchId
        : branches[0]?.id ?? "";
  let branch = branchId ? branches.find((b) => b.id === branchId) : undefined;

  // If user's assigned branch is invalid (e.g. branch manager only sees own), fall back
  if (!branch && user.branchId) {
    const own = branches.find((b) => b.id === user.branchId);
    if (own) {
      branchId = own.id;
      branch = own;
    }
  }

  const permissions = new Set<string>();
  for (const ur of session.user.roles) {
    for (const rp of ur.role.permissions) {
      permissions.add(rp.permission.key);
    }
  }

  return {
    user,
    companyId,
    companyName: company?.name ?? "",
    branchId,
    branchName: branch?.name ?? "",
    branchCode: branch?.code ?? "",
    terminalId: user.terminalId,
    permissions,
    isSuperAdmin,
    settings: settingsRaw,
    currency,
    currencies,
    branches,
  };
}

export function can(ctx: Pick<TenantContext, "isSuperAdmin" | "permissions">, permission: string): boolean {
  return ctx.isSuperAdmin || ctx.permissions.has(permission);
}

export async function getSessionToken(): Promise<string | null> {
  const store = await cookies();
  return store.get(SESSION_COOKIE)?.value ?? null;
}