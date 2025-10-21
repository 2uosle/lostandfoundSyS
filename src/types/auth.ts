export interface UserWithoutPassword {
  id: string;
  email: string;
  name: string | null;
  role: "ADMIN" | "STUDENT";
}

export interface AuthenticatedUser {
  id: string;
  email: string;
  name: string | null;
  role: "ADMIN" | "STUDENT";
}