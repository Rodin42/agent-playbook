export interface FileNode { path: string; kind: "yaml" | "md" | "role" | "twin" | "locked"; locked: boolean }
export interface FileGroup { group: string; files: FileNode[] }

export type ViewId =
  | "overview" | "config" | "files" | "finished"
  | "s1-backlog" | "s1-esc" | "s1-runs"
  | "s2-pipeline" | "s2-esc" | "s2-runs"
  | "s3-findings" | "s3-esc" | "s3-runs";

export const VIEWS: ViewId[] = ["overview", "config", "files", "finished", "s1-backlog", "s1-esc", "s1-runs", "s2-pipeline", "s2-esc", "s2-runs", "s3-findings", "s3-esc", "s3-runs"];
