import { BusFormWorkspace } from "../../../../../../src/features/transport/BusFormWorkspace";

export default async function EditBusPage({ params, searchParams }: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ step?: string }>;
}) {
  const [{ id }, query] = await Promise.all([params, searchParams]);
  return <BusFormWorkspace busId={id} initialStep={query.step === "layout" ? 2 : 0} />;
}
