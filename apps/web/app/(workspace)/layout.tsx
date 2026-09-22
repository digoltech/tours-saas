import type { ReactNode } from "react";
import { Shell } from "../../src/App";
import { AuthProvider } from "../../src/features/auth/components/AuthProvider";

export default function WorkspaceLayout({ children }: { children: ReactNode }) {
  return (
    <AuthProvider>
      <Shell>{children}</Shell>
    </AuthProvider>
  );
}
