export interface HarnessResult {
  text: string;
  costUsd: number;
  tokensIn: number;
  tokensOut: number;
  isError: boolean;
  /** non-null when the harness printed something we could not parse */
  parseError: string | null;
}

export interface HarnessPort {
  provider: string;
  /** env var names that must be injected for this harness */
  secrets: string[];
  /** the shell command, reading the prompt from `promptPath`, run with cwd = repo */
  command(model: string, promptPath: string): string;
  parse(stdout: string): HarnessResult;
}

export const claudeCode: HarnessPort = {
  provider: "claude-code",
  secrets: ["CLAUDE_CODE_OAUTH_TOKEN"],
  command: (model, promptPath) => `claude -p --model ${model} --output-format json --dangerously-skip-permissions < ${promptPath}`,
  parse: (stdout) => {
    const trimmed = stdout.trim();
    const start = trimmed.lastIndexOf("\n{");
    const json = start >= 0 ? trimmed.slice(start + 1) : trimmed;
    try {
      const o = JSON.parse(json) as Record<string, unknown>;
      const usage = (o.usage ?? {}) as Record<string, unknown>;
      return {
        text: typeof o.result === "string" ? o.result : "",
        costUsd: typeof o.total_cost_usd === "number" ? o.total_cost_usd : 0,
        tokensIn: num(usage.input_tokens) + num(usage.cache_read_input_tokens) + num(usage.cache_creation_input_tokens),
        tokensOut: num(usage.output_tokens),
        isError: o.is_error === true,
        parseError: null,
      };
    } catch {
      return { text: trimmed, costUsd: 0, tokensIn: 0, tokensOut: 0, isError: true, parseError: "harness output is not JSON" };
    }
  },
};

/** pi is installed in the sandbox but unconfigured; the adapter exists so the switch is one config line. */
export const pi: HarnessPort = {
  provider: "pi",
  secrets: ["ANTHROPIC_API_KEY"],
  command: (model, promptPath) => `pi -p --model ${model} < ${promptPath}`,
  parse: (stdout) => ({ text: stdout.trim(), costUsd: 0, tokensIn: 0, tokensOut: 0, isError: false, parseError: null }),
};

export function harnessFor(provider: string): HarnessPort {
  if (provider === "claude-code") return claudeCode;
  if (provider === "pi") return pi;
  throw new Error(`unknown harness provider: ${provider}`);
}

const num = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? v : 0);
