import Link from "next/link";
import { RegisterForm } from "../../src/features/auth/components/RegisterForm";
import { AuthLayout } from "../../src/features/auth/components/AuthLayout";

export default function RegisterPage() {
  return (
    <AuthLayout>
      <div className="auth-card-stack auth-card-stack-wide">
        <div className="auth-heading"><p className="eyebrow">Start operating</p><h2>Create your workspace</h2><p>Set up your team and get ready for the next journey.</p></div>
        <RegisterForm />
        <p className="auth-bottom-link">Already have an account? <Link href="/login">Sign in</Link></p>
      </div>
    </AuthLayout>
  );
}
