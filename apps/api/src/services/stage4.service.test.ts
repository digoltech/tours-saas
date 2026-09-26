import { describe, expect, test } from "bun:test";
import { postProviderMessage } from "./stage4.service.js";

describe("provider-neutral notification adapter", () => {
  test("sends the documented payload with bearer authentication", async () => {
    let captured: RequestInit | undefined;
    const mockFetch = async (_input: string, init: RequestInit) => {
      captured = init;
      return new Response(null, { status: 202 });
    };
    await postProviderMessage(
      "https://provider.example/send",
      "secret",
      "WHATSAPP",
      "+15550001111",
      "Ticket",
      "Booking confirmed",
      mockFetch,
    );
    expect(captured?.method).toBe("POST");
    expect(new Headers(captured?.headers).get("authorization")).toBe(
      "Bearer secret",
    );
    expect(JSON.parse(String(captured?.body))).toEqual({
      to: "+15550001111",
      subject: "Ticket",
      message: "Booking confirmed",
      channel: "whatsapp",
    });
  });

  test("records non-success provider responses as delivery failures", async () => {
    const mockFetch = async () => new Response("Unavailable", { status: 503 });
    await expect(
      postProviderMessage(
        "https://provider.example/send",
        "secret",
        "SMS",
        "+15550001111",
        "Ticket",
        "Booking confirmed",
        mockFetch,
      ),
    ).rejects.toThrow("SMS provider returned HTTP 503");
  });
});
