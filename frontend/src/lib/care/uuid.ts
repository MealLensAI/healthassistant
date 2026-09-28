/** Minimal UUID v5 (SHA-1) — matches Python uuid.uuid5(NAMESPACE_URL, name). */

/** RFC 4122 NAMESPACE_URL (not DNS — last hex digit is 1, not 0). */
const NAMESPACE_URL = '6ba7b811-9dad-11d1-80b4-00c04fd430c8'

function hexToBytes(hex: string): Uint8Array {
  const clean = hex.replace(/-/g, '')
  const out = new Uint8Array(clean.length / 2)
  for (let i = 0; i < out.length; i += 1) {
    out[i] = parseInt(clean.slice(i * 2, i * 2 + 2), 16)
  }
  return out
}

function bytesToHex(bytes: Uint8Array): string {
  return [...bytes].map((b) => b.toString(16).padStart(2, '0')).join('')
}

/** Compact sync SHA-1 (RFC 3174) for UUID v5. */
function sha1(data: Uint8Array): Uint8Array {
  const ml = data.length
  const withOne = new Uint8Array(ml + 1)
  withOne.set(data)
  withOne[ml] = 0x80
  const bitLen = ml * 8
  const total = ((withOne.length + 8 + 63) & ~63)
  const padded = new Uint8Array(total)
  padded.set(withOne)
  const view = new DataView(padded.buffer)
  view.setUint32(total - 4, bitLen >>> 0, false)
  view.setUint32(total - 8, Math.floor(bitLen / 0x100000000), false)

  let h0 = 0x67452301
  let h1 = 0xefcdab89
  let h2 = 0x98badcfe
  let h3 = 0x10325476
  let h4 = 0xc3d2e1f0
  const w = new Int32Array(80)

  for (let i = 0; i < total; i += 64) {
    for (let j = 0; j < 16; j += 1) w[j] = view.getInt32(i + j * 4, false)
    for (let j = 16; j < 80; j += 1) {
      const x = w[j - 3] ^ w[j - 8] ^ w[j - 14] ^ w[j - 16]
      w[j] = (x << 1) | (x >>> 31)
    }
    let a = h0
    let b = h1
    let c = h2
    let d = h3
    let e = h4
    for (let j = 0; j < 80; j += 1) {
      let f: number
      let k: number
      if (j < 20) {
        f = (b & c) | (~b & d)
        k = 0x5a827999
      } else if (j < 40) {
        f = b ^ c ^ d
        k = 0x6ed9eba1
      } else if (j < 60) {
        f = (b & c) | (b & d) | (c & d)
        k = 0x8f1bbcdc
      } else {
        f = b ^ c ^ d
        k = 0xca62c1d6
      }
      const temp = (((a << 5) | (a >>> 27)) + f + e + k + w[j]) | 0
      e = d
      d = c
      c = ((b << 30) | (b >>> 2)) | 0
      b = a
      a = temp
    }
    h0 = (h0 + a) | 0
    h1 = (h1 + b) | 0
    h2 = (h2 + c) | 0
    h3 = (h3 + d) | 0
    h4 = (h4 + e) | 0
  }

  const digest = new Uint8Array(20)
  const out = new DataView(digest.buffer)
  out.setUint32(0, h0, false)
  out.setUint32(4, h1, false)
  out.setUint32(8, h2, false)
  out.setUint32(12, h3, false)
  out.setUint32(16, h4, false)
  return digest
}

export function uuidv5(name: string, namespace = NAMESPACE_URL): string {
  const ns = hexToBytes(namespace)
  const nameBytes = new TextEncoder().encode(name)
  const joined = new Uint8Array(ns.length + nameBytes.length)
  joined.set(ns)
  joined.set(nameBytes, ns.length)
  const hash = sha1(joined)
  hash[6] = (hash[6] & 0x0f) | 0x50
  hash[8] = (hash[8] & 0x3f) | 0x80
  const hex = bytesToHex(hash.subarray(0, 16))
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`
}
