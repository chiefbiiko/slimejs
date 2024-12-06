import hardhat from "hardhat"
import { expect } from "chai"
import { stringifyBigInts } from "../src/index.js"

const { ethers } = hardhat
const { BigNumber } = ethers

describe("ffjavascript", function () {
  const B =
    "21888242871839275222246405745257275088614511777268538073601725287587578984328"

  it("should stringify bigints", async () => {
    const b =
      21888242871839275222246405745257275088614511777268538073601725287587578984328n
    expect(stringifyBigInts(b)).to.equal(B)
  })

  it("should stringify bignumbers", async () => {
    const b = BigNumber.from(B)
    expect(stringifyBigInts(b)).to.equal(B)
  })

  it("should stringify numbers", async () => {
    expect(stringifyBigInts(419)).to.equal("419")
  })

  it("should stringify Uint8Arrays", async () => {
    const b = ethers.utils.arrayify(BigNumber.from(B).toHexString()).reverse()
    expect(stringifyBigInts(b)).to.equal(B)
  })

  it("should stringify array items", async () => {
    const a = [1, 2n, [-3, [0, BigNumber.from(99)]]]
    expect(stringifyBigInts(a)).to.deep.equal(["1", "2", ["-3", ["0", "99"]]])
  })

  it("should stringify object items", async () => {
    const o = { a: 1, b: 2n, c: { d: -3, e: [0, BigNumber.from(99)] } }
    expect(stringifyBigInts(o)).to.deep.equal({
      a: "1",
      b: "2",
      c: { d: "-3", e: ["0", "99"] }
    })
  })
})
