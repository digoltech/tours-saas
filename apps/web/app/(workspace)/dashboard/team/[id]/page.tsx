import { AccessRecordPage } from "../../../../../src/features/management/AccessRecordPage";
export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ agencyId?: string; copy?: string }>;
}) {
  const [{ id }, query] = await Promise.all([params, searchParams]);
  return (
    <AccessRecordPage
      kind="member"
      mode="detail"
      id={id}
      initialAgencyId={query.agencyId}
      copyId={query.copy}
    />
  );
}
