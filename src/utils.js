// Converts numbers, bigints, BigNumbers, and byte arrays to 0x-prefixed hex.
// For (byte) arrays the len parameter is ignored and no padding is applied.
export function hex(b, len = 32) {
  if (Array.isArray(b) || b instanceof ArrayBuffer || b instanceof Uint8Array) {
    return "0x" + Array.from(b).map(i => i.toString(16).padStart(2, '0')).join('')
  } else if (typeof b.toHexString === "function") {
    const h = b.toHexString()
    const d = len - ((h.length - 2) / 2)
    return d ? "0x" + "00".repeat(d) + h.slice(2) : h
  } else if (typeof b === "bigint" || typeof b === "number") {
    return "0x" + b.toString(16).padStart(len * 2, "0")
  }
}

// Pases a buffer with Little Endian Representation
function fromRprLE(buf, o = 0, n8 = buf.byteLength) {
  const v = new Uint32Array(buf.buffer, buf.byteOffset + o, n8 / 4)
  const a = new Array(n8 / 4)
  v.forEach((ch, i) => (a[a.length - i - 1] = ch.toString(16).padStart(8, "0")))
  return BigInt("0x" + a.join(""))
}

// Stringifies bigints, bignumbers and numbers (also Uint8Arrays in LE order).
// Non-Uint8Arrays are not read as one scalar but as array of scalars to be stringified.
// For objects and arrays we do a depth-first traversal of inner items.
export function stringifyBigInts(o) {
  if (typeof o === "bigint" || typeof o === "number" || o.eq !== undefined) {
    //BigNumber
    return o.toString()
  } else if (o instanceof Uint8Array) {
    return fromRprLE(o, 0).toString()
  } else if (Array.isArray(o)) {
    return o.map(stringifyBigInts)
  } else if (typeof o === "object") {
    const res = {}
    const keys = Object.keys(o)
    keys.forEach(k => {
      res[k] = stringifyBigInts(o[k])
    })
    return res
  } else {
    return o
  }
}
