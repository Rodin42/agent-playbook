import { Sandbox } from "e2b";

export interface ExecResult {
  exitCode: number;
  stdout: string;
  stderr: string;
}

export interface ExecOpts {
  cwd?: string;
  envs?: Record<string, string>;
  timeoutMs?: number;
  onLine?: (line: string) => void;
}

/** SandboxPort — swap point 1. Everything the run loop needs from wherever agents execute. */
export interface SandboxPort {
  id: string;
  exec(cmd: string, opts?: ExecOpts): Promise<ExecResult>;
  readFile(path: string): Promise<string | null>;
  writeFile(path: string, text: string): Promise<void>;
  destroy(): Promise<void>;
}

export interface E2bOpts {
  apiKey: string;
  template: string;
  timeoutMs: number;
}

export async function createE2bSandbox(opts: E2bOpts): Promise<SandboxPort> {
  const sbx = await Sandbox.create(opts.template, { apiKey: opts.apiKey, timeoutMs: opts.timeoutMs });
  return {
    id: sbx.sandboxId,
    async exec(cmd, o = {}) {
      const r = await sbx.commands.run(cmd, {
        cwd: o.cwd,
        envs: o.envs,
        timeoutMs: o.timeoutMs ?? 0,
        onStdout: o.onLine ? (d) => void o.onLine?.(d) : undefined,
        onStderr: o.onLine ? (d) => void o.onLine?.(d) : undefined,
      }).catch((err: unknown) => {
        // e2b throws CommandExitError on non-zero exit; keep the result instead of the exception.
        const e = err as { exitCode?: number; stdout?: string; stderr?: string; message?: string };
        if (typeof e?.exitCode === "number") return { exitCode: e.exitCode, stdout: e.stdout ?? "", stderr: e.stderr ?? "" };
        throw err;
      });
      return { exitCode: r.exitCode, stdout: r.stdout, stderr: r.stderr };
    },
    async readFile(path) {
      try {
        return await sbx.files.read(path);
      } catch {
        return null;
      }
    },
    async writeFile(path, text) {
      await sbx.files.write(path, text);
    },
    async destroy() {
      await sbx.kill();
    },
  };
}
