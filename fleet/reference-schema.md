# Product reference schema

One file per app: `websites/<app>_mock/reference/product-reference.json`.

It states what the **real product** shows, so the mock can be scored against something other than
its own authors' memory. It is not a description of the mock.

```jsonc
{
  "product": "Slack",
  "captured": "2026-08-18",
  "method": "How this was established. Name the sources.",
  "entry_screen": {
    "title": "What the real product opens on",
    "primary_nav": ["..."],          // top-level navigation, in order
    "confidence": "sourced | partially_sourced | inferred"
  },
  "surfaces": [
    {
      "id": "channel_view",
      "title": "As the product labels it",
      "route_shape": "/client/:workspace/:channel",
      "columns_default": ["..."],    // for list/table surfaces; [] otherwise
      "columns_optional": ["..."],   // behind a preferences/column control
      "tabs": ["..."],               // in the product's own order
      "primary_actions": ["..."],    // buttons on the surface itself
      "actions_menu": ["..."],       // items behind a … / Actions / context menu
      "controls": ["filter", "bulk_select", "pagination", "preferences", "tabs"],
      "confidence": {
        "columns_default": "inferred",
        "tabs": "sourced",
        "primary_actions": "partially_sourced"
      }
    }
  ],
  "state_dependent_rules": [
    {
      "action": "Archive channel",
      "available_when": "the user is a workspace admin",
      "unavailable_when": "the channel is the default #general",
      "confidence": "sourced"
    }
  ],
  "gaps": [
    "What could not be established, and why. This section is required and must not be empty
     unless every field above is `sourced`."
  ]
}
```

## Confidence, and why it decides the score

- `sourced` — read from the live product, or from a document that names it **verbatim**.
- `partially_sourced` — part named, the rest inferred; say which part in `method` or `gaps`.
- `inferred` — reconstructed from general knowledge.

The fidelity index reports a figure over all requirements and a second over `sourced` ones only.
Marking something `sourced` that was actually remembered corrupts the defensible number, which is
the only one worth anything. **An honest `inferred` is worth more than a confident guess**, and a
reference that is mostly `inferred` is a perfectly good result — it says where to look next.

## What not to do

Do not describe the mock. Do not fill a field because the schema has it — omit it and say so in
`gaps`. Do not invent tab names, column names, or menu items; a fabricated requirement is worse
than a missing one, because the mock will be built to match it and will drift from the product.
