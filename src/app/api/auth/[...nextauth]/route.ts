// NextAuth route handler - imports configuration from @/lib/auth
import NextAuth from "next-auth/next";
import { authOptions as authConfig } from "@/lib/auth";

const handler = NextAuth(authConfig);
export { handler as GET, handler as POST };
