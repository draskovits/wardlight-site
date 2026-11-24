// llms.txt (the summary at the repo root, with {{guide}} and {{posts}} filled in) and llms-full.txt (that plus the
// whole game guide and every post as text).
import fs from "node:fs";
import path from "node:path";
import { getPosts, plainText } from "./posts";
import { getGuide } from "./guide";
import { SITE } from "./site";

const template = () => fs.readFileSync(path.join(process.cwd(), "llms.txt"), "utf8");
const posts = () => getPosts().filter((p) => !p.pending);
const postList = () => posts().map((p) => `- [${p.title}](${SITE}${p.url}): ${p.description}`).join("\n") || "- (none yet)";
const guideList = () => getGuide().map((g) => `- [${g.title}](${SITE}${g.url}): ${g.description}`).join("\n") || "- (none yet)";

export const llms = () => template().replace("{{guide}}", guideList()).replace("{{posts}}", postList());
export const llmsFull = () => llms()
  + "\n\n" + getGuide().map((g) => `---\n\n# Game guide: ${g.title}\n\n${SITE}${g.url}${g.updated ? ` · numbers as of ${g.updated}` : ""}\n\n${plainText(g.html)}`).join("\n\n")
  + "\n\n" + posts().map((p) => `---\n\n# ${p.title}\n\n${SITE}${p.url} · ${p.date}\n\n${plainText(p.html)}`).join("\n\n") + "\n";
