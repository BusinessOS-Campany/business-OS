import { z } from "zod";
import type { Dictionary } from "@/lib/i18n/dictionaries";
import { USER_ROLES } from "@/lib/users/users";

export function roleField(t: Dictionary) {
  return z.string().refine(
    (value) => (USER_ROLES as readonly string[]).includes(value),
    t.usersManagement.roleError,
  );
}

export function createUserSchema(t: Dictionary) {
  return z.object({
    name: z.string().min(1, t.usersManagement.nameError),
    username: z
      .string()
      .min(3, t.usersManagement.usernameError)
      .regex(/^[a-z0-9_]+$/i, t.usersManagement.usernameError),
    phone: z.string().max(30, t.usersManagement.phoneError).optional().default(""),
    password: z.string().min(3, t.usersManagement.passwordError),
    role: roleField(t),
    permissions: z.array(z.string()).optional().default([]),
  });
}

export function updateUserSchema(t: Dictionary) {
  return z
    .object({
      name: z.string().min(1, t.usersManagement.nameError).optional(),
      phone: z.string().max(30, t.usersManagement.phoneError).optional(),
      password: z
        .string()
        .refine((value) => value === "" || value.length >= 3, t.usersManagement.passwordError)
        .optional()
        .default(""),
      role: roleField(t).optional(),
      permissions: z.array(z.string()).optional(),
      isActive: z.boolean().optional(),
    })
    .refine((value) => Object.keys(value).length > 0, t.usersManagement.invalidData);
}

export type UserInput = z.infer<ReturnType<typeof createUserSchema>>;
export type UserUpdateInput = z.infer<ReturnType<typeof updateUserSchema>>;
