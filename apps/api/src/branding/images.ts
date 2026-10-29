import { createHash } from "node:crypto";
import sharp from "sharp";
import type { AssetKind } from "./validation";

const dimensions: Record<AssetKind, { width: number; height: number }> = {
  logo: { width: 1200, height: 400 },
  dark_logo: { width: 1200, height: 400 },
  favicon: { width: 256, height: 256 },
  social_image: { width: 1200, height: 630 },
  email_logo: { width: 640, height: 200 },
};

export async function prepareImage(input: Buffer, kind: AssetKind) {
  if (!input.length || input.length > 2 * 1024 * 1024) return undefined;
  const png = input.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
  const jpeg = input[0] === 0xff && input[1] === 0xd8 && input[2] === 0xff;
  const webp =
    input.subarray(0, 4).toString("ascii") === "RIFF" &&
    input.subarray(8, 12).toString("ascii") === "WEBP";
  if (!png && !jpeg && !webp) return undefined;
  try {
    const source = sharp(input, {
      limitInputPixels: 16_000_000,
      failOn: "warning",
      animated: false,
    });
    const info = await source.metadata();
    if (
      !info.width ||
      !info.height ||
      !["png", "jpeg", "webp"].includes(info.format ?? "") ||
      (info.pages ?? 1) > 1
    )
      return undefined;
    const content = await source
      .autoOrient()
      .resize({ ...dimensions[kind], fit: "inside", withoutEnlargement: true })
      .png()
      .toBuffer();
    if (content.length > 2 * 1024 * 1024) return undefined;
    return { content, digest: createHash("sha256").update(content).digest("hex") };
  } catch {
    return undefined;
  }
}
