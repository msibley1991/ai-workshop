// playground.html only: builds the tabs' controls (js/controls.js). js/layout.js
// runs the accordion and keys, as on lab/genie.html.
import { bindControls } from "./controls.js";

bindControls(document.getElementById("content"));
