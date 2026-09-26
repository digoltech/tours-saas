import type { ReactNode } from "react";
import { Shell } from "../../src/App";
import { AuthProvider } from "../../src/features/auth/components/AuthProvider";
import { getRequestUser } from "../../src/features/auth/server";

export default async function WorkspaceLayout({
  children,
}: {
  children: ReactNode;
}) {
  const user = await getRequestUser();
  return (
    <AuthProvider initialUser={user}>
      <Shell>{children}</Shell>
    </AuthProvider>
  );
}
