"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { z } from "zod";
import { login } from "../services/api-client";
import { Button } from "../../../ui/Button";
import { Card } from "../../../ui/Card";
import { Input } from "../../../ui/Input";
import { PasswordInput } from "./PasswordInput";

const loginSchema = z.object({
  email: z.string().email("Enter a valid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

export function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const result = loginSchema.safeParse({ email, password });
    if (!result.success) {
      setError(result.error.issues[0]?.message ?? "Check your details");
      return;
    }
    setError("");
    setLoading(true);
    try {
      const result = await login(email, password);
      router.push(result.user.onboardingCompleted ? (result.user.role === "SUPER_ADMIN" ? "/superadmin" : "/dashboard") : "/onboarding");
      router.refresh();
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Unable to sign in",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card className="login-card">
      <form onSubmit={handleSubmit}>
        <Input
          label="Email address"
          id="email"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="you@company.com"
          disabled={loading}
        />
        <PasswordInput
          label="Password"
          id="password"
          autoComplete="current-password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          placeholder="Your password"
          disabled={loading}
        />
        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}
        <Button type="submit" disabled={loading}>
          {loading ? "Signing in..." : "Sign in"}
        </Button>
      </form>
    </Card>
  );
}
