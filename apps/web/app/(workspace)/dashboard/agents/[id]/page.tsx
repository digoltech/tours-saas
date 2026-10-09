import { MemberProfile } from "../../../../../src/features/management/MemberProfile";
export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <MemberProfile id={id} />;
}
