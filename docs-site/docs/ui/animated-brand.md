---
title: Animated brand
---

# Animated brand

`AnimatedBrand` shares the One* identity across products. Set `product` to the
suffix (`"Hub"`, `"Brain"`, `"Docs"`, `"Product"`, or your own name), then choose
whether to display the full wordmark, the O symbol, or One.

```tsx
import { AnimatedBrand } from "@bmsuisse/ui";

<AnimatedBrand product="Hub" mode="full" animation="signature" size={64} />
<AnimatedBrand product="Docs" mode="mark" animation="liquid" size={48} />
<AnimatedBrand product="Product" mode="one" animation="bounce" size={56} />
```

The lettering stays grey and the dot stays red throughout the animation.
The component supplies its own geometry styles; no animation library or extra
stylesheet import is required. It inherits the surrounding font family.

## Props

| Prop | Default | Purpose |
| --- | --- | --- |
| `product` | `"Brain"` | Product suffix, without the One prefix. |
| `mode` | `"full"` | `"full"`, `"mark"` (O), or `"one"` (One). |
| `animation` | `"random"` | A named motion, or a random choice for each playback. |
| `size` | `48` | Wordmark font size in CSS pixels; the mark scales with it. |
| `autoPlay` | `true` | Animate on mount and when playback props change. Set false for a static logo. |
| `replayKey` | — | Change this value to replay without remounting the component. |
| `onComplete` | — | Called after playback or the static reduced-motion fallback. |
| `className`, `style` | — | Style the wrapper, including its text color. |

`BRAND_ANIMATIONS` exposes the available `{ id, label }` pairs for selectors.
The exported `BrandAnimation` and `BrandMode` types describe the options.

## Choose a motion

| ID | Motion |
| --- | --- |
| `bounce` | The dot bounces above the visible letters and lands in the O. |
| `orbit` | The dot orbits the symbol and settles into its centre. |
| `impact` | A quick arrival, a soft recoil, and a settling ring. |
| `liquid` | A red shape stretches and separates into the signature symbol. |
| `signature` | A solid red disc contracts as the grey ring appears. |
| `burst` | A brief radial expansion gathers back into the centre dot. |
| `gravity` | A falling shape compresses, rebounds, and resolves into the symbol. |

Use a finite animation for sign-in and startup; keep navigation logos static
with `autoPlay={false}`. Replay on an explicit interaction rather than a
continuous loop:

```tsx
const [replay, setReplay] = useState(0);

<AnimatedBrand product="Hub" animation="random" replayKey={replay} />
<button onClick={() => setReplay((value) => value + 1)}>Replay</button>
```

The component respects reduced-motion preferences and cancels outstanding
animations when playback changes or the component unmounts. Server rendering
emits a static logo; random motion is chosen in the browser.

The UI demo includes an interactive comparison at `/brand-motion`, with product,
mode and motion selectors, custom product names, and light/dark previews.
