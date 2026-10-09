import { EntityRecordPage } from "../../../../../src/features/management/EntityRecordPage";
export default async function Page({ searchParams }: { searchParams: Promise<{ agencyId?: string; branchId?: string; role?: string }> }) {
  const query = await searchParams;
  return <EntityRecordPage resource="agents" mode="new" initialAgencyId={query.agencyId} initialBranchId={query.branchId} initialRoleCode={query.role} />;
}
