import hardhat from "hardhat"
import { expect } from "chai"
import { MerkleTree, hex } from "../src/index.js"
import "./compileHasher.cjs"

const { ethers, waffle } = hardhat

const MERKLE_TREE_HEIGHT = 5
// keccak256("tornado") % BN254_FIELD_SIZE
const DEFAULT_ZERO = "21663839004416932945382355908790599225266501822907911457504978515578255421292"

let poseidonHash2

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
    const merkleTreeWithHistory = await deploy("MerkleTreeWithHistoryMock", MERKLE_TREE_HEIGHT, hasher.address)
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
      const hash0 = await merkleTreeWithHistory.hashLeftRight(hex(123), hex(456))
      const hash2 = poseidonHash2(123, 456)
      expect(hash0).to.equal(hash2)
    })

    it("should initialize", async () => {
      const { merkleTreeWithHistory } = await waffle.loadFixture(fixture)
      const zeroValue = await merkleTreeWithHistory.ZERO_VALUE().then(r => r.toHexString())
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
      const gas = await merkleTreeWithHistory.estimateGas.hashLeftRight(hex(123), hex(456)).then(r => r.toNumber())
      expect(gas).to.equal(54401)
    })
  })

  describe("#isKnownRoot", () => {
    async function fixtureFilled() {
      const { merkleTreeWithHistory, hasher } = await waffle.loadFixture(fixture)
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
