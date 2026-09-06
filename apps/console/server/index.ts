import { exec } from "node:child_process";
import { serve } from "@hono/node-server";
import { createApp } from "./app.js";

export interface ConsoleOptions {
  workspace: string;
  /** 127.0.0.1 unless explicitly overridden for container use (BUILD-PLAN §0 rule 1) */
  host?: string;
  port?: number;
  open?: boolean;
}

export interface RunningConsole {
  url: string;
  close: () => Promise<void>;
}

export async function startConsole(opts: ConsoleOptions): Promise<RunningConsole> {
  const host = opts.host ?? "127.0.0.1";
  const port = opts.port ?? 4571;
  const { app, watcher } = createApp({ workspace: opts.workspace });
  const server = serve({ fetch: app.fetch, hostname: host, port });
  const url = `http://${host}:${port}`;
  if (opts.open) {
    const cmd = process.platform === "darwin" ? "open" : process.platform === "win32" ? "start" : "xdg-open";
    exec(`${cmd} ${url}`, () => undefined);
  }
  return {
    url,
    close: async () => {
      await watcher.close();
      await new Promise<void>((res) => server.close(() => res()));
    },
  };
}

export { createApp } from "./app.js";
