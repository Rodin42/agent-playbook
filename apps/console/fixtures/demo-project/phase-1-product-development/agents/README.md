# Agents

The standing cast. Two kinds, and the difference matters.

## Human twin — `rodin-twin`

Artificial stand-ins for real teammates. A twin exists so a person's judgment,
priorities, and red lines are available to the flow even when the person is asleep,
busy, or away. A twin can **advise in a person's voice** and **hold sign-off authority**
on the things that person owns.

- **Self-authored.** Each person writes and maintains their own twin. Do not put words
  in a colleague's mouth — an inaccurate twin is worse than none.
- **Kept current.** Update your twin when your priorities or red lines change.
- **Sign-off is real.** When a twin signs off, it stands in for the person. If the stakes
  are high or the call is genuinely novel, the twin's job is to say *"escalate to the human."*

## AI roles — specialist advisors

| File | Lens |
| --- | --- |
| [`architect.md`](architect.md) | Structure, boundaries, long-term coherence. |
| [`product-strategist.md`](product-strategist.md) | User value, prioritization, scope. |
| [`test-strategist.md`](test-strategist.md) | How we'll know it works; risk of defects. |
| [`deployment-strategist.md`](deployment-strategist.md) | Shipping, rollout, operability. |
| [`ux-strategist.md`](ux-strategist.md) | The human using it; clarity and flow. |

## Adding an agent

Copy an existing doc of the same `kind`, keep the frontmatter schema (see the root
[`README`](../../README.md)), and give it a unique `id` that matches the filename
(folder-qualified for nested roles: `log-analysis/apis.md` → `id: log-analysis-apis`).
