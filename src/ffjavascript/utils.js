// Pases a buffer with Little Endian Representation
function fromRprLE(buf, o = 0, n8 = buf.byteLength) {
  const v = new Uint32Array(buf.buffer, buf.byteOffset + o, n8 / 4)
  const a = new Array(n8 / 4)
  v.forEach((ch, i) => (a[a.length - i - 1] = ch.toString(16).padStart(8, "0")))
  return BigInt("0x" + a.join(""))
}

// Stringifies bigints, bignumbers and numbers (also Uint8Arrays in LE order).
// Non-Uint8 arrays are not read as one scalar but as array of scalars to be stringified.
// For objects and arrays we do a depth-first traversal of inner items.
export function stringifyBigInts(o) {
  if (typeof o === "bigint" || typeof o === "number" || o.eq !== undefined) {
    // the .eq check is a duck for BigNumber
    return o.toString()
  } else if (o instanceof Uint8Array) {
    return fromRprLE(o, 0).toString() // was w/o .toString()
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

export function unstringifyBigInts(o) {
  if (typeof o === "string" && /^[0-9]+$/.test(o)) {
    return BigInt(o)
  } else if (typeof o === "string" && /^0x[0-9a-fA-F]+$/.test(o)) {
    return BigInt(o)
  } else if (Array.isArray(o)) {
    return o.map(unstringifyBigInts)
  } else if (typeof o === "object") {
    if (o === null) return null
    const res = {}
    const keys = Object.keys(o)
    keys.forEach(k => {
      res[k] = unstringifyBigInts(o[k])
    })
    return res
  } else {
    return o
  }
}

export function leInt2Buff(n, len) {
  let r = n
  if (typeof len === "undefined") {
    len = Math.floor((Scalar.bitLength(n) - 1) / 8) + 1
    if (len == 0) len = 1
  }
  const buff = new Uint8Array(len)
  const buffV = new DataView(buff.buffer)
  let o = 0
  while (o < len) {
    if (o + 4 <= len) {
      buffV.setUint32(o, Number(r & BigInt(0xffffffff)), true)
      o += 4
      r = r >> BigInt(32)
    } else if (o + 2 <= len) {
      buffV.setUint16(o, Number(r & BigInt(0xffff)), true)
      o += 2
      r = r >> BigInt(16)
    } else {
      buffV.setUint8(o, Number(r & BigInt(0xff)), true)
      o += 1
      r = r >> BigInt(8)
    }
  }
  if (r) {
    throw new Error("Number does not fit in this length")
  }
  return buff
}

export function array2buffer(arr, sG) {
  const buff = new Uint8Array(sG * arr.length)

  for (let i = 0; i < arr.length; i++) {
    buff.set(arr[i], i * sG)
  }

  return buff
}

export function buffer2array(buff, sG) {
  const n = buff.byteLength / sG
  const arr = new Array(n)
  for (let i = 0; i < n; i++) {
    arr[i] = buff.slice(i * sG, i * sG + sG)
  }
  return arr
}

export function log2(V) {
  return (
    ((V & 0xffff0000) !== 0 ? ((V &= 0xffff0000), 16) : 0) |
    ((V & 0xff00ff00) !== 0 ? ((V &= 0xff00ff00), 8) : 0) |
    ((V & 0xf0f0f0f0) !== 0 ? ((V &= 0xf0f0f0f0), 4) : 0) |
    ((V & 0xcccccccc) !== 0 ? ((V &= 0xcccccccc), 2) : 0) |
    ((V & 0xaaaaaaaa) !== 0)
  )
}

const _revTable = []
for (let i = 0; i < 256; i++) {
  _revTable[i] = _revSlow(i, 8)
}

function _revSlow(idx, bits) {
  let res = 0
  let a = idx
  for (let i = 0; i < bits; i++) {
    res <<= 1
    res = res | (a & 1)
    a >>= 1
  }
  return res
}

export function bitReverse(idx, bits) {
  return (
    (_revTable[idx >>> 24] |
      (_revTable[(idx >>> 16) & 0xff] << 8) |
      (_revTable[(idx >>> 8) & 0xff] << 16) |
      (_revTable[idx & 0xff] << 24)) >>>
    (32 - bits)
  )
}

export function buffReverseBits(buff, eSize) {
  const n = buff.byteLength / eSize
  const bits = log2(n)
  if (n != 1 << bits) {
    throw new Error("Invalid number of pointers")
  }
  for (let i = 0; i < n; i++) {
    const r = bitReverse(i, bits)
    if (i > r) {
      const tmp = buff.slice(i * eSize, (i + 1) * eSize)
      buff.set(buff.slice(r * eSize, (r + 1) * eSize), i * eSize)
      buff.set(tmp, r * eSize)
    }
  }
}
