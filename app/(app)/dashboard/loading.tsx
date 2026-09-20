import { PageSkeleton } from "@/components/ui/Loading";

/** The dashboard leads with a six-up stat grid, so its skeleton does too. */
export default function DashboardLoading() {
  return <PageSkeleton stats={6} cards={3} />;
}
