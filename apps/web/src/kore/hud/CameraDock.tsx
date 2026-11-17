import { Button } from "../../components/ui/button";
import { Kbd } from "../../components/ui/kbd";
import type { CameraPreset } from "../core/contract";

const CAMERAS: ReadonlyArray<{ readonly preset: CameraPreset; readonly name: string }> = [
  { preset: "overview", name: "Overview" },
  { preset: "station", name: "Station" },
  { preset: "top", name: "Top" },
];

export function CameraDock(props: {
  readonly camera: CameraPreset;
  readonly multipleWorlds: boolean;
  readonly onCamera: (camera: CameraPreset) => void;
}) {
  return (
    <section
      aria-label="Camera and keys"
      className="absolute right-[396px] bottom-3 left-3 flex flex-wrap items-center gap-x-6 gap-y-2 rounded-lg border bg-background/95 px-3 py-2"
    >
      <div role="group" aria-label="Camera" className="flex gap-1">
        {CAMERAS.map(({ preset, name }) => (
          <Button
            key={preset}
            size="xs"
            variant={preset === props.camera ? "secondary" : "ghost"}
            aria-pressed={preset === props.camera}
            onClick={() => props.onCamera(preset)}
          >
            {name}
          </Button>
        ))}
      </div>
      <p className="flex flex-wrap items-center gap-2 text-muted-foreground text-xs">
        <Kbd>N</Kbd> next waiting
        <Kbd>Esc</Kbd> clear focus
        {props.multipleWorlds ? (
          <>
            <Kbd>[</Kbd>
            <Kbd>]</Kbd> world
          </>
        ) : null}
        <Kbd>1</Kbd>
        <Kbd>2</Kbd>
        <Kbd>3</Kbd> camera
      </p>
    </section>
  );
}
