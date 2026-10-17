import { useState, type ReactElement } from "react";
import { AnimatedBrand, BRAND_ANIMATIONS, type BrandAnimation, type BrandMode } from "@bmsuisse/ui";
import "./BrandMotionDemo.css";

const PRODUCTS = ["Hub", "Brain", "Docs", "Product"];
const MODES: { value: BrandMode; label: string; description: string }[] = [
  { value: "full", label: "Full name", description: "One + your product" },
  { value: "one", label: "One", description: "The shared wordmark" },
  { value: "mark", label: "O", description: "The compact mark" },
];
const MOTION_DESCRIPTIONS: Record<BrandAnimation, string> = {
  bounce: "A playful arrival, one bounce at a time.",
  orbit: "A circle around the mark before coming home.",
  impact: "A quick entrance with a soft landing.",
  liquid: "One shape separates into the signature.",
  signature: "A solid dot opens into the familiar O.",
  burst: "A little energy, then everything settles.",
  gravity: "A gentle press and an elastic release.",
};

export function BrandMotionDemo(): ReactElement {
  const [product, setProduct] = useState("Brain");
  const [mode, setMode] = useState<BrandMode>("full");
  const [animation, setAnimation] = useState<BrandAnimation | "random">("bounce");
  const [replay, setReplay] = useState(0);
  const [dark, setDark] = useState(false);
  const selectedMotion = BRAND_ANIMATIONS.find((motion) => motion.id === animation);
  const snippet = `<AnimatedBrand\n  product=${JSON.stringify(product)}\n  mode="${mode}"\n  animation="${animation}"\n  size={80}\n/>`;

  return (
    <main className={`brand-demo${dark ? " brand-demo--dark" : ""}`}>
      <div className="brand-demo__layout">
        <header className="brand-demo__header">
          <a className="brand-demo__home" href="./">bmsui <span>/ Brand motion</span></a>
          <button className="brand-demo__text-button" type="button" onClick={() => setDark(!dark)}>
            {dark ? "Light background" : "Dark background"}
          </button>
        </header>

        <section className="brand-demo__intro">
          <h1>One identity. Your product.</h1>
          <p>Choose a name, a mark, and a little movement.</p>
        </section>

        <section className="brand-demo__workspace" aria-label="Brand animation playground">
          <div className="brand-demo__preview-column">
            <div className="brand-demo__stage" aria-label="Selected brand preview">
              <div className="brand-demo__stage-logo">
                <AnimatedBrand product={product} mode={mode} animation={animation} size={80} replayKey={replay} style={{ fontSize: "clamp(32px, 6vw, 80px)" }} />
              </div>
              <div className="brand-demo__stage-footer">
                <span>{selectedMotion?.label ?? "A different motion each time"}</span>
                <button className="brand-demo__replay" type="button" onClick={() => setReplay((value) => value + 1)}>
                  <svg viewBox="0 0 20 20" fill="none" aria-hidden="true"><path d="M4 6.5A6.5 6.5 0 1 1 3.5 12M4 2.5v4.5h4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
                  Replay
                </button>
              </div>
            </div>
            <section className="brand-demo__family" aria-label="Product examples">
              {PRODUCTS.map((name) => (
                <button key={name} type="button" aria-label={`Choose One${name}`} aria-pressed={product === name} onClick={() => setProduct(name)}>
                  <AnimatedBrand product={name} mode="full" autoPlay={false} size={23} />
                </button>
              ))}
            </section>
          </div>

          <aside className="brand-demo__controls" aria-label="Preview settings">
            <fieldset className="brand-demo__field">
              <legend>Product name</legend>
              <div className="brand-demo__presets">
                {PRODUCTS.map((name) => <button key={name} type="button" aria-pressed={product === name} onClick={() => setProduct(name)}>{name}</button>)}
              </div>
              <label className="brand-demo__input-label" htmlFor="brand-product">Or make it yours</label>
              <div className="brand-demo__input-wrap"><span aria-hidden="true">One</span><input id="brand-product" value={product} maxLength={24} placeholder="Your product" onChange={(event) => setProduct(event.target.value)} /></div>
            </fieldset>
            <fieldset className="brand-demo__field">
              <legend>Wordmark</legend>
              <div className="brand-demo__modes">
                {MODES.map((item) => <button key={item.value} type="button" aria-pressed={mode === item.value} onClick={() => setMode(item.value)}><strong>{item.label}</strong><span>{item.description}</span></button>)}
              </div>
            </fieldset>
            <fieldset className="brand-demo__field">
              <legend>Motion</legend>
              <div className="brand-demo__motions">
                {BRAND_ANIMATIONS.map((motion) => <button key={motion.id} type="button" aria-pressed={animation === motion.id} onClick={() => { setAnimation(motion.id); setReplay((value) => value + 1); }}><span>{motion.label}</span><span className="brand-demo__choice-dot" aria-hidden="true" /></button>)}
                <button type="button" aria-pressed={animation === "random"} onClick={() => { setAnimation("random"); setReplay((value) => value + 1); }}><span>Surprise me</span><span className="brand-demo__choice-dot" aria-hidden="true" /></button>
              </div>
              <p className="brand-demo__motion-note">{animation === "random" ? "Replay to discover another variation." : MOTION_DESCRIPTIONS[animation]}</p>
            </fieldset>
          </aside>
        </section>
        <section className="brand-demo__usage" aria-labelledby="brand-usage-heading">
          <div><h2 id="brand-usage-heading">Made to share.</h2><p>The same component for every One product.<br />Motion respects your reduced motion preference.</p></div>
          <pre aria-label="React usage example"><code>{snippet}</code></pre>
        </section>
      </div>
    </main>
  );
}
