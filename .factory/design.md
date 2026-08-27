# Visual thesis — The night conservatory

## Direction and rationale

**Surreal editorial scenery, single-mode.** A learner returning to an old deck is not standing before a red inbox; they are entering a night conservatory where neglected specimens can still be carried into the light, a few at a time. The scenery makes the product's model legible: cards sit in a dark backlog valley, high-risk specimens glow coral, and an amber footbridge represents a bounded path back to ordinary review. It is humane, quiet, and specific to recovery—not a generic productivity dashboard.

The interface is deliberately single-mode. A painted midnight background makes the return feel calm and private, while warm paper surfaces keep all working text bright and readable. This is a focused planning instrument, so there is no theme switch or decorative gradient hero.

## Palette

| Token | Value | Use |
| --- | --- | --- |
| Midnight | `#101A23` | Page and app chrome |
| Deep moss | `#1D302D` | Recessed scenery, selected controls |
| Paper | `#F2EBDD` | Primary work surfaces |
| Chalk | `#FFF9ED` | Text on dark fields |
| Ink | `#18201F` | Text on paper |
| Muted ink | `#59635F` | Secondary text on paper (≥ 4.5:1) |
| Amber | `#F1B84B` | Primary action and recovery bridge |
| Amber ink | `#251A06` | Text on amber |
| Coral | `#E76850` | High-risk warnings |
| Fern | `#78A884` | Progress and protected material |
| Sky | `#9AC6C5` | Informational details and focus ring |

Status never relies on color: every status includes a label, symbol, or sentence.

## Typography

- **Headings:** Georgia, Cambria, `Times New Roman`, serif. The editorial serif gives the recovery plan the tone of a field guide rather than an admin panel.
- **Interface and data:** Inter-compatible system stack: `ui-sans-serif`, system-ui, Segoe UI, sans-serif. It is fast, native, and numerically clear. No font files or third-party requests.
- Scale: 14 / 16 / 20 / 28 / clamp(40–68) px; body is always at least 16 px. Data uses tabular numerals.

## Layout and spacing

An 8 px base rhythm with 4 px half steps. The shell is 1200 px wide. The opening scene is an asymmetric 5:7 editorial spread: copy and import action on the left, explanatory art on the right. Planning becomes a two-column field desk, and collapses into a strict single column below 800 px. At 390 px, secondary explanation condenses, plan comparison scrolls as a snap strip, and all controls retain 44 px targets.

Paper panels have irregular-but-controlled clipped corners to feel like specimen notes. Thin sky-colored rules and small uppercase labels provide hierarchy before boxes do.

## Interaction grammar

- The primary journey is linear and visible: **Bring cards → Set your pace → Choose a route → Carry the list back**.
- Completed stages become compact field-note summaries and can be reopened without data loss.
- Plan choices behave as radio controls. The chosen route raises by 4 px and reveals its reasoning and export action.
- Risk rows disclose why a card is elevated (lateness, lapses, young interval) in plain language.
- Any import replacement or local-data deletion is confirmed with exact consequences. Export is always non-destructive.

## Motion policy

UI transitions last 180–260 ms and animate only opacity and transform. The hero's card specimens settle into place once on load, and the selected plan lifts from its source. Nothing loops. With `prefers-reduced-motion: reduce`, transforms and scrolling animations are removed and state changes are instant; hierarchy remains through scale, borders, and contrast.

## Asset plan and provenance

### Hero: `recovery-conservatory`

- Subject: an impossible botanical conservatory at night, with paper flashcards growing like labeled leaves along a narrow amber footbridge from a shadowed pile toward a calm lit reading table; no humans.
- World/materials: cut-paper editorial diorama, tactile fibers, ink, brass pins, subtle halftone grain.
- Light/lens: moonlit wide scene, warm pool of desk light, slightly elevated three-quarter view, generous negative space, crisp silhouette.
- Palette words: midnight blue-black, deep moss, warm paper, restrained coral, amber, dusty sky.
- Negative list: no text, no letters, no numbers, no watermark, no logos, no UI screenshot, no realistic people, no hands, no brand symbols, no glossy 3D render, no neon gradient.
- Generation: Azure OpenAI factory image deployment via `/opt/fleet/lib/gen-image.sh`, 2026-08-27. Original generated asset for this product. The exact prompt is stored beside the source asset in `assets/src/recovery-conservatory.json`.
- Delivery: reviewed source retained under `assets/src/`; responsive WebP hero variants, each ≤ 300 KB. Generated imagery is disclosed in the footer.

Icons (upload, clock, route, download, warning) are original inline SVG line drawings using current color. PWA icons are hand-authored geometric SVG-derived marks: three paper leaves crossing an amber bridge.
