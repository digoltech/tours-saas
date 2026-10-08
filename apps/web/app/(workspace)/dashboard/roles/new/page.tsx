import { AccessRecordPage } from "../../../../../src/features/management/AccessRecordPage";
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ agencyId?: string; copy?: string }>;
}) {
  const query = await searchParams;
  return (
    <AccessRecordPage
      kind="role"
      mode="new"
      initialAgencyId={query.agencyId}
      copyId={query.copy}
    />
  );
}
