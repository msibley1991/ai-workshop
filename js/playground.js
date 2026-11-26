// playground.html only: builds the tabs' controls (js/controls.js), and on
// localhost the full dial panels for tuning the saved look (js/dev-panels.js).
// js/layout.js runs the accordion and keys.
import { bindControls } from "./controls.js";
import { isLocal } from "./settings.js";

bindControls(document.getElementById("content"));
if (isLocal) import("./dev-panels.js").catch((err) => console.error("[site]", err));
