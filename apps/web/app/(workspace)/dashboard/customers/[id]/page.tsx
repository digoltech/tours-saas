import { CustomerRecordPage } from "../../../../../src/features/management/CustomerRecordPage";
export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <CustomerRecordPage id={id} />;
}
