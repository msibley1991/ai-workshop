// The tool a visitor works in, for Nora's task slides. Everyone runs the same
// prompts in the tool they like; the choice made on N07 is remembered and the
// task slides show that tool's notes. "neutral" shows none: it's what Nora
// presents in. Every note keeps where it came from (`sources`), checked
// 26 Nov 2026; `rules`, `stage2` and `stage4` are the tool's one line on N08, N10 and N12; "tested" is Nora's own run of the four prompts on the free plan.
const KEY = "nora-tool";

export const TOOLS = [
  { id: "neutral", name: "Neutral" },
  {
    id: "v0", name: "v0", kind: "Website generator", url: "https://v0.app",
    rules: "Sign in with Vercel, the company that makes v0.",
    stage2: "Attach the four files one by one.",
    stage4: "This is message 4 of about 7 today.",
    notes: ["Free: $5 of credits a month, about 7 messages a day.", "Signing in needs a Vercel account. Vercel makes v0.", "Leave manual editing alone: it uses credits."],
    sources: [
      { text: "vercel.com/blog/updated-v0-pricing", url: "https://vercel.com/blog/updated-v0-pricing" },
      { text: "costbench.com: 7 a day, not confirmed by v0", url: "https://costbench.com/software/ai-coding-assistants/v0-vercel/free-plan/" },
    ],
    tested: true,
  },
  {
    id: "lovable", name: "Lovable", kind: "Website generator", url: "https://lovable.dev",
    rules: "5 credits today: four prompts, one spare.",
    stage2: "Attach the four files one by one.",
    stage4: "This is credit 4 of 5 today.",
    notes: ["Free: 5 build credits a day, 30 a month.", "Four prompts fit, with one credit to spare."],
    sources: [{ text: "docs.lovable.dev: plans and credits", url: "https://docs.lovable.dev/introduction/plans-and-credits" }],
    tested: false,
  },
  {
    id: "chatgpt", name: "ChatGPT", kind: "Chat assistant", url: "https://chatgpt.com",
    rules: "3 uploads today. Stage 2 uses one.",
    stage2: "Upload the zip. It counts as one of your three files.",
    notes: ["Free: 3 file uploads a day.", "So stage 2 goes up as one zip."],
    sources: [{ text: "help.openai.com: file uploads FAQ", url: "https://help.openai.com/en/articles/8555545-file-uploads-faq" }],
    tested: true,
  },
  {
    id: "claude", name: "Claude", kind: "Chat assistant", url: "https://claude.ai",
    stage2: "The zip or the four files: both work.",
    notes: ["Free: about 20 files per chat."],
    sources: [{ text: "engadget.com: not an official page", url: "https://engadget.com/2185772/claude-ai-free-2026-limits-workarounds/" }],
    tested: true,
  },
];

export function getTool() {
  try { const id = localStorage.getItem(KEY); return TOOLS.some((t) => t.id === id) ? id : "neutral"; } catch { return "neutral"; }
}
export function setTool(id) {
  try { localStorage.setItem(KEY, id); } catch { /* private mode: the choice lasts for this page only */ }
  current = id;
  window.dispatchEvent(new Event("nora:tool")); // kit.js rewrites the notes in the DOM
}
// Read once, then kept here, so a frame doesn't touch localStorage.
let current = getTool();
export const tool = () => TOOLS.find((t) => t.id === current) ?? TOOLS[0];
