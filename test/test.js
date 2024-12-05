import hardhat from "hardhat"
import { expect } from "chai"
import { MerkleTree, ModuleBuilder, hex, stringifyBigInts } from "../src/index.js"
import "./compileHasher.cjs"

const { ethers, waffle } = hardhat
const { BigNumber } = ethers

const MERKLE_TREE_HEIGHT = 5
// keccak256("tornado") % BN254_FIELD_SIZE
const DEFAULT_ZERO =
  "21663839004416932945382355908790599225266501822907911457504978515578255421292"

let poseidonHash2

describe("utils", function () {
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

describe("fixed-merkle-tree", function () {
  this.timeout(20000)

  async function deploy(contractName, ...args) {
    const factory = await ethers.getContractFactory(contractName)
    const instance = await factory.deploy(...args)
    return instance.deployed()
  }

  function getNewTree() {
    return new MerkleTree(MERKLE_TREE_HEIGHT, [], {
      hashFunction: poseidonHash2,
      zeroElement: DEFAULT_ZERO
    })
  }

  async function fixture() {
    const hasher = await deploy("Hasher")
    const merkleTreeWithHistory = await deploy(
      "MerkleTreeWithHistoryMock",
      MERKLE_TREE_HEIGHT,
      hasher.address
    )
    //TODO use custom circomlibjs once ready
    const { buildPoseidon } = await import("circomlibjs")
    const poseidon = await buildPoseidon()
    function _poseidonHash2(a, b) {
      return (
        "0x" +
        BigInt(poseidon.F.toString(poseidon([a, b]), 10))
          .toString(16)
          .padStart(64, "0")
      )
    }
    poseidonHash2 = _poseidonHash2
    return { hasher, merkleTreeWithHistory }
  }

  describe("#constructor", () => {
    it("should correctly hash 2 leaves", async () => {
      const { merkleTreeWithHistory } = await waffle.loadFixture(fixture)
      const hash0 = await merkleTreeWithHistory.hashLeftRight(
        hex(123),
        hex(456)
      )
      const hash2 = poseidonHash2(123, 456)
      expect(hash0).to.equal(hash2)
    })

    it("should initialize", async () => {
      const { merkleTreeWithHistory } = await waffle.loadFixture(fixture)
      const zeroValue = await merkleTreeWithHistory
        .ZERO_VALUE()
        .then(r => r.toHexString())
      const firstSubtree = await merkleTreeWithHistory.filledSubtrees(0)
      const firstZero = await merkleTreeWithHistory.zeros(0)
      expect(firstSubtree).to.be.equal(zeroValue)
      expect(firstZero).to.be.equal(zeroValue)
    })

    it("should have correct merkle root", async () => {
      const { merkleTreeWithHistory } = await waffle.loadFixture(fixture)
      const tree = getNewTree()
      const contractRoot = await merkleTreeWithHistory.getLastRoot()
      expect(tree.root).to.equal(contractRoot)
    })
  })

  describe("#insert", () => {
    it("should insert", async () => {
      const { merkleTreeWithHistory } = await waffle.loadFixture(fixture)
      const tree = getNewTree()
      await merkleTreeWithHistory.insert(hex(123), hex(456))
      tree.bulkInsert([123, 456])
      expect(tree.root).to.be.equal(await merkleTreeWithHistory.getLastRoot())

      await merkleTreeWithHistory.insert(hex(678), hex(876))
      tree.bulkInsert([678, 876])
      expect(tree.root).to.be.equal(await merkleTreeWithHistory.getLastRoot())
    })

    it("hasher gas", async () => {
      const { merkleTreeWithHistory } = await waffle.loadFixture(fixture)
      const gas = await merkleTreeWithHistory.estimateGas
        .hashLeftRight(hex(123), hex(456))
        .then(r => r.toNumber())
      expect(gas).to.equal(54401)
    })
  })

  describe("#isKnownRoot", () => {
    async function fixtureFilled() {
      const { merkleTreeWithHistory, hasher } = await waffle.loadFixture(
        fixture
      )
      await merkleTreeWithHistory.insert(hex(123), hex(456))
      return { merkleTreeWithHistory, hasher }
    }

    it("should return last root", async () => {
      const { merkleTreeWithHistory } = await fixtureFilled(fixture)
      const tree = getNewTree()
      tree.bulkInsert([123, 456])
      expect(await merkleTreeWithHistory.isKnownRoot(tree.root)).to.equal(true)
    })

    it("should return older root", async () => {
      const { merkleTreeWithHistory } = await fixtureFilled(fixture)
      const tree = getNewTree()
      tree.bulkInsert([123, 456])
      await merkleTreeWithHistory.insert(hex(234), hex(432))
      expect(await merkleTreeWithHistory.isKnownRoot(tree.root)).to.equal(true)
    })

    it("should fail on unknown root", async () => {
      const { merkleTreeWithHistory } = await fixtureFilled(fixture)
      const tree = getNewTree()
      tree.bulkInsert([456, 654])
      expect(await merkleTreeWithHistory.isKnownRoot(tree.root)).to.equal(false)
    })

    it("should not return uninitialized roots", async () => {
      const { merkleTreeWithHistory } = await fixtureFilled(fixture)
      expect(await merkleTreeWithHistory.isKnownRoot(hex(0))).to.equal(false)
    })
  })
})

// import assert from "assert";

// import { ModuleBuilder } from "../main.js";

// function buf2hex(buffer) { // buffer is an ArrayBuffer
//     return Array.prototype.map.call(new Uint8Array(buffer), x => ("00" + x.toString(16)).slice(-2)).join("");
// }

describe("wasmbuilder", () => {
    it("should generate a basic module", () => {
        const module = new ModuleBuilder()
        const bytes = module.build()
        expect("0x0061736d01000000010100020f0103656e76066d656d6f72790200010301000701000a01000b0a010041000b0408000000", hex(bytes))
    });
});