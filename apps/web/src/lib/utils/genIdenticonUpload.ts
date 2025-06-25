import { utapi } from "../services/uploadthing/server";
import sharp from "sharp";

export async function genIdenticonUpload(str: string, type?: string) {
  const identicon = await fetch(`https://api.dicebear.com/9.x/identicon/svg?seed=${str}&size=256`);
  const webpBuffer = await sharp(await identicon.arrayBuffer())
    .webp({ quality: 80 })
    .toBuffer();

  const file = new File([webpBuffer], `${str}${type ? `-${type}` : ""}.webp`, {
    type: "image/webp",
  });
  const ul = await utapi.uploadFiles(file);
  if (ul.error) {
    throw new Error("Failed to upload identicon: " + ul.error);
  }

  return ul.data?.ufsUrl
}