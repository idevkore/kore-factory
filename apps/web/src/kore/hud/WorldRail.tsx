import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import type { IslandWorld } from "../core/contract";
import { formatWaited } from "../core/state";

interface WorldPickerProps {
  readonly worlds: ReadonlyArray<IslandWorld>;
  readonly activeWorldId: string | null;
  readonly nowMs: number;
  readonly onSelectWorld: (worldId: string) => void;
}

/**
 * One button per world, from the `lg` breakpoint up. The region spans the left
 * edge; only the card inside it takes clicks, so the canvas below it keeps them.
 */
export function WorldRail(props: WorldPickerProps) {
  return (
    <div className="pointer-events-none absolute top-16 bottom-16 left-3 hidden w-44 flex-col lg:flex">
      <nav
        aria-label="Worlds"
        className="pointer-events-auto max-h-full overflow-y-auto rounded-lg border bg-background/95 p-1.5"
      >
        <ul className="flex flex-col gap-0.5">
          {props.worlds.map((world) => {
            const active = world.id === props.activeWorldId;
            return (
              <li key={world.id}>
                <button
                  type="button"
                  aria-current={active ? "true" : undefined}
                  className="flex w-full flex-col items-start gap-1 rounded-md px-2 py-1.5 text-left outline-none hover:bg-accent focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring aria-[current=true]:bg-accent"
                  onClick={() => props.onSelectWorld(world.id)}
                >
                  <span className="w-full truncate font-medium text-sm">{world.name}</span>
                  <span className="flex flex-wrap items-center gap-1.5 text-muted-foreground text-xs">
                    <span>Working {world.working}</span>
                    <Badge variant={world.waiting > 0 ? "error" : "secondary"}>
                      {world.waiting}
                      <span className="sr-only"> waiting</span>
                    </Badge>
                    {world.waiting > 0 && world.oldestWaitingSince !== null ? (
                      <span>
                        <span className="sr-only">oldest </span>
                        {formatWaited(world.oldestWaitingSince, props.nowMs)}
                      </span>
                    ) : null}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </nav>
    </div>
  );
}

/** Below `lg`, where the rail is hidden, the worlds as a row of buttons in the panel. */
export function WorldRow(props: Omit<WorldPickerProps, "nowMs">) {
  return (
    <nav aria-label="Worlds" className="flex flex-wrap gap-1 lg:hidden">
      {props.worlds.map((world) => (
        <Button
          key={world.id}
          size="xs"
          variant={world.id === props.activeWorldId ? "secondary" : "ghost"}
          aria-current={world.id === props.activeWorldId ? "true" : undefined}
          onClick={() => props.onSelectWorld(world.id)}
        >
          {world.name} {world.waiting}
        </Button>
      ))}
    </nav>
  );
}
