// /* eslint-disable indent, no-undef */
require('@nomiclabs/hardhat-ethers')
require('@nomiclabs/hardhat-waffle')
// require('dotenv').config()

task('hasher', 'Compile Poseidon hasher', () => {
  require('./test/compileHasher.cjs')
})

const config = {
  solidity: {
    compilers: [
      {
        version: '0.7.0',
        settings: {
          optimizer: {
            enabled: true,
            runs: 200
          }
        }
      },
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
  }
}

module.exports = config