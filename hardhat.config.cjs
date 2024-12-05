// /* eslint-disable indent, no-undef */
require('@nomiclabs/hardhat-ethers')
require('@nomiclabs/hardhat-waffle')

task('hasher', 'Compile Poseidon hasher', () => {
  require('./test/compileHasher.cjs')
})

const config = {
  solidity: {
    compilers: [
      {
        version: '0.8.19',
        settings: {
          optimizer: {
            enabled: true,
            runs: 200
          }
        }
      }
    ]
  },
  networks: {
    hardhat: {},
  },
  mocha: {
    timeout: 600000000
  },
  paths: {
    sources: "./test",
    tests: "./test",
    cache: "./cache",
    artifacts: "./artifacts"
  },
}

module.exports = config