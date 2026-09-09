#!/usr/bin/env node
import { homedir } from "node:os";
import { resolve } from "node:path";
import { startConsole } from "@factory/console";
import { factoryNew } from "./new.js";
import { factoryRun } from "./runtime/run.js";
import { factoryTemplateBuild } from "./runtime/template.js";

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
  factory run  <role> <feature> [--project <path>] [--model <m>] [--base <branch>] [--keep]
               one pipeline step: sandbox → clone feature branch → role prompt → verify artifact → commit+push
  factory template build [--project <path>] [--alias <name>] [--dockerfile <path>]
               build the project's e2b sandbox image from runtime/sandbox.Dockerfile
  factory next                         (Phase C)
  factory stop <runid>                 (Phase C)
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
    case "run": {
      const [role, feature] = args.positional;
      if (!role || !feature) {
        console.error("usage: factory run <role> <feature> [--project <path>] [--model <m>] [--base <branch>] [--keep]");
        return 1;
      }
      const project = typeof args.flags.project === "string" ? args.flags.project : process.cwd();
      const r = await factoryRun({
        project, role, feature,
        model: typeof args.flags.model === "string" ? args.flags.model : undefined,
        base: typeof args.flags.base === "string" ? args.flags.base : undefined,
        keep: args.flags.keep === true,
        log: (l) => console.log(l),
      });
      console.log(`\n${r.status.toUpperCase()} ${r.id}${r.reason ? ` — ${r.reason}` : ""}\nartifact: ${r.artifact}\nbranch: ${r.branch}${r.commit ? ` @ ${r.commit.slice(0, 7)}` : ""}\nrun: ${r.runFile}\nlog: ${r.logFile}`);
      return r.status === "ok" ? 0 : r.status === "escalated" ? 4 : 3;
    }
    case "template": {
      if (args.positional[0] !== "build") {
        console.error("usage: factory template build [--project <path>] [--alias <name>] [--dockerfile <path>]");
        return 1;
      }
      const project = typeof args.flags.project === "string" ? args.flags.project : process.cwd();
      const r = await factoryTemplateBuild({
        project,
        alias: typeof args.flags.alias === "string" ? args.flags.alias : undefined,
        dockerfile: typeof args.flags.dockerfile === "string" ? args.flags.dockerfile : undefined,
      });
      console.log(`built template ${r.alias} (id ${r.templateId}, build ${r.buildId})\nrecord it in factory.config.yaml → sandbox.e2b.template: "${r.alias}"`);
      return 0;
    }
    case "next":
    case "stop":
      console.error(`factory ${args.cmd}: not implemented until Phase C (runtime-plan.md §4)`);
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
