import { Button } from "@/components/shadcn-ui/button";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@/components/shadcn-ui/empty";

// Content shared by app/error.tsx and app/global-error.tsx. Each boundary keeps
// its own wrapper because global-error has to render <html> and <body> itself.
export function ErrorFallback({
  digest,
  retry,
}: {
  digest?: string;
  retry: () => void;
}) {
  return (
    <Empty>
      <EmptyHeader>
        <EmptyTitle>
          <h1>Something went wrong</h1>
        </EmptyTitle>
        {digest && (
          <EmptyDescription>
            Reference: <span className="font-mono">{digest}</span>
          </EmptyDescription>
        )}
      </EmptyHeader>
      <EmptyContent>
        <Button size="sm" onClick={() => retry()}>
          Try again
        </Button>
      </EmptyContent>
    </Empty>
  );
}
