import type { Metadata } from "next";
import AuthForm from "@/components/AuthForm";
import ScreenShell from "@/components/ScreenShell";

export const metadata: Metadata = {
  title: "Create Account",
};

export default function RegisterPage() {
  return (
    <ScreenShell>
      <AuthForm mode="register" />
    </ScreenShell>
  );
}
