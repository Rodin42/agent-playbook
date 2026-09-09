import { existsSync } from "node:fs";
import { join, resolve } from "node:path";
import { Template, defaultBuildLogger } from "e2b";
import { loadEffectiveConfig } from "@factory/core";
import { envValue, readDotEnv, requireEnv } from "./env.js";

export interface TemplateBuildOptions {
  project: string;
  /** override the alias from factory.config.yaml (sandbox.e2b.template) */
  alias?: string;
  dockerfile?: string;
  cpuCount?: number;
  memoryMB?: number;
}

/** `factory template build` — build the project's sandbox image from runtime/sandbox.Dockerfile. */
export async function factoryTemplateBuild(opts: TemplateBuildOptions): Promise<{ alias: string; templateId: string; buildId: string }> {
  const project = resolve(opts.project);
  const cfg = loadEffectiveConfig(project);
  const env = readDotEnv(project);
  requireEnv(env, ["E2B_API_KEY"]);
  const dockerfile = resolve(project, opts.dockerfile ?? "runtime/sandbox.Dockerfile");
  if (!existsSync(dockerfile)) throw new Error(`no Dockerfile at ${dockerfile}`);
  const alias = opts.alias ?? cfg.sandbox.template ?? "factory-base";
  const tpl = Template().fromDockerfile(dockerfile);
  const info = await Template.build(tpl, {
    alias,
    apiKey: envValue(env, "E2B_API_KEY"),
    cpuCount: opts.cpuCount ?? 2,
    memoryMB: opts.memoryMB ?? 2048,
    onBuildLogs: defaultBuildLogger(),
  });
  return { alias, templateId: info.templateId, buildId: info.buildId };
}

export const DOCKERFILE_REL = join("runtime", "sandbox.Dockerfile");
