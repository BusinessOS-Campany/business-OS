"use client";

import { signOut } from "@/core/auth/client";

export function SignOutButton() {
  return (
    <button
      onClick={() => void signOut()}
      className="rounded-md border border-neutral-700 px-2 py-1 text-sm text-neutral-400 hover:text-white"
    >
      Sign out
    </button>
  );
}
