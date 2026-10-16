import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@workspace/ui/components/shadcn-ui/empty"

/**
 * A thin composition of shadcn's Empty: an optional icon, a title, a
 * description, and actions as children. Shared because the same composition
 * appears in more than three places (AGENTS.md: the rule of three): empty
 * panes, a map with no files, and the not-found and error pages.
 */
export function EmptyState({
  icon,
  title,
  description,
  children,
  className,
}: {
  icon?: React.ReactNode
  title: React.ReactNode
  description: React.ReactNode
  children?: React.ReactNode
  className?: string
}) {
  return (
    <Empty className={className}>
      <EmptyHeader>
        {icon !== undefined && <EmptyMedia variant="icon">{icon}</EmptyMedia>}
        <EmptyTitle>{title}</EmptyTitle>
        <EmptyDescription>{description}</EmptyDescription>
      </EmptyHeader>
      {children !== undefined && <EmptyContent>{children}</EmptyContent>}
    </Empty>
  )
}
