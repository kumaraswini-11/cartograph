import type { TaxonomyEntry } from "@workspace/frameworks"
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@workspace/ui/components/shadcn-ui/sidebar"

import { useMapState } from "@/components/map/map-state"
import { TierSwatch } from "@/components/map/tier"

/**
 * The rail (spec 003, FR-015, FR-016): the taxonomy in its fixed order, each
 * role with its swatch, name and file count. Choosing a role dims every file
 * outside it; choosing it again clears the choice. Built on shadcn's
 * Sidebar, always open: always a column, at every width.
 */
export function Rail({ taxonomy }: { taxonomy: ReadonlyArray<TaxonomyEntry> }) {
  const {
    state: { role },
    actions: { chooseRole },
  } = useMapState()

  return (
    <Sidebar
      collapsible="none"
      role="complementary"
      aria-labelledby="rail-heading"
      className="border-e"
      style={
        { "--sidebar-width": "clamp(9rem, 20vw, 16rem)" } as React.CSSProperties
      }
    >
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel id="rail-heading" render={<h2 />}>
            Roles
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {taxonomy.map((entry) => {
                const chosen = role === entry.role
                return (
                  <SidebarMenuItem key={entry.role}>
                    <SidebarMenuButton
                      isActive={chosen}
                      aria-pressed={chosen}
                      onClick={() => chooseRole(chosen ? null : entry.role)}
                    >
                      <TierSwatch tier={entry.tier} className="size-2.5" />
                      <span>{entry.role}</span>
                    </SidebarMenuButton>
                    <SidebarMenuBadge className="tabular-nums">
                      {entry.files}
                    </SidebarMenuBadge>
                  </SidebarMenuItem>
                )
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  )
}
