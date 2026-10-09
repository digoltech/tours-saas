import { BusProfile } from "../../../../../src/features/transport/FleetProfiles";
export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <BusProfile id={id} />;
}
