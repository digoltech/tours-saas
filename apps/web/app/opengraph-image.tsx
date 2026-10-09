import { ImageResponse } from "next/og";

export const alt = "Digol TravelOS: bus booking and travel agency management software";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    <div style={{ display: "flex", width: "100%", height: "100%", flexDirection: "column", justifyContent: "space-between", background: "#faf7f2", color: "#242124", padding: "68px", fontFamily: "sans-serif" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 70, height: 70, background: "#b4212b", color: "white", borderRadius: 18, fontSize: 42, fontWeight: 700 }}>D</div>
        <div style={{ display: "flex", fontSize: 38, fontWeight: 700 }}>Digol TravelOS</div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
        <div style={{ display: "flex", fontSize: 64, lineHeight: 1.1, fontWeight: 700, maxWidth: 1020 }}>Bus booking &amp; travel agency management</div>
        <div style={{ display: "flex", fontSize: 27, color: "#655e60" }}>Trips · Seats · Fleet · Branch teams · Finance</div>
      </div>
      <div style={{ display: "flex", color: "#b4212b", fontSize: 22 }}>Built by Digol Tours for travel operations.</div>
    </div>, size,
  );
}
