import { getCurrentSession } from "@/services/auth/session";
import { getDashboardOverview } from "@/services/dashboard/overview";
import { DashboardClient } from "./DashboardClient";

export default async function DashboardPage() {
  const session = await getCurrentSession();
  if (!session) return null;

  const overview = await getDashboardOverview(session);
  return <DashboardClient overview={overview} />;
}
