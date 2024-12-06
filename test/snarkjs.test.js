import {assert} from "chai";
import { groth16FullProve} from "../src/snarkjs/index.js";
import { getCurveFromName } from "../src/ffjavascript/index.js";
// NOTE: using the original snarkjs to verify our refactored groth16FullProve()
import * as snarkjs from "snarkjs";
import path from "path";
import fs from "fs/promises"

describe("snarkjs", function ()  {
    this.timeout(3000);

    let curve;
    let vKey;
    let proof;
    let publicSignals;
    let publicSignalsWithAlias;

    before( async () => {
        curve = await getCurveFromName("bn128");
        // curve.Fr.s = 10;
        // monkey patch fetch because the nodejs impl is a noop 4now
        globalThis.fetch = async function fetchFromFs(input) {
            const url = new URL(input);
            // const fs = await import("node:fs")
            const buf = await fs.readFile(url)
            return new Response(buf)
        }
    });
    after( async () => {
        await curve.terminate();
        // console.log(process._getActiveHandles());
        // console.log(process._getActiveRequests());
    });

    it ("groth16 proof singleThreaded", async () => {
        const input = {a: 11, b:2, c:13}
        const wasmFile = "file://" + path.resolve("test", "circuit", "circuit_js", "circuit.wasm")
        const zkeyFileName = "file://" +  path.resolve("test", "circuit", "circuit.zkey")
        const wtnsCalcOptions = {singleThread:true}
        const proverOptions = {singleThread:true}

const res = await groth16FullProve(input, wasmFile, zkeyFileName, console, wtnsCalcOptions,proverOptions)

        proof = res.proof;
        publicSignals = res.publicSignals;
        publicSignalsWithAlias = [...res.publicSignals];
        publicSignalsWithAlias[1] = BigInt(res.publicSignals[1]) + 21888242871839275222246405745257275088548364400416034343698204186575808495617n;
    });

    //FIXME
    // it("groth16 verify (proof singleThreaded)", async () => {
    //     //TODO find a way to read ./test/circuit/verification_key.json as vKey
    //     const res = await snarkjs.groth16.verify(vKey, publicSignals, proof);
    //     assert(res == true);

    //     const res2 = await snarkjs.groth16.verify(vKey, publicSignalsWithAlias, proof);
    //     assert(res2 == false);
    // });
});