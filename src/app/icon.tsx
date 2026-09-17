import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";

export const size = { width: 512, height: 512 };
export const contentType = "image/png";

export default async function Icon() {
  const photo = await readFile(join(process.cwd(), "public/photos/kenya-04.png"));
  const src = `data:image/png;base64,${photo.toString("base64")}`;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          background: "#f6f1de",
        }}
      >
        <img
          src={src}
          alt=""
          width={512}
          height={512}
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
            objectPosition: "center 12%",
          }}
        />
      </div>
    ),
    { ...size },
  );
}
