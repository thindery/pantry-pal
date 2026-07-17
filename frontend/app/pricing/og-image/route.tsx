import { ImageResponse } from "next/og";

export const runtime = "edge";

export async function GET() {
  return new ImageResponse(
    (
      <div
        style={{
          background: "linear-gradient(135deg, #f093fb 0%, #f5576c 100%)",
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "60px",
          color: "white",
        }}
      >
        <div
          style={{
            fontSize: 64,
            fontWeight: "bold",
            marginBottom: "20px",
            textAlign: "center",
          }}
        >
          Simple, Transparent Pricing
        </div>
        <div
          style={{
            fontSize: 36,
            textAlign: "center",
            opacity: 0.9,
          }}
        >
          Free • Pro $4.99/mo • Family $7.99/mo
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
    }
  );
}
