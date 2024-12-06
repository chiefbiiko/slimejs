import { expect } from "chai"
import {  ModuleBuilder, hex } from "../src/index.js"

describe("wasmbuilder", () => {
    it("should generate a basic module", () => {
        const module = new ModuleBuilder()
        const bytes = module.build()
        expect("0x0061736d01000000010100020f0103656e76066d656d6f72790200010301000701000a01000b0a010041000b0408000000", hex(bytes))
    });
});