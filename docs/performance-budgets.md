# Production performance budgets

These budgets are release gates for the main Today journey on a mid-range mobile device over simulated 4G.

| Metric                        |   Budget |
| ----------------------------- | -------: |
| Largest Contentful Paint      |  ≤ 2.5 s |
| Interaction to Next Paint     | ≤ 200 ms |
| Cumulative Layout Shift       |   ≤ 0.10 |
| Initial compressed JavaScript | ≤ 250 KB |
| Initial compressed CSS        |  ≤ 80 KB |
| Above-the-fold image payload  | ≤ 300 KB |

The 3D character scene remains lazy-loaded and presentation modes never alter progression data. Minimal mode disables decorative surfaces and non-essential animation. Each production build must be reviewed for chunk growth; any budget exception needs a written reason and a follow-up issue.
