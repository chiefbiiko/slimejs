/***
 * This is an insecure hash function, just as an example only
 * @param data
 * @param seed
 * @param hashLength
 */
export function simpleHash(data, seed, hashLength = 40) {
  const str = data.join('')
  let i, l,
    hval = seed ?? 0x811c9dcc5
  for (i = 0, l = str.length; i < l; i++) {
    hval ^= str.charCodeAt(i)
    hval += (hval << 1) + (hval << 4) + (hval << 6) + (hval << 8) + (hval << 24)
  }
  const hash = (hval >>> 0).toString(16)
  return BigInt('0x' + hash.padEnd(hashLength - (hash.length - 1), '0')).toString(10)
}

export default (left, right) => simpleHash([left, right])