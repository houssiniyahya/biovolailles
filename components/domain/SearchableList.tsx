"use client";

import { Search } from "lucide-react";
import { useMemo, useState, type ReactNode } from "react";
import { EmptyState } from "@/components/ui/EmptyState";
import { Input } from "@/components/ui/Input";

/**
 * One already-rendered row. `content` is a ReactNode built by the calling Server Component,
 * which crosses the server/client boundary fine; `searchText` is the plain string the filter
 * matches against.
 *
 * This shape exists because the previous API took `filter`/`renderItem` *functions* — and
 * React refuses to serialize functions from a Server Component into a Client Component, so
 * every page using it (cooperatives, producteurs, fermes) threw at request time in a
 * production build. Keeping the props serializable is what makes this component safe to call
 * from a Server Component at all.
 */
export interface SearchableItem {
  key: string;
  searchText: string;
  content: ReactNode;
}

export interface SearchableListProps {
  items: SearchableItem[];
  placeholder: string;
  emptyTitle: string;
  emptyDescription?: string;
}

/** Client-side search over an already-fetched, small (MVP-scale) list — see phase-2 brief §21. */
export function SearchableList({ items, placeholder, emptyTitle, emptyDescription }: SearchableListProps) {
  const [query, setQuery] = useState("");
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter((item) => item.searchText.toLowerCase().includes(q));
  }, [items, query]);

  return (
    <div className="flex flex-col gap-4">
      <div className="relative max-w-sm">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" aria-hidden="true" />
        <Input
          placeholder={placeholder}
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          className="pl-9"
        />
      </div>
      {filtered.length === 0 ? (
        <EmptyState title={emptyTitle} description={items.length === 0 ? emptyDescription : "Aucun résultat pour cette recherche."} />
      ) : (
        <div className="flex flex-col gap-3">
          {filtered.map((item) => (
            <div key={item.key}>{item.content}</div>
          ))}
        </div>
      )}
    </div>
  );
}
