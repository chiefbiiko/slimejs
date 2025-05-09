import fs from "fs/promises"
import path from "path"
import { assert } from "chai"
import { groth16FullProve } from "../src/index.js"
import { getCurveFromName } from "../src/ffjavascript/index.js"
// NOTE: using the original snarkjs to verify our refactored groth16FullProve()
import * as snarkjs from "snarkjs"

describe("snarkjs", function () {
  this.timeout(3000)

  const input = { a: 11, b: 2, c: 13 }
  const wasmFile = "file://" + path.resolve("test", "circuit", "circuit_js", "circuit.wasm")
  const zkeyFileName = "file://" + path.resolve("test", "circuit", "circuit.zkey")
  const wtnsCalcOptions = { singleThread: true }
  const proverOptions = { singleThread: true }

  let curve
  let proof
  let publicSignals
  let publicSignalsWithAlias
  let vkey

  before(async () => {
    curve = await getCurveFromName("bn128")
    // curve.Fr.s = 10;
    // monkey patch fetch because the nodejs impl is a noop 4now (at least for file://)
    globalThis.fetch = async function fetchFromFs(input) {
      const url = new URL(input)
      const buf = await fs.readFile(url)
      return new Response(buf)
    }
    vkey = await fetch("file://" + path.resolve("test", "circuit", "vkey.json")).then(r => r.json())
  })

  it("groth16 proof singleThreaded", async () => {
    const res = await groth16FullProve(input, wasmFile, zkeyFileName, console, wtnsCalcOptions, proverOptions)

    proof = res.proof
    publicSignals = res.publicSignals
    publicSignalsWithAlias = [...res.publicSignals]
    publicSignalsWithAlias[1] =
      BigInt(res.publicSignals[1]) + 21888242871839275222246405745257275088548364400416034343698204186575808495617n
  })

  it("groth16 verify (proof singleThreaded)", async () => {
    const res = await snarkjs.groth16.verify(vkey, publicSignals, proof)
    assert(res === true)

    const res2 = await snarkjs.groth16.verify(vkey, publicSignalsWithAlias, proof)
    assert(res2 === false)
  })
})
