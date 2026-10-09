import { ManagementPage } from "../../../../src/features/management/ManagementPage";
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ agencyId?: string; branchId?: string }>;
}) {
  const query = await searchParams;
  return (
    <ManagementPage
      resource="agents"
      initialAgencyId={query.agencyId}
      initialBranchId={query.branchId}
    />
  );
}
