import { describe, it, expect, vi } from "vitest";

// mock env before import
vi.stubEnv("NEXT_PUBLIC_R2_PUBLIC_URL", "https://media.albora.app");

const { alboraImageLoader } = await import("./image-loader");

describe("alboraImageLoader", () => {
  it("returns local path unchanged for relative src", () => {
    expect(alboraImageLoader({ src: "/landing/hero.webp", width: 800 })).toBe(
      "/landing/hero.webp",
    );
  });

  it("builds R2 Image Resizing URL for remote src", () => {
    const url = alboraImageLoader({
      src: "events/abc/uploads/photo.jpg",
      width: 640,
      quality: 80,
    });
    expect(url).toBe(
      "https://media.albora.app/cdn-cgi/image/width=640,quality=80,format=auto/events/abc/uploads/photo.jpg",
    );
  });

  it("defaults quality to 75", () => {
    const url = alboraImageLoader({
      src: "events/abc/uploads/photo.jpg",
      width: 400,
    });
    expect(url).toContain("quality=75");
  });
});
