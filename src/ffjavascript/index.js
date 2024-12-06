import buildBn128 from "./bn128.js";
export { stringifyBigInts } from "./utils.js";

// getCurveFromName("bn128", true, buildPoseidonWasm);
export async function getCurveFromName(name, singleThread, plugins) {
    if (!["bn128", "bn254", "altbn128"].includes(name.toLowerCase())) {
        throw new Error(`Curve not supported: ${name}`)
    }
    return buildBn128(singleThread, plugins)
}