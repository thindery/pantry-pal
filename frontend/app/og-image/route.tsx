import { ImageResponse } from "next/og";

export const runtime = "edge";

export async function GET() {
  return new ImageResponse(
    (
      <div
        style={{
          background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
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
            fontSize: 72,
            fontWeight: "bold",
            marginBottom: "20px",
            textAlign: "center",
          }}
        >
          Pantry Hub
        </div>
        <div
          style={{
            fontSize: 40,
            textAlign: "center",
            opacity: 0.9,
            maxWidth: "800px",
          }}
        >
          Smart Home Inventory & Shopping Lists
        </div>
        <div
          style={{
            fontSize: 28,
            marginTop: "40px",
            opacity: 0.8,
          }}
        >
          Track what you have • Know what you need
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
    }
  );
}
