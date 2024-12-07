// Converts numbers, bigints, BigNumbers, and byte arrays to 0x-prefixed hex.
// For (byte) arrays the len parameter is ignored and no padding is applied.
export function hex(b, len = 32) {
  if (Array.isArray(b) || b instanceof ArrayBuffer || b instanceof Uint8Array) {
    return (
      "0x" +
      Array.from(b)
        .map(i => i.toString(16).padStart(2, "0"))
        .join("")
    )
  } else if (typeof b.toHexString === "function") {
    const h = b.toHexString()
    const d = len - (h.length - 2) / 2
    return d ? "0x" + "00".repeat(d) + h.slice(2) : h
  } else if (typeof b === "bigint" || typeof b === "number") {
    return "0x" + b.toString(16).padStart(len * 2, "0")
  }
}
