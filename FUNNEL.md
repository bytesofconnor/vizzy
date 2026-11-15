# Funnel

Owners read the last seven UTC days at `/admin/funnel`. Each step shows a count, the rate against the step above, and the rate against visits.

Each count is how many times that step fired. A later step can happen without the earlier one, so a rate can pass 100%. A blank rate means the previous step was zero.

Events carry no email, wallet token, chart title, prompt, or slug. The only property is `auth` on `first_chart`, and it is `signed_in` or `signed_out`. Anything else is dropped.

`track(event, props)` is the one writer. Server code imports it from `apps/share/lib/track.ts`. Browser code imports it from `apps/share/lib/funnel-browser.ts`. Both write the same daily counters.

```ts
import { track } from './track';

await track('signup');
await track('first_chart', { auth: 'signed_out' });
```

```ts
import { track, trackFirstChart, trackUpgradeView } from './funnel-browser';

track('share_created');
trackFirstChart('signed_in');
trackUpgradeView();
```

A visit counts once per browser session. A first chart counts once per browser for signed out, and once more after sign-in. An upgrade view counts once per session, when the composer shows the buy offer.

| Event | When it counts |
| --- | --- |
| `visit` | A browser session opens any page. |
| `first_chart` | The first chart that browser renders, split by `auth`. |
| `signup` | Google sign-in succeeds. A return visit counts again. |
| `library_save` | A signed-in compose or publish is written to the library. |
| `share_created` | Someone shares the chart link, or copies a Markdown or HTML embed. |
| `shared_view` | Someone opens a `/c/` chart page. |
| `shared_compose` | From that page, they remix the chart or follow the wordmark home. |
| `free_limit` | Compose or publish is refused because the free charts are used. |
| `upgrade_view` | The composer shows the buy offer. |
| `checkout_started` | Stripe Checkout is created. |
| `paid` | A new paid pack is credited. A duplicate webhook does not count. |

Call `track` from new share, paywall, and gallery work. Do not invent a second name for the same step.
