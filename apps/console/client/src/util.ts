export const esc = (s: unknown): string =>
  String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c] as string);

/** "2 h ago" with the absolute time on hover (ux-review B) */
export function rel(iso: string | null | undefined, now = Date.now()): string {
  if (!iso) return `<span class="na">—</span>`;
  const t = Date.parse(iso);
  if (!Number.isFinite(t)) return esc(iso);
  const d = Math.round((now - t) / 1000);
  const abs = new Date(t).toLocaleString();
  const txt =
    d < 0 ? "in the future" :
    d < 60 ? `${d} s ago` :
    d < 3600 ? `${Math.round(d / 60)} min ago` :
    d < 86400 ? `${Math.round(d / 3600)} h ago` :
    d < 86400 * 14 ? `${Math.round(d / 86400)} d ago` :
    new Date(t).toISOString().slice(0, 10);
  return `<span title="${esc(abs)}">${esc(txt)}</span>`;
}

export const usd = (n: number | null | undefined): string => (n === null || n === undefined ? "—" : `$${n.toFixed(2)}`);

export function dur(sec: number | null): string {
  if (sec === null) return "—";
  if (sec < 90) return `${sec} s`;
  if (sec < 5400) return `${Math.round(sec / 60)} min`;
  return `${(sec / 3600).toFixed(1)} h`;
}

export const $ = <T extends HTMLElement = HTMLElement>(sel: string, root: ParentNode = document): T => {
  const el = root.querySelector<T>(sel);
  if (!el) throw new Error(`missing element ${sel}`);
  return el;
};

export const chip = (text: string, kind = ""): string => `<span class="chip ${kind}">${esc(text)}</span>`;
export const pathTag = (p: string): string => `<span class="path" title="${esc(p)}">${esc(p)}</span>`;
