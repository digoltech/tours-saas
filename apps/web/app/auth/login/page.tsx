import { cn } from "../../../src/lib/utils";
import Link from "next/link";
import { LoginForm } from "../../../src/features/auth/components/LoginForm";
import { AuthLayout } from "../../../src/features/auth/components/AuthLayout";

export default function LoginRoute() {
  return (
    <AuthLayout>
      <div className={cn("auth-card-stack")}>
        <div className={cn("auth-heading")}><p className={cn("eyebrow")}>WELCOME BACK</p><h2>Sign in to Digol TravelOS</h2><p>Pick up where your team left off.</p></div>
        <LoginForm />
        <div className={cn("auth-links-row")}><Link className={cn("forgot-link")} href="/auth/forgot-password">Forgot password?</Link><span>New to Digol? <Link href="/auth/register">Create an account</Link></span></div>
      </div>
    </AuthLayout>
  );
}
