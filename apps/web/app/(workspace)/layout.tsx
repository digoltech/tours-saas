import type { ReactNode } from "react";
import "../../src/styles/workspace.css";
import { ConfirmationProvider } from "../../src/ui/ConfirmationModal";
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
      <ConfirmationProvider>
        <Shell>{children}</Shell>
      </ConfirmationProvider>
    </AuthProvider>
  );
}
