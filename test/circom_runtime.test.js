import { expect } from "chai"
import fs from "fs"
import path from "path"
// NOTE: using the original snarkjs here because this suite should only test circom_runtime's wtns calc builder
import * as snarkjs from "snarkjs"
import { WitnessCalculatorBuilder } from "../src/circom_runtime/index.js"
// NOTE: using the original fastfile here because our refactored version does only support mem files
import * as fastFile from "fastfile"

describe("circom_runtime", function () {
  describe("wtnscalc", function () {
    const wasmFilename = path.join("test", "circuit", "circuit_js", "circuit.wasm")
    const zkeyFilename = path.join("test", "circuit", "circuit.zkey")
    const vkeyFilename = path.join("test", "circuit", "vkey.json")
    const input = {
      a: 1,
      b: 2,
      c: 3
    }

    this.timeout(15000)

    //let curve;

    before(async () => {
      // snarkjs.curves is not accessible yet, waiting for snarkjs release where it would be exported
      //curve = await snarkjs.curves.getCurveFromName("bn128");
    })

    after(async () => {
      // that would be a proper way to terminate background jobs instead of `mocha --exit`
      //await curve.terminate();
    })

    it("regular witness calc & prove", async () => {
      for (let i = 0; i < 10; i++) {
        const wtns = { type: "mem" }

        const fdWasm = await fastFile.readExisting(wasmFilename)
        const wasm = await fdWasm.read(fdWasm.totalSize)
        await fdWasm.close()

        const wc = await WitnessCalculatorBuilder(wasm)
        expect(wc.circom_version()).to.be.equal(2)

        const fdWtns = await fastFile.createOverride(wtns)

        const w = await wc.calculateWTNSBin(input)

        await fdWtns.write(w)
        await fdWtns.close()

        // groth16 prove
        const { proof, publicSignals } = await snarkjs.groth16.prove(zkeyFilename, wtns)

        // Verify the proof
        const verificationKey = JSON.parse(fs.readFileSync(vkeyFilename, "utf8"))
        const isValid = await snarkjs.groth16.verify(verificationKey, publicSignals, proof)

        expect(isValid).to.be.true
      }
    })

    it("reuse witness calc instance & prove", async () => {
      const verificationKey = JSON.parse(fs.readFileSync(vkeyFilename, "utf8"))

      const wtns = { type: "mem" }

      const fdWasm = await fastFile.readExisting(wasmFilename)
      const wasm = await fdWasm.read(fdWasm.totalSize)
      await fdWasm.close()

      const wc = await WitnessCalculatorBuilder(wasm)
      expect(wc.circom_version()).to.be.equal(2)

      const fdWtns = await fastFile.createOverride(wtns)

      const w = await wc.calculateWTNSBin(input)

      await fdWtns.write(w)
      await fdWtns.close()

      // groth16 prove
      const res = await snarkjs.groth16.prove(zkeyFilename, wtns)

      // Verify the proof
      const isValid = await snarkjs.groth16.verify(verificationKey, res.publicSignals, res.proof)

      expect(isValid).to.be.true

      /////////////////////////////////////////////
      // Witness Calculator from the same wasm instance
      /////////////////////////////////////////////

      for (let i = 0; i < 9; i++) {
        const wtns2 = { type: "mem" }

        const wc2 = await WitnessCalculatorBuilder(wc.instance)
        expect(wc2.circom_version()).to.be.equal(2)

        const fdWtns2 = await fastFile.createOverride(wtns2)

        const w2 = await wc2.calculateWTNSBin(input)

        await fdWtns2.write(w2)
        await fdWtns2.close()

        // groth16 prove
        const res3 = await snarkjs.groth16.prove(zkeyFilename, wtns2)

        // Verify the proof
        const isValid2 = await snarkjs.groth16.verify(verificationKey, res3.publicSignals, res3.proof)

        expect(isValid2).to.be.true
      }
    })
  })
})
