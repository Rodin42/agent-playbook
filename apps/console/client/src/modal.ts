import { $ } from "./util.js";

let onConfirm: (() => void) | null = null;

export function openModal(title: string, bodyHtml: string, opts: { confirm?: string; onConfirm?: () => void } = {}): void {
  $("#mtitle").textContent = title;
  $("#mbody").innerHTML = bodyHtml;
  const btn = $<HTMLButtonElement>("#mconfirm");
  btn.hidden = !opts.confirm;
  btn.textContent = opts.confirm ?? "confirm";
  onConfirm = opts.onConfirm ?? null;
  $("#overlay").classList.add("open");
}

export function closeModal(): void {
  $("#overlay").classList.remove("open");
  onConfirm = null;
}

export function toast(msg: string, kind: "" | "info" = ""): void {
  const t = document.createElement("div");
  t.className = `toastmsg ${kind}`;
  t.textContent = msg;
  $("#toast").appendChild(t);
  setTimeout(() => t.remove(), 4200);
}

export function wireModal(): void {
  $("#mclose").addEventListener("click", closeModal);
  $("#mcancel").addEventListener("click", closeModal);
  $("#mconfirm").addEventListener("click", () => { onConfirm?.(); closeModal(); });
  $("#overlay").addEventListener("click", (e) => { if ((e.target as HTMLElement).id === "overlay") closeModal(); });
  document.addEventListener("keydown", (e) => { if (e.key === "Escape") closeModal(); });
}
