import { cn } from "../../src/lib/utils";
import Link from "next/link";
import { RegisterForm } from "../../src/features/auth/components/RegisterForm";
import { AuthLayout } from "../../src/features/auth/components/AuthLayout";

export default function RegisterPage() {
  return (
    <AuthLayout>
      <div className={cn("auth-card-stack auth-card-stack-wide")}>
        <div className={cn("auth-heading")}><p className={cn("eyebrow")}>Start operating</p><h2>Create your workspace</h2><p>Set up your team and get ready for the next journey.</p></div>
        <RegisterForm />
        <p className={cn("auth-bottom-link")}>Already have an account? <Link href="/login">Sign in</Link></p>
      </div>
    </AuthLayout>
  );
}
