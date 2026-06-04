import fs from "fs";
import { ImageResponse } from "next/og";
import path from "path";

export const alt = "routar – Schema-first HTTP API client";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OgImage() {
  const fontsDir = path.join(process.cwd(), "public", "fonts");
  const regular = fs.readFileSync(path.join(fontsDir, "Geist-Regular.ttf"));
  const bold = fs.readFileSync(path.join(fontsDir, "Geist-Bold.ttf"));
  const logo = fs.readFileSync(
    path.join(process.cwd(), "public/routar-logo_full.png"),
  );

  const logoSrc = `data:image/png;base64,${logo.toString("base64")}`;

  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: "Geist, system-ui, sans-serif",
        padding: "60px",
        backgroundColor: "#101010",
        backgroundImage: `
          linear-gradient(to bottom, rgba(99,102,241,0.15) 0%, transparent 70%),
          linear-gradient(to right, rgba(168,85,247,0.12) 0%, transparent 70%),
        `,
      }}
    >
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: "24px",
        }}
      >
        {/** biome-ignore lint/performance/noImgElement: dynamic image */}
        <img src={logoSrc} alt="routar" width={500} height={180} />
        <div
          style={{
            fontSize: "30px",
            fontWeight: 400,
            color: "rgb(132, 99, 241)",
            textAlign: "center",
          }}
        >
          Schema-first HTTP API client
        </div>
        <div
          style={{
            display: "flex",
            gap: "16px",
            marginTop: "12px",
          }}
        >
          {["End-to-end types", "Runtime validation", "Transport agnostic"].map(
            (tag) => (
              <div
                key={tag}
                style={{
                  background: "rgba(129, 140, 248, 0.15)",
                  border: "1px solid rgba(129, 140, 248, 0.3)",
                  borderRadius: "999px",
                  padding: "8px 20px",
                  fontSize: "18px",
                  fontWeight: 400,
                  color: "rgb(132, 99, 241)",
                }}
              >
                {tag}
              </div>
            ),
          )}
        </div>
      </div>
    </div>,
    {
      ...size,
      fonts: [
        { name: "Geist", data: regular, weight: 400, style: "normal" },
        { name: "Geist", data: bold, weight: 700, style: "normal" },
      ],
    },
  );
}
