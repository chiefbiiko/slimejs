import { expect } from "chai"
import { hex } from "../src/index.js"
import ModuleBuilder from "../src/wasmbuilder/index.js"

describe("wasmbuilder", () => {
  it("should generate a basic module", () => {
    const module = new ModuleBuilder()
    const bytes = module.build()
    expect(hex(bytes)).to.equal(
      "0x0061736d01000000010100020f0103656e76066d656d6f72790200010301000701000a01000b0a010041000b0408000000"
    )
  })
})
