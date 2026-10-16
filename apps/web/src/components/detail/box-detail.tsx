import { rolesIn } from "@workspace/graph"
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
} from "@workspace/ui/components/shadcn-ui/sidebar"

import { FactList } from "@/components/detail/fact-list"
import { useMapData } from "@/components/map/map-data"
import { TierSwatch } from "@/components/map/tier"

/**
 * A selected box's structure (spec 004, FR-010): the roles of the files
 * inside it, each with its count, in the taxonomy's order. The counts add up
 * to the box's files (C-02).
 */
export function BoxDetail({ id }: { id: string }) {
  const { input, boxMap, tierOf } = useMapData()
  const box = boxMap.byId.get(id)
  if (!box) return null

  return (
    <>
      <SidebarGroup>
        <SidebarGroupContent className="px-2">
          <FactList facts={[{ term: "Files", value: box.files.length }]} />
        </SidebarGroupContent>
      </SidebarGroup>
      <SidebarGroup>
        <SidebarGroupLabel render={<h3 />}>Roles</SidebarGroupLabel>
        <SidebarGroupContent className="px-2">
          <FactList
            facts={rolesIn(box, input.files, input.taxonomy).map(
              ({ role, files }) => ({
                term: role,
                value: files,
                media: <TierSwatch tier={tierOf(role)} />,
              })
            )}
          />
        </SidebarGroupContent>
      </SidebarGroup>
    </>
  )
}
