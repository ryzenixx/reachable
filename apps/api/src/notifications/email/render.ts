import { render, toPlainText } from "react-email";
import type { ReactElement } from "react";
import { readFile } from "node:fs/promises";
import { logoContentId } from "./assets";

export async function renderEmail(template: ReactElement) {
  const html = await render(template);
  const logo = await readFile(new URL("./assets/reachable-logo.png", import.meta.url));
  return { html, text: toPlainText(html), inlineImages: [{ filename: "reachable-logo.png", content: logo, cid: logoContentId }] };
}
