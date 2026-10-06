import { Translate } from "../../../src/i18n/Translate";
import { cn } from "../../../src/lib/utils";
import Link from "next/link";
import { LoginForm } from "../../../src/features/auth/components/LoginForm";
import { AuthLayout } from "../../../src/features/auth/components/AuthLayout";

export default function LoginRoute() {
  return (
    <AuthLayout>
      <div className={cn("auth-card-stack")}>
        <div className={cn("auth-heading")}><p className={cn("eyebrow")}><Translate text={"WELCOME BACK"} /></p><h2><Translate text={"Sign in to Digol TravelOS"} /></h2><p><Translate text={"Pick up where your team left off."} /></p></div>
        <LoginForm />
        <div className={cn("auth-links-row")}><Link className={cn("forgot-link")} href="/auth/forgot-password"><Translate text={"Forgot password?"} /></Link><span><Translate text={"New to Digol?"} />{" "}<Link href="/auth/register"><Translate text={"Create an account"} /></Link></span></div>
      </div>
    </AuthLayout>
  );
}
