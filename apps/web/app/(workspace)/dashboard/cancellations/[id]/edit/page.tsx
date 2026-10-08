import { FinanceRecordPage } from "../../../../../../src/features/finance/FinanceRecordPage";
export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <FinanceRecordPage id={id} kind="cancellation" mode="edit" />;
}
