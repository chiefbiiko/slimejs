const { expect } = require('chai')

describe('bropro', function () {
  this.timeout(5000)

//   describe('x25519-xchacha20-poly1305', () => {
//     it('sender and recipient can decrypt', () => {
//       const plaintext = Buffer.from('acab')
//       const alice = new KeyPair()
//       const bob = new KeyPair()

//       // alice encrypts to bob
//       const { envelope } = bob.encrypt(alice, plaintext)
//       const { plaintext: bobPlaintext } = bob.decrypt(
//         [alice.x25519.publicKey],
//         envelope
//       )
//       const { plaintext: alicePlaintext } = alice.decrypt(
//         [bob.x25519.publicKey],
//         envelope
//       )

//       expect(bobPlaintext).to.deep.equal(plaintext)
//       expect(alicePlaintext).to.deep.equal(plaintext)
//     })
//   })
})