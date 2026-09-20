import { PageSkeleton, TableSkeleton } from "@/components/ui/Loading";

/** Table-first route — the skeleton mirrors the header + table shape. */
export default function Loading() {
  return (
    <>
      <PageSkeleton stats={0} cards={0} />
      <TableSkeleton rows={8} columns={5} />
    </>
  );
}
