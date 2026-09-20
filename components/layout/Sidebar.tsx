import { SidebarBrand, SidebarNav, type NavSection } from "./SidebarNav";

export type { NavSection, NavItem, NavIconName } from "./SidebarNav";

/** Desktop rail. Below `lg` the same sections render inside MobileNav's drawer instead. */
export function Sidebar({ sections, demoMode }: { sections: NavSection[]; demoMode: boolean }) {
  return (
    <aside className="hidden w-60 shrink-0 flex-col border-r border-border bg-surface lg:flex">
      <SidebarBrand demoMode={demoMode} />
      <SidebarNav sections={sections} />
    </aside>
  );
}
