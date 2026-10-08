import { TripPage } from "../../../../../../src/features/transport/TripPage";
export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <TripPage mode="edit" tripId={id} />;
}
