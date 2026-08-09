"use client";

export function SkipLink() {
  return <a className="skip-link" href="#main-content" onClick={(event) => { const main = document.querySelector("main"); if (!main) return; event.preventDefault(); main.id = "main-content"; main.tabIndex = -1; main.focus({ preventScroll: true }); main.scrollIntoView({ block: "start" }); }}>Skip to main content</a>;
}
