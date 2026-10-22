import { describe, it, expect } from "vitest";
import { packBits } from "../src/pack.js";
import type { Panel } from "../src/types.js";

const brightPanel: Panel = {
  id: "test",
  name: "Test",
  width: 10,
  height: 10,
  pixelShape: "square",
  tint: "#fff",
  category: "oled",
  oneIs: "bright",
  notes: "",
};

// 10×10 image, 6 white pixels: A(0,0) B(7,0) C(8,0) D(9,1) E(0,8) F(9,9)
function make10x10(): Uint8Array {
  const data = new Uint8Array(100);
  data[0 * 10 + 0] = 255; // A
  data[0 * 10 + 7] = 255; // B
  data[0 * 10 + 8] = 255; // C
  data[1 * 10 + 9] = 255; // D
  data[8 * 10 + 0] = 255; // E
  data[9 * 10 + 9] = 255; // F
  return data;
}

describe("golden vectors - 10×10, 6 white pixels, oneIs=bright", () => {
  const data = make10x10();

  it("row-msb", () => {
    const packed = packBits(data, 10, 10, "row-msb", brightPanel, false);
    expect(packed.length).toBe(20);
    expect(packed[0]).toBe(0x81);
    expect(packed[1]).toBe(0x80);
    expect(packed[2]).toBe(0x00);
    expect(packed[3]).toBe(0x40);
    for (let i = 4; i < 16; i++) expect(packed[i]).toBe(0x00);
    expect(packed[16]).toBe(0x80);
    expect(packed[17]).toBe(0x00);
    expect(packed[18]).toBe(0x00);
    expect(packed[19]).toBe(0x40);
  });

  it("row-lsb", () => {
    const packed = packBits(data, 10, 10, "row-lsb", brightPanel, false);
    expect(packed.length).toBe(20);
    expect(packed[0]).toBe(0x81);
    expect(packed[1]).toBe(0x01);
    expect(packed[2]).toBe(0x00);
    expect(packed[3]).toBe(0x02);
    expect(packed[16]).toBe(0x01);
    expect(packed[17]).toBe(0x00);
    expect(packed[18]).toBe(0x00);
    expect(packed[19]).toBe(0x02);
  });

  it("page-vertical", () => {
    const packed = packBits(data, 10, 10, "page-vertical", brightPanel, false);
    expect(packed.length).toBe(20);
    expect(packed[0]).toBe(0x01);
    for (let i = 1; i <= 6; i++) expect(packed[i]).toBe(0x00);
    expect(packed[7]).toBe(0x01);
    expect(packed[8]).toBe(0x01);
    expect(packed[9]).toBe(0x02);
    expect(packed[10]).toBe(0x01);
    for (let i = 11; i <= 18; i++) expect(packed[i]).toBe(0x00);
    expect(packed[19]).toBe(0x02);
  });

  it("invert flips non-zero bytes, padding stays 0", () => {
    const packed = packBits(data, 10, 10, "row-msb", brightPanel, true);
    expect(packed[0]).toBe(0x7e);
    expect(packed[1]).toBe(0x40);
  });
});
