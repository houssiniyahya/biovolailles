import { PageSkeleton } from "@/components/ui/Loading";

/**
 * Default route-level fallback. A centred spinner told the user "something is happening" but
 * not what, and the layout jumped once content replaced it; the skeleton holds the shape the
 * page is about to take (§20).
 */
export default function AppLoading() {
  return <PageSkeleton stats={4} cards={2} />;
}
