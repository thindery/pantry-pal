import { mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

/**
 * PP-149: a fake webcam for Chromium. Writes a Y4M video whose frames show an
 * EAN-13 barcode, for `--use-file-for-fake-video-capture`. Generated at test
 * time, so no binary fixture lives in git and no real camera is used.
 */
const L = ["0001101", "0011001", "0010011", "0111101", "0100011", "0110001", "0101111", "0111011", "0110111", "0001011"];
const G = ["0100111", "0110011", "0011011", "0100001", "0011101", "0111001", "0000101", "0010001", "0001001", "0010111"];
const PARITY = ["LLLLLL", "LLGLGG", "LLGGLG", "LLGGGL", "LGLLGG", "LGGLLG", "LGGGLL", "LGLGLG", "LGLGGL", "LGGLGL"];

function invert(bits: string): string {
  return [...bits].map((b) => (b === "1" ? "0" : "1")).join("");
}

export function ean13Modules(code: string): string {
  if (!/^\d{13}$/.test(code)) throw new Error("EAN-13 needs 13 digits");
  const digits = [...code].map(Number);
  const parity = PARITY[digits[0]];
  let bits = "101";
  for (let i = 1; i <= 6; i++) bits += parity[i - 1] === "L" ? L[digits[i]] : G[digits[i]];
  bits += "01010";
  for (let i = 7; i <= 12; i++) bits += invert(L[digits[i]]);
  return bits + "101";
}

export function writeBarcodeY4m(code: string, width = 640, height = 480): string {
  const modules = ean13Modules(code);
  const moduleWidth = Math.floor((width * 0.8) / modules.length);
  const left = Math.floor((width - modules.length * moduleWidth) / 2);
  const top = Math.floor(height * 0.2);
  const bottom = Math.floor(height * 0.8);
  const y = Buffer.alloc(width * height, 235);
  for (let row = top; row < bottom; row++) {
    for (let m = 0; m < modules.length; m++) {
      if (modules[m] !== "1") continue;
      const start = row * width + left + m * moduleWidth;
      y.fill(16, start, start + moduleWidth);
    }
  }
  const chroma = Buffer.alloc((width / 2) * (height / 2), 128);
  const frame = Buffer.concat([Buffer.from("FRAME\n"), y, chroma, chroma]);
  const header = Buffer.from(`YUV4MPEG2 W${width} H${height} F10:1 Ip A1:1 C420jpeg\n`);
  const dir = join(tmpdir(), "pantry-hub-e2e");
  mkdirSync(dir, { recursive: true });
  const path = join(dir, `barcode-${code}.y4m`);
  writeFileSync(path, Buffer.concat([header, frame, frame, frame, frame]));
  return path;
}
