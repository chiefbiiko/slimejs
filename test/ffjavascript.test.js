import hardhat from "hardhat"
import { expect, assert } from "chai"
import { stringifyBigInts } from "../src/index.js"
import { unstringifyBigInts } from "../src/ffjavascript/index.js"
import * as Scalar from "../src/ffjavascript/scalar.js"
import buildBn128 from "../src/ffjavascript/bn128.js"
import {log2} from "../src/ffjavascript/utils.js"
import BigBuffer from "../src/ffjavascript/bigbuffer.js";
import ZqField from "../src/ffjavascript/f1field.js";
// import * as chai from "chai";
// import buildBn128 from "../src/bn128.js";
// import {log2} from "../src/utils.js";
// import BigBuffer from "../src/bigbuffer.js";

// const assert = chai.assert;

// import ZqField from "../src/f1field.js";
// import * as Scalar from "../src/scalar.js";
// import * as chai from "chai";
// const assert = chai.assert;

const { ethers } = hardhat
const { BigNumber } = ethers

describe("ffjavascript", function () {
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

    it("should un/stringify scalar bigint", () => {
      const scalar = Scalar.e(B)
      const str = stringifyBigInts(scalar);
      const numFromStr = unstringifyBigInts(str);
      assert(Scalar.eq(scalar, numFromStr), true);
  });
  })

  describe("scalar", function () {
    it("should read various formats correctly", () => {
      assert(Scalar.eq(Scalar.e("0x12"), 18))
      assert(Scalar.eq(Scalar.e("0x12", 16), 18))
      assert(Scalar.eq(Scalar.e("12", 16), 18))
      assert(Scalar.eq(Scalar.e("18"), 18))
      assert(Scalar.eq(Scalar.e("18", 10), 18))
      assert(Scalar.eq(Scalar.e(18, 10), 18))
      assert(Scalar.eq(Scalar.e(18n, 10), 18))
      assert(Scalar.eq(Scalar.e(0x12, 10), 18))
      assert(Scalar.eq(Scalar.e(0x12n, 10), 18))

  });
  it("should convert to js number native", () => {
      const maxJsNum = Number.MAX_SAFE_INTEGER;
      const maxToScalar = Scalar.e(maxJsNum);

      const backToNum = Scalar.toNumber(maxToScalar);
      expect(backToNum).to.equal(maxJsNum);

      const overMaxJsNum = Scalar.add(maxToScalar, 1);
      expect(() => Scalar.toNumber(overMaxJsNum)).to.throw("Number too big");
  });
  })

  describe("bn128", function () {
    const logger = {
      error: (msg) => { console.log("ERROR: "+msg); },
      warning: (msg) => { console.log("WARNING: "+msg); },
      info: (msg) => { console.log("INFO: "+msg); },
      debug: (msg) => { console.log("DEBUG: "+msg); },
  };

  let bn128;
  before( async() => {
      bn128 = await buildBn128();
      console.log(bn128.Fr.toString(bn128.Fr.w[28]));
  });
  after( async() => {
      bn128.terminate();
  });

  it("It shoud do an inverse FFT in G1", async () => {
      const Fr = bn128.Fr;
      const G1 = bn128.G1;

      const a = [];
      for (let i=0; i<8; i++) a[i] = Fr.e(i+1);

      const aG_expected = [];
      for (let i=0; i<8; i++) aG_expected[i] = G1.timesFr(G1.g, a[i]);

      const A = await bn128.Fr.fft(a);


      const AG = [];
      for (let i=0; i<8; i++) AG[i] = G1.timesFr(G1.g, A[i]);

      const aG_calculated = await G1.ifft(AG, "jacobian", "jacobian");

      for (let i=0; i<8; i++) {
          assert(G1.eq(aG_calculated[i], aG_expected[i]));
      }
  });


  it("It shoud do a big FFT/IFFT in Fr", async () => {
      const Fr = bn128.Fr;

      const N = 1<<10;

      const a = new BigBuffer(N*bn128.Fr.n8);
      for (let i=0; i<N; i++) {
          if (i%100000 == 0) logger.debug(`setup ${i}/${N}`);
          const num = Fr.e(i+1);
          a.set(num, i*bn128.Fr.n8);
      }

      const A = await bn128.Fr.fft(a, "", "", logger, "fft");
      const Ainv = await bn128.Fr.ifft(A, "", "", logger, "ifft");

      for (let i=0; i<N; i++) {
          if (i%100000 == 0) logger.debug(`checking ${i}/${N}`);
          // console.log(Fr.toString(Ainv[i]));
          const num1 = Ainv.slice(i*Fr.n8, i*Fr.n8+Fr.n8);
          const num2 = a.slice(i*Fr.n8, i*Fr.n8+Fr.n8);

          assert(num1, num2);
      }
  });



  it("It shoud do a big FFT/IFFT in Fr", async () => {
      const Fr = bn128.Fr;
      const N = 8192*16;

      const a = [];
      for (let i=0; i<N; i++) a[i] = Fr.e(i+1);

      const A = await bn128.Fr.fft(a);
      const Ainv = await bn128.Fr.ifft(A);

      for (let i=0; i<N; i++) {
//            console.log(Fr.toString(Ainv[i]));
          assert(Fr.eq(a[i], Ainv[i]));
      }
  });


  it("It shoud do a big FFTExt/IFFTExt in Fr", async () => {
      const Fr = bn128.Fr;
      const N = 16;

      const oldS = Fr.s;
      Fr.s = log2(N)-1;   // Force ext

      const a = [];
      for (let i=0; i<N; i++) a[i] = Fr.e(i+1);

      const A = await bn128.Fr.fft(a);
      const Ainv = await bn128.Fr.ifft(A);

      for (let i=0; i<N; i++) {
//            console.log(Fr.toString(Ainv[i]));
          assert(Fr.eq(a[i], Ainv[i]));
      }

      Fr.s = oldS;
  });


  it("It shoud do a big FFT/IFFT in G1", async () => {
      const Fr = bn128.Fr;
      const G1 = bn128.G1;
      const N = 512;

      const a = [];
      for (let i=0; i<N; i++) a[i] = Fr.e(i+1);

      const aG = [];
      for (let i=0; i<N; i++) aG[i] = G1.timesFr(G1.g, a[i]);

      const AG = await G1.fft(aG, "jacobian", "jacobian");
      const AGInv = await G1.ifft(AG, "jacobian", "affine");

      for (let i=0; i<N; i++) {
          assert(G1.eq(aG[i], AGInv[i]));
      }
  });

  it("It shoud do a big FFT/IFFT in G1 ext", async () => {
      const Fr = bn128.Fr;
      const G1 = bn128.G1;
      const N = 1<<13;

      const oldS = Fr.s;
      Fr.s = log2(N)-1;

      const a = [];
      for (let i=0; i<N; i++) a[i] = Fr.e(i+1);

      const aG = [];
      for (let i=0; i<N; i++) aG[i] = G1.timesFr(G1.g, a[i]);

      const AG = await G1.fft(aG, "jacobian", "jacobian");
      const AGInv = await G1.ifft(AG, "jacobian", "affine");

      for (let i=0; i<N; i++) {
          assert(G1.eq(aG[i], AGInv[i]));
      }

      Fr.s = oldS;
  });

  it("It shoud do Multiexp", async () => {
      const Fr = bn128.Fr;
      const G1 = bn128.G1;
      const N = 1 << 10;

      const scalars = new BigBuffer(N*bn128.Fr.n8);
      const bases = new BigBuffer(N*G1.F.n8*2);
      let acc = Fr.zero;
      for (let i=0; i<N; i++) {
          if (i%100000 == 0) logger.debug(`setup ${i}/${N}`);
          const num = Fr.e(i+1);
          scalars.set(Fr.fromMontgomery(num), i*bn128.Fr.n8);
          bases.set(G1.toAffine(G1.timesFr(G1.g, num)), i*G1.F.n8*2);
          acc = Fr.add(acc, Fr.square(num));
      }

      const accG = G1.timesFr(G1.g, acc);
      const accG2 = await G1.multiExpAffine(bases, scalars, logger, "test");

      assert(G1.eq(accG, accG2 ));
  });


  })

  describe("f1field", function () {
const q = Scalar.fromString("21888242871839275222246405745257275088696311157297823662689037894645226208583");
const r = Scalar.fromString("21888242871839275222246405745257275088548364400416034343698204186575808495617");

    it("Should compute euclidean", () => {
        const F = new ZqField(7);
        const res = F.inv(F.e(4));

        assert(F.eq(res,F.e(2)));
    });

    it("Should multiply and divide in F1", () => {
        const F = new ZqField(q);
        const a = F.e("1");
        const b = F.normalize(-3);
        const c = F.mul(a,b);
        const d = F.div(c,b);

        assert(F.eq(a, d));
    });

    it("Should compute sqrts", () => {
        const F = new ZqField(q);
        const a = F.e("4");
        let b = F.sqrt(a);
        assert(F.eq(F.e(0), F.sqrt(F.e("0"))));
        assert(F.eq(b, F.e("2")));
        assert(F.sqrt(F.nqr) === null);
    });

    it("Should compute sqrt of 100 random numbers", () => {
        const F = new ZqField(r);
        for (let j=0;j<100; j++) {
            let a = F.random();
            let s = F.sqrt(a);
            if (s != null) {
                assert(F.eq(F.square(s), a));
            }
        }
    });
  })
})
