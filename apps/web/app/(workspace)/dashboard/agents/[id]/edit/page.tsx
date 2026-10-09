import { MemberProfile } from "../../../../../../src/features/management/MemberProfile";
import { EntityRecordPage } from "../../../../../../src/features/management/EntityRecordPage";
export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ section?: string }>;
}) {
  const { id } = await params;
  const { section } = await searchParams;
  return section === "personal" ? (
    <MemberProfile id={id} editPersonal />
  ) : (
    <EntityRecordPage resource="agents" id={id} mode="edit" />
  );
}
