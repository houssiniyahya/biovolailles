import { PageSkeleton } from "@/components/ui/Loading";

/** Lot detail: header + identity stat bar + tab panel. */
export default function LotDetailLoading() {
  return <PageSkeleton stats={4} cards={2} />;
}
