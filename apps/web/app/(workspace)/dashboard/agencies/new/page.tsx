import { EntityRecordPage } from "../../../../../src/features/management/EntityRecordPage";
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ agencyId?: string; routeId?: string }>;
}) {
  const query = await searchParams;
  return (
    <EntityRecordPage
      resource="agencies"
      mode="new"
      initialAgencyId={query.agencyId}
      routeId={query.routeId}
    />
  );
}
