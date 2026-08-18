import bcrypt from "bcryptjs";
import { z } from "zod";
import { roleValues } from "@/lib/workflows";

export const loginSchema = z.object({
  email: z.string().trim().email().max(254).transform((value) => value.toLowerCase()),
  password: z.string().min(1).max(256),
  csrfToken: z.string().min(24),
  returnTo: z.string().default("/"),
});

const staffUserSchema = z.object({
  id: z.string().min(1),
  email: z.string().email().transform((value) => value.toLowerCase()),
  name: z.string().min(1),
  role: z.enum(roleValues),
  passwordHash: z.string().min(20),
  active: z.boolean().default(true),
});

export type StaffUser = z.infer<typeof staffUserSchema>;

const devOwner: StaffUser = {
  id: "dev-owner",
  email: "owner@sunsetcountry.tech",
  name: "Development Owner",
  role: "Owner",
  passwordHash: "$2b$12$AaTOUWJQBb1KpyNpA0uOlurGrPr43.67hJpHCFI/vUx734nNy.1.i",
  active: true,
};

export function safeReturnTo(value: unknown) {
  if (typeof value !== "string" || !value.startsWith("/") || value.startsWith("//")) {
    return "/";
  }
  return value;
}

export function getStaffUsers() {
  const raw = process.env.INTERNAL_USERS_JSON;
  if (!raw) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("INTERNAL_USERS_JSON is required in production.");
    }
    return [devOwner];
  }
  return z.array(staffUserSchema).parse(JSON.parse(raw));
}

export async function verifyStaffCredentials(email: string, password: string) {
  const user = getStaffUsers().find((candidate) => candidate.email === email && candidate.active);
  if (!user) {
    await bcrypt.compare(password, devOwner.passwordHash);
    return null;
  }

  return (await bcrypt.compare(password, user.passwordHash)) ? user : null;
}
