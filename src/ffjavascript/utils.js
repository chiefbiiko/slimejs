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
  