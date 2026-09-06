#!/usr/bin/env node
import { homedir } from "node:os";
import { resolve } from "node:path";
import { startConsole } from "@factory/console";
import { factoryNew } from "./new.js";

const DEFAULT_WORKSPACE = resolve(homedir(), "factory-workspace");

interface Args {
  cmd: string | null;
  positional: string[];
  flags: Record<string, string | boolean>;
}

function parse(argv: string[]): Args {
  const out: Args = { cmd: null, positional: [], flags: {} };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i] as string;
    if (a.startsWith("--")) {
      const key = a.slice(2);
      if (key.startsWith("no-")) out.flags[key.slice(3)] = false;
      else {
        const next = argv[i + 1];
        if (next !== undefined && !next.startsWith("--")) {
          out.flags[key] = next;
          i++;
        } else out.flags[key] = true;
      }
    } else if (out.cmd === null) out.cmd = a;
    else out.positional.push(a);
  }
  return out;
}

const HELP = `factory — the agent factory CLI

  factory ui   [--workspace <path>] [--port 4571] [--host 127.0.0.1] [--no-open]
               serve the operator console for a workspace (default ~/factory-workspace)
  factory new  <name> [--workspace <path>] [--remote <git url>]
               seed a project from template/, git init + first commit, register it
  factory run  <role> <feature>        (Phase B/C)
  factory next                         (Phase B/C)
  factory stop <runid>                 (Phase B/C)
  factory template build               (Phase B)
`;

async function main(): Promise<number> {
  const args = parse(process.argv.slice(2));
  const workspace = String(args.flags.workspace ?? DEFAULT_WORKSPACE);
  switch (args.cmd) {
    case "ui": {
      const running = await startConsole({
        workspace,
        host: typeof args.flags.host === "string" ? args.flags.host : undefined,
        port: typeof args.flags.port === "string" ? Number(args.flags.port) : undefined,
        open: args.flags.open !== false,
      });
      console.log(`factory ui → ${running.url}   (workspace: ${workspace})`);
      const stop = () => void running.close().then(() => process.exit(0));
      process.on("SIGINT", stop);
      process.on("SIGTERM", stop);
      return -1; // keep running
    }
    case "new": {
      const name = args.positional[0];
      if (!name) {
        console.error("usage: factory new <name> [--workspace <path>] [--remote <git url>]");
        return 1;
      }
      const r = factoryNew({ name, workspace, remote: typeof args.flags.remote === "string" ? args.flags.remote : undefined });
      console.log(`seeded ${r.path}\nregistered in ${r.workspaceFile}\nnext: ${r.next}`);
      return 0;
    }
    case "run":
    case "next":
    case "stop":
    case "template":
      console.error(`factory ${args.cmd}: not implemented until Phase B/C (runtime-plan.md §4)`);
      return 2;
    case null:
    case "help":
    case "--help":
      console.log(HELP);
      return 0;
    default:
      console.error(`unknown command: ${args.cmd}\n\n${HELP}`);
      return 1;
  }
}

main().then((code) => {
  if (code >= 0) process.exit(code);
}, (err: unknown) => {
  console.error(err instanceof Error ? err.message : String(err));
  process.exit(1);
});
