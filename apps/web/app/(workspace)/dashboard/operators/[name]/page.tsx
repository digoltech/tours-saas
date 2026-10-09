import { OperatorProfile } from "../../../../../src/features/transport/FleetProfiles";
export default async function Page({
  params,
}: {
  params: Promise<{ name: string }>;
}) {
  const { name } = await params;
  return <OperatorProfile name={name} />;
}
