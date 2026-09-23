import Link from "next/link";
import { RegisterForm } from "../../src/features/auth/components/RegisterForm";

export default function RegisterPage() {
  return <div className="login-page"><div className="login-brand"><Link href="/" className="home-brand"><span className="brand-mark">A</span><strong>A-One Tours & Travels</strong></Link></div><RegisterForm /><p className="auth-switch">Already have an account? <Link href="/login">Sign in</Link></p></div>;
}
