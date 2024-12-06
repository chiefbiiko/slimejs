import buildBn128 from "./bn128.js";
import * as Scalar from "./scalar.js";

const bn128q = Scalar.e("21888242871839275222246405745257275088696311157297823662689037894645226208583");

export async function getCurveFromQ(q, options) {
    // let curve;
    let singleThread = options && options.singleThread;
    if (Scalar.eq(q, bn128q)) {
        // curve = await buildBn128(singleThread);
        return buildBn128(singleThread);
    } 
    // else if (Scalar.eq(q, bls12381q)) {
    //     curve = await buildBls12381(singleThread);
    // }
    else {
        throw new Error(`Curve not supported: ${Scalar.toString(q)}`);
    }
    // return curve;
}

// getCurveFromName("bn128", true, buildPoseidonWasm);
export async function getCurveFromName(name, singleThread, plugins) {
    if (!["bn128", "bn254", "altbn128"].includes(name.toLowerCase())) {
        throw new Error(`Curve not supported: ${name}`)
    }
    return buildBn128(singleThread, plugins)
}