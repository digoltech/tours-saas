import { describe, expect, test } from "bun:test";
import { decodeDocumentImage } from "./user-documents.service.js";
const png =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jA4sAAAAASUVORK5CYII=";
describe("private user document images", () => {
  test("accepts image bytes with matching PNG, JPEG and WebP signatures", () => {
    expect(decodeDocumentImage("image/png", png).length).toBeGreaterThan(8);
    const jpeg = Buffer.from([255, 216, 255, 224, 0, 0, 255, 217]);
    expect(decodeDocumentImage("image/jpeg", jpeg.toString("base64"))).toEqual(
      jpeg,
    );
    const webp = Buffer.from("RIFF0000WEBP0000");
    expect(decodeDocumentImage("image/webp", webp.toString("base64"))).toEqual(
      webp,
    );
  });
  test("rejects SVG, MIME mismatch, malformed base64, empty and oversized content", () => {
    for (const [mime, content] of [
      ["image/jpeg", png],
      [
        "image/svg+xml",
        Buffer.from("<svg><script>alert(1)</script></svg>").toString("base64"),
      ],
      ["image/png", "!!!!"],
      ["image/png", ""],
      ["image/png", Buffer.alloc(1048577).toString("base64")],
    ])
      expect(() => decodeDocumentImage(mime!, content!)).toThrow();
  });
});
