import { ImageResponse } from "next/og";
export const alt =
  "PathSafe NWA — infrastructure-aware walking routes in Bentonville";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export default function OpenGraphImage() {
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        background: "#f8f8f3",
        padding: "68px",
        color: "#253a33",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          fontSize: 34,
          fontWeight: 700,
          gap: 18,
        }}
      >
        <div
          style={{
            display: "flex",
            background: "#19664f",
            color: "white",
            borderRadius: 12,
            width: 64,
            height: 64,
            alignItems: "center",
            justifyContent: "center",
            fontSize: 36,
          }}
        >
          P
        </div>
        PathSafe NWA
      </div>
      <div
        style={{
          display: "flex",
          fontSize: 68,
          fontWeight: 700,
          marginTop: 76,
          letterSpacing: -2,
        }}
      >
        A better-informed walk.
      </div>
      <div
        style={{
          display: "flex",
          fontSize: 36,
          marginTop: 25,
          color: "#19664f",
        }}
      >
        Infrastructure-aware walking routes.
      </div>
      <div
        style={{
          display: "flex",
          fontSize: 25,
          marginTop: "auto",
          color: "#66716b",
        }}
      >
        Compare mapped pedestrian infrastructure in Bentonville.
      </div>
    </div>,
    size,
  );
}
