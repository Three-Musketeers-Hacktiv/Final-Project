"use client";

import { useRouter } from "next/navigation";
import { useLayoutEffect, useState } from "react";
import { apiRequest } from "@/lib/api";
import GameButton from "./GameButton";

/** Ends the session (the save stays on the server) and goes back to the home screen. */
export default function LogoutButton() {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  // The menu is kept when you leave it (cacheComponents): don't come back to "Logging out…".
  useLayoutEffect(() => () => setPending(false), []);

  async function logOut() {
    setPending(true);
    try {
      await apiRequest<{ loggedOut: true }>("/api/auth/logout", { method: "POST" });
    } catch {
      // Logout is idempotent on the server; leave the menu either way.
    }
    router.replace("/");
    router.refresh();
  }

  return (
    <GameButton onClick={logOut} disabled={pending}>
      {pending ? "Logging out…" : "Log Out"}
    </GameButton>
  );
}
