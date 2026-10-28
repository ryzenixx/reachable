import { render, toPlainText } from "react-email";
import type { ReactElement } from "react";
import { readFile } from "node:fs/promises";
import { logoContentId } from "./assets";
import type { PageEmailBrand } from "../../branding/email";

export async function renderEmail(template: ReactElement, brand?: PageEmailBrand) {
  const html = await render(template);
  if (brand) return { html, text: toPlainText(html), inlineImages: brand.logo
    ? [{ filename: "logo.png", content: brand.logo, cid: "page-logo@reachable" }] : [] };
  const logo = await readFile(new URL("./assets/reachable-logo.png", import.meta.url));
  return { html, text: toPlainText(html), inlineImages: [{ filename: "reachable-logo.png", content: logo, cid: logoContentId }] };
}
