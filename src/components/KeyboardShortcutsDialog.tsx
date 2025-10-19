import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";

interface ShortcutGroup {
  title: string;
  shortcuts: Array<{
    keys: string;
    description: string;
  }>;
}

const SHORTCUTS: ShortcutGroup[] = [
  {
    title: "Panels",
    shortcuts: [
      { keys: "Ctrl+L", description: "Toggle Library" },
      { keys: "Ctrl+I", description: "Toggle Inspector" },
      { keys: "Ctrl+G", description: "Toggle Layers" },
      { keys: "Ctrl+T", description: "Toggle Timeline" },
    ],
  },
  {
    title: "Playback",
    shortcuts: [
      { keys: "Space", description: "Play/Pause" },
      { keys: "→", description: "Next frame" },
      { keys: "←", description: "Previous frame" },
      { keys: "Home", description: "Go to first frame" },
      { keys: "End", description: "Go to last frame" },
    ],
  },
  {
    title: "View",
    shortcuts: [
      { keys: "Ctrl+0", description: "Fit in view" },
    ],
  },
  {
    title: "Timeline (when keyframes selected)",
    shortcuts: [
      { keys: "Delete", description: "Delete selected keyframes" },
      { keys: "Ctrl+D", description: "Duplicate selected keyframes" },
      { keys: "Ctrl+A", description: "Select all keyframes in track" },
      { keys: "→", description: "Nudge keyframes +1 frame" },
      { keys: "←", description: "Nudge keyframes -1 frame" },
      { keys: "Shift+→", description: "Nudge keyframes +10 frames" },
      { keys: "Shift+←", description: "Nudge keyframes -10 frames" },
    ],
  },
];

interface KeyboardShortcutsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function KeyboardShortcutsDialog({
  open,
  onOpenChange,
}: KeyboardShortcutsDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Keyboard Shortcuts</DialogTitle>
          <DialogDescription>
            Quick reference for all available keyboard shortcuts
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 mt-4">
          {SHORTCUTS.map((group) => (
            <div key={group.title}>
              <h3 className="text-sm font-semibold text-foreground mb-3">
                {group.title}
              </h3>
              <div className="space-y-2">
                {group.shortcuts.map((shortcut) => (
                  <div
                    key={shortcut.keys}
                    className="flex items-center justify-between text-sm"
                  >
                    <span className="text-muted-foreground">
                      {shortcut.description}
                    </span>
                    <kbd className="pointer-events-none inline-flex h-6 select-none items-center gap-1 rounded border border-border bg-muted px-2 font-mono text-[11px] font-medium text-muted-foreground opacity-100">
                      {shortcut.keys.split("+").map((key, idx) => (
                        <span key={idx}>
                          {idx > 0 && <span className="text-xs">+</span>}
                          {key}
                        </span>
                      ))}
                    </kbd>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-6 pt-4 border-t border-border text-xs text-muted-foreground">
          <p>
            Note: On macOS, use <kbd className="px-1 py-0.5 rounded bg-muted border border-border">Cmd</kbd> instead of{" "}
            <kbd className="px-1 py-0.5 rounded bg-muted border border-border">Ctrl</kbd>
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
