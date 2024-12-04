function fromString(s, radix) {
  if (!radix || radix == 10) {
    return BigInt(s)
  } else if (radix == 16) {
    if (s.slice(0, 2) == "0x") {
      return BigInt(s)
    } else {
      return BigInt("0x" + s)
    }
  }
}

// Pases a buffer with Little Endian Representation
function fromRprLE(buff, o, n8) {
  n8 = n8 || buff.byteLength
  o = o || 0
  const v = new Uint32Array(buff.buffer, buff.byteOffset + o, n8 / 4)
  const a = new Array(n8 / 4)
  v.forEach((ch, i) => (a[a.length - i - 1] = ch.toString(16).padStart(8, "0")))
  return fromString(a.join(""), 16)
}

export function stringifyBigInts(o) {
  if (typeof o === "bigint" || o.eq !== undefined) {
    return o.toString(10)
  } else if (o instanceof Uint8Array) {
    return fromRprLE(o, 0)
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

export function hex(num, len = 32) {
  return "0x" + num.toString(16).padStart(len * 2, "0")
}
