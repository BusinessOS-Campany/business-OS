import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

export function isGoogleEnabled() {
  return !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
}

const providers: any[] = [
  ...(isGoogleEnabled() ? [Google({ clientId: process.env.GOOGLE_CLIENT_ID!, clientSecret: process.env.GOOGLE_CLIENT_SECRET! })] : []),
  Credentials({
    name: "credentials",
    credentials: {
      email: { label: "Email", type: "email" },
      password: { label: "Password", type: "password" },
    },
    async authorize(credentials) {
      if (!credentials?.email || !credentials?.password) return null;
      const user = await prisma.user.findUnique({
        where: { email: credentials.email as string },
      });
      if (!user?.password) return null;
      const isValid = await bcrypt.compare(credentials.password as string, user.password);
      if (!isValid) return null;
      return { id: user.id, name: user.name, email: user.email, role: user.role };
    },
  }),
];

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  providers,
  callbacks: {
    authorized({ request, auth }) {
      const { pathname } = request.nextUrl;
      if (pathname === "/admin/login") return true;
      if (pathname.startsWith("/admin")) {
        return auth?.user != null;
      }
      return true;
    },
    jwt({ token, user }) {
      if (user) {
        token.role = (user as any).role || "CUSTOMER";
        token.id = user.id;
      }
      return token;
    },
    session({ session, token }) {
      if (session.user) {
        (session.user as any).role = token.role;
        (session.user as any).id = token.id;
      }
      return session;
    },
  },
});
