import { watch, type FSWatcher } from "chokidar";

export type ChangeListener = (event: { project: string; path: string }) => void;

/** One chokidar watcher per project path; debounced, so a sandbox commit landing many files is one event. */
export class ProjectWatcher {
  private watchers = new Map<string, FSWatcher>();
  private listeners = new Set<ChangeListener>();
  private timers = new Map<string, NodeJS.Timeout>();

  watchProject(name: string, path: string): void {
    if (this.watchers.has(name)) return;
    const w = watch(path, {
      ignoreInitial: true,
      ignored: (p: string) => /(^|[/\\])(\.git|node_modules|dist)([/\\]|$)/.test(p),
      awaitWriteFinish: { stabilityThreshold: 150, pollInterval: 50 },
    });
    const fire = (changed: string) => {
      clearTimeout(this.timers.get(name));
      this.timers.set(
        name,
        setTimeout(() => {
          for (const l of this.listeners) l({ project: name, path: changed });
        }, 300),
      );
    };
    w.on("add", fire).on("change", fire).on("unlink", fire).on("addDir", fire).on("unlinkDir", fire);
    this.watchers.set(name, w);
  }

  subscribe(l: ChangeListener): () => void {
    this.listeners.add(l);
    return () => this.listeners.delete(l);
  }

  async close(): Promise<void> {
    for (const t of this.timers.values()) clearTimeout(t);
    await Promise.all([...this.watchers.values()].map((w) => w.close()));
    this.watchers.clear();
  }
}
