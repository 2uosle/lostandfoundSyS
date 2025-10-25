import { NextAuthOptions } from "next-auth";
import { prisma } from "@/lib/prisma";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import bcrypt from "bcryptjs";
import NextAuth from "next-auth/next";
import { loginSchema } from "@/lib/validations";

// Extend the built-in session types
declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      name?: string | null;
      email?: string | null;
      role: "ADMIN" | "STUDENT";
    }
  }
  interface User {
    id: string;
    name?: string | null;
    email?: string | null;
    role: "ADMIN" | "STUDENT";
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    role: "ADMIN" | "STUDENT";
  }
}

// Allowed email domains for institutional login
const ALLOWED_DOMAINS = ['neu.edu.ph']; // Add more domains as needed

function isAllowedDomain(email: string): boolean {
  const domain = email.split('@')[1]?.toLowerCase();
  return ALLOWED_DOMAINS.includes(domain);
}

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
      authorization: {
        params: {
          prompt: "select_account",
          hd: "neu.edu.ph", // Hosted domain - restricts to this domain
        },
      },
    }),
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error('Missing credentials');
        }

        // Validate credentials format
        const validatedCreds = loginSchema.safeParse({
          email: credentials.email,
          password: credentials.password,
        });

        if (!validatedCreds.success) {
          throw new Error('Invalid credentials format');
        }

        const user = await prisma.user.findUnique({
          where: {
            email: validatedCreds.data.email
          }
        });

        // Use constant-time comparison to prevent timing attacks
        // Always run bcrypt.compare even if user doesn't exist
        const passwordMatch = user && user.password
          ? await bcrypt.compare(validatedCreds.data.password, user.password)
          : await bcrypt.compare(
              validatedCreds.data.password,
              '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5gu0jhodg.WC2' // Dummy hash for timing equality
            );

        if (!user || !user.password || !passwordMatch) {
          throw new Error('Invalid credentials');
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role as "ADMIN" | "STUDENT"
        };
      }
    })
  ],
  session: {
    strategy: "jwt"
  },
  pages: {
    signIn: "/login",
    error: "/login", // Error page
  },
  callbacks: {
    async signIn({ user, account, profile }) {
      // For Google OAuth
      if (account?.provider === "google") {
        const email = user.email || "";
        
        // Check if email domain is allowed
        if (!isAllowedDomain(email)) {
          console.error(`Rejected login from non-institutional email: ${email}`);
          return false; // Reject sign-in
        }

        // Check if user exists in database
        let dbUser = await prisma.user.findUnique({
          where: { email },
        });

        // If user doesn't exist, create them automatically
        if (!dbUser) {
          dbUser = await prisma.user.create({
            data: {
              email,
              name: user.name || email.split('@')[0],
              password: "", // No password for Google OAuth users
              role: "STUDENT", // Default role
            },
          });
        }

        return true; // Allow sign-in
      }

      return true; // Allow other providers
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token.id as string;
        session.user.role = token.role as "ADMIN" | "STUDENT";
      }
      return session;
    },
    async jwt({ token, user, account }) {
      // Initial sign in
      if (user) {
        token.id = user.id;
        token.role = user.role;
      }

      // For Google OAuth, fetch user from database
      if (account?.provider === "google" && token.email) {
        const dbUser = await prisma.user.findUnique({
          where: { email: token.email },
        });

        if (dbUser) {
          token.id = dbUser.id;
          token.role = dbUser.role as "ADMIN" | "STUDENT";
        }
      }

      return token;
    }
  }
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };
