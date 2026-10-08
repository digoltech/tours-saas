import { BulkRowPage } from "../../../../../../src/features/management/BulkRowPage";
export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <BulkRowPage id={id} />;
}
