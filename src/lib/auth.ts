import { NextAuthOptions } from "next-auth";
import { prisma } from "@/lib/prisma";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import bcrypt from "bcryptjs";
import { loginSchema } from "@/lib/validations";

// Cast prisma to any for model access to satisfy TypeScript when model typings are not present
const prismaAny = prisma as any;

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
        }
      }
    }),
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        try {
          // Validate credentials
          const { email, password } = loginSchema.parse(credentials);

          // Find user by email
          const user = await prismaAny.user.findUnique({
            where: { email },
          });

          if (!user) {
            throw new Error("Invalid credentials");
          }

          // Check domain restriction for students
          if (user.role === "STUDENT" && !isAllowedDomain(email)) {
            throw new Error("Access restricted to institutional emails");
          }

          // OAuth users don't have passwords
          if (!user.password) {
            throw new Error("Please sign in with Google");
          }

          // Verify password
          const isPasswordValid = await bcrypt.compare(password, user.password);
          if (!isPasswordValid) {
            throw new Error("Invalid credentials");
          }

          return {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
          };
        } catch (error) {
          console.error("Authorization error:", error);
          return null;
        }
      },
    }),
  ],
  callbacks: {
    async signIn({ user, account, profile }) {
      // For Google OAuth sign-ins
      if (account?.provider === "google" && user.email) {
        try {
          // Check domain restriction
          if (!isAllowedDomain(user.email)) {
            return false;
          }

          // Check if user exists, create if not
          let dbUser = await prismaAny.user.findUnique({
            where: { email: user.email },
          });

          if (!dbUser) {
            dbUser = await prismaAny.user.create({
              data: {
                email: user.email,
                name: user.name || "",
                role: "STUDENT",
              },
            });
          }

          return true;
        } catch (error) {
          console.error("Sign-in error:", error);
          return false;
        }
      }

      return true; // Allow credentials sign-in
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id;
        session.user.role = token.role;
      }
      return session;
    },
    async jwt({ token, user, account }) {
      // Initial sign in
      if (user) {
        token.id = user.id;
        token.role = user.role;
      } else if (token.email) {
        // Refresh token data from database
        const dbUser = await prismaAny.user.findUnique({
          where: { email: token.email as string },
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
