import { cn } from "../../../src/lib/utils";
import Link from "next/link";
import { RegisterForm } from "../../../src/features/auth/components/RegisterForm";
import { AuthLayout } from "../../../src/features/auth/components/AuthLayout";

export default function RegisterPage() {
  return (
    <AuthLayout>
      <div className={cn("auth-card-stack auth-card-stack-wide")}>
        <div className={cn("auth-heading")}><p className={cn("eyebrow")}>START YOUR JOURNEY</p><h2>Create your account</h2><p>Your business details come after email confirmation. First, tell us about you.</p></div>
        <RegisterForm />
        <p className={cn("auth-bottom-link")}>Already have an account? <Link href="/auth/login">Sign in</Link></p>
      </div>
    </AuthLayout>
  );
}
