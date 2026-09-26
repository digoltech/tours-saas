import { TripPage } from "../../../../src/features/transport/TripPage";
import { loadInitialTripsPage } from "../../../../src/features/management/dashboard-data";

export default async function Page() {
  const result = await loadInitialTripsPage();
  return (
    <TripPage initialPage={result.page} initialError={result.error} />
  );
}
