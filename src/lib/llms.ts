// llms.txt (the summary at the repo root, with {{posts}} filled in) and llms-full.txt (that plus every post as text).
import fs from "node:fs";
import path from "node:path";
import { getPosts, plainText } from "./posts";
import { SITE } from "./site";

const template = () => fs.readFileSync(path.join(process.cwd(), "llms.txt"), "utf8");
const list = () => getPosts().filter((p) => !p.pending).map((p) => `- [${p.title}](${SITE}${p.url}): ${p.description}`).join("\n") || "- (none yet)";

export const llms = () => template().replace("{{posts}}", list());
export const llmsFull = () => llms() + "\n\n" + getPosts().filter((p) => !p.pending)
  .map((p) => `---\n\n# ${p.title}\n\n${SITE}${p.url} · ${p.date}\n\n${plainText(p.html)}`).join("\n\n") + "\n";
