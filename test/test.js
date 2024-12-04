// const { expect } = require('chai')

// const { ethers, waffle } = require('hardhat')
// import { ethers, waffle } from 'hardhat'
import hardhat from 'hardhat'
const { ethers, waffle } = hardhat
// const { expect } = require('chai')
import { expect } from "chai";

// const {MerkleTree} = require('../src')
import { MerkleTree } from '../src/index.js';
// const { utils } = require('../sdk')()
// const { poseidonHash2, bigNumToHex } = utils
// const { merkleTreeHeight } = require('./utils')
// const { BigNumber } = require('@ethersproject/bignumber')
import { BigNumber } from '@ethersproject/bignumber';

// require('./compileHasher.cjs')
import('./compileHasher.cjs')

const merkleTreeHeight = 5

let poseidonHash2

function hex(num, len = 32) {
  return num.toString(16).padStart(len * 2, '0')
}

describe('fixed-merkle-tree', function () {
  this.timeout(20000)

  async function deploy(contractName, ...args) {
    const factory = await ethers.getContractFactory(contractName)
    const instance = await factory.deploy(...args)
    return instance.deployed()
  }

  function getNewTree() {
    return new MerkleTree(merkleTreeHeight, [], {
      hashFunction: poseidonHash2
    })
  }

  async function fixture() {
    const hasher = await deploy('Hasher')
    const merkleTreeWithHistory = await deploy(
      'MerkleTreeWithHistoryMock',
      merkleTreeHeight,
      hasher.address
    )
    // const sdk = await require('../sdk')({
    //   provider: ethers.provider,
    //   zkAssetsBaseUrl: 'artifacts/circuits',
    //   merkleTreeHeight,
    //   chainId: 11155111,
    //   startBlock: 0
    // })
    // poseidonHash2 = sdk.utils.poseidonHash2
    // bigNumToHex = sdk.utils.bigNumToHex

    //TODO use custom circomlibjs once ready
    const { buildPoseidon } = await import('circomlibjs')
    const poseidon = await buildPoseidon()
    function _poseidonHash2(a, b) {
      BigNumber.from(poseidon.F.toString(poseidon([a, b]), 10))
    }
    poseidonHash2 = _poseidonHash2
    // bigNumToHex = sdk.utils.bigNumToHex
    //
    return { hasher, merkleTreeWithHistory/*, poseidonHash2 */}
  }

  describe('#constructor', () => {
    it('should correctly hash 2 leaves', async () => {
      const { merkleTreeWithHistory/*, poseidonHash2*/ } = await waffle.loadFixture(fixture)
      const hash0 = await merkleTreeWithHistory.hashLeftRight(
        hex(123),
        hex(456)
      )
      const hash2 = poseidonHash2(123, 456)
      expect(hash0).to.equal(hash2)
    })

    it('should initialize', async () => {
      const { merkleTreeWithHistory } = await waffle.loadFixture(fixture)
      const zeroValue = await merkleTreeWithHistory.ZERO_VALUE().then(r => r.toHexString())
      const firstSubtree = await merkleTreeWithHistory.filledSubtrees(0)
      const firstZero = await merkleTreeWithHistory.zeros(0)
      expect(firstSubtree).to.be.equal(zeroValue)
      expect(firstZero).to.be.equal(zeroValue)
    })

    it('should have correct merkle root', async () => {
      const { merkleTreeWithHistory } = await waffle.loadFixture(fixture)
      const tree = getNewTree()
      const contractRoot = await merkleTreeWithHistory.getLastRoot()
      expect(tree.root()).to.equal(contractRoot)
    })
  })

  describe('#insert', () => {
    it('should insert', async () => {
      const { merkleTreeWithHistory } = await waffle.loadFixture(fixture)
      const tree = getNewTree()
      await merkleTreeWithHistory.insert(hex(123), hex(456))
      tree.bulkInsert([123, 456])
      expect(tree.root()).to.be.equal(await merkleTreeWithHistory.getLastRoot())

      await merkleTreeWithHistory.insert(hex(678), hex(876))
      tree.bulkInsert([678, 876])
      expect(tree.root()).to.be.equal(await merkleTreeWithHistory.getLastRoot())
    })

    it('hasher gas', async () => {
      const { merkleTreeWithHistory } = await waffle.loadFixture(fixture)
      const gas = await merkleTreeWithHistory.estimateGas.hashLeftRight(
        hex(123),
        hex(456)
      )
      expect(gas).to.equal(54401)
    })
  })

  describe('#isKnownRoot', () => {
    async function fixtureFilled() {
      const { merkleTreeWithHistory, hasher } = await waffle.loadFixture(
        fixture
      )
      await merkleTreeWithHistory.insert(hex(123), hex(456))
      return { merkleTreeWithHistory, hasher }
    }

    it('should return last root', async () => {
      const { merkleTreeWithHistory } = await fixtureFilled(fixture)
      const tree = getNewTree()
      tree.bulkInsert([123, 456])
      expect(await merkleTreeWithHistory.isKnownRoot(tree.root())).to.equal(
        true
      )
    })

    it('should return older root', async () => {
      const { merkleTreeWithHistory } = await fixtureFilled(fixture)
      const tree = getNewTree()
      tree.bulkInsert([123, 456])
      await merkleTreeWithHistory.insert(hex(234), hex(432))
      expect(await merkleTreeWithHistory.isKnownRoot(tree.root())).to.equal(
        true
      )
    })

    it('should fail on unknown root', async () => {
      const { merkleTreeWithHistory } = await fixtureFilled(fixture)
      const tree = getNewTree()
      tree.bulkInsert([456, 654])
      expect(await merkleTreeWithHistory.isKnownRoot(tree.root())).to.equal(
        false
      )
    })

    it('should not return uninitialized roots', async () => {
      const { merkleTreeWithHistory } = await fixtureFilled(fixture)
      expect(await merkleTreeWithHistory.isKnownRoot(hex(0))).to.equal(
        false
      )
    })
  })
})
