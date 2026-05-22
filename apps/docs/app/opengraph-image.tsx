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

  return new ImageResponse(
    <div
      style={{
        background:
          "linear-gradient(135deg, #0f0f1a 0%, #1a1a35 50%, #1e1b4b 100%)",
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: "Geist, system-ui, sans-serif",
        padding: "60px",
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
        <div
          style={{
            fontSize: "96px",
            fontWeight: 700,
            letterSpacing: "-4px",
            lineHeight: 1,
            background: "linear-gradient(135deg, #ffffff 0%, #c7d2fe 100%)",
            backgroundClip: "text",
            color: "transparent",
          }}
        >
          routar
        </div>
        <div
          style={{
            fontSize: "30px",
            fontWeight: 400,
            color: "rgba(255,255,255,0.65)",
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
                  color: "#a5b4fc",
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
