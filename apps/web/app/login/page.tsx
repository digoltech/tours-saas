import Link from "next/link";
import { LoginForm } from "../../src/features/auth/components/LoginForm";

export default function LoginRoute() {
  return (
    <div className="login-page">
      <div className="login-brand">
        <Link href="/" className="home-brand">
          <span className="brand-mark">A</span>
          <strong>A-One Tours & Travels</strong>
        </Link>
      </div>
      <LoginForm />
    </div>
  );
}
