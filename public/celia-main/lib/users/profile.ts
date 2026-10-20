import { z } from "zod";
import type { Dictionary } from "@/lib/i18n/dictionaries";

export function profileUpdateSchema(t: Dictionary) {
  return z
    .object({
      name: z.string().min(1, t.profilePage.nameError),
      phone: z.string().max(30, t.profilePage.phoneError).optional().default(""),
      currentPassword: z.string().optional().default(""),
      newPassword: z
        .string()
        .refine((value) => value === "" || value.length >= 3, t.profilePage.passwordError)
        .optional()
        .default(""),
    })
    .refine((value) => !value.newPassword || value.currentPassword, {
      message: t.profilePage.currentPasswordRequired,
    });
}

export type ProfileUpdateInput = z.infer<ReturnType<typeof profileUpdateSchema>>;
