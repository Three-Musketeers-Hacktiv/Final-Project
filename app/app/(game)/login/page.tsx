import type { Metadata } from "next";
import AuthForm from "@/components/AuthForm";
import ScreenShell from "@/components/ScreenShell";

export const metadata: Metadata = {
  title: "Log In",
};

export default function LoginPage() {
  return (
    <ScreenShell>
      <AuthForm mode="login" />
    </ScreenShell>
  );
}
