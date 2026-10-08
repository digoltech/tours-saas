import { EntityRecordPage } from "../../../../../src/features/management/EntityRecordPage";
export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <EntityRecordPage resource="drivers" id={id} mode="detail" />;
}
