import hardhat from "hardhat"
import { expect, assert } from "chai"
import { stringifyBigInts } from "../src/index.js"
import { unstringifyBigInts } from "../src/ffjavascript/index.js"
import * as Scalar from "../src/ffjavascript/scalar.js"
import buildBn128 from "../src/ffjavascript/bn128.js"
import {log2} from "../src/ffjavascript/utils.js"
import BigBuffer from "../src/ffjavascript/bigbuffer.js";
import ZqField from "../src/ffjavascript/f1field.js";

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

  describe("Curve G1 Test", function() {
    this.timeout(0);

    let bn128;
    before( async() => {
        bn128 = await buildBn128();
    });
    after( async() => {
        bn128.terminate();
    });

    it("r*one == 0", () => {
        const res = bn128.G1.timesScalar(bn128.G1.g, bn128.r);

        assert(bn128.G1.eq(res, bn128.G1.zero), "G1 does not have range r");
    });

    it("Should add match in various in G1", () => {

        const r1 = bn128.Fr.e(33);
        const r2 = bn128.Fr.e(44);

        const gr1 = bn128.G1.timesFr(bn128.G1.g, r1);
        const gr2 = bn128.G1.timesFr(bn128.G1.g, r2);

        const grsum1 = bn128.G1.add(gr1, gr2);

        const grsum2 = bn128.G1.timesFr(bn128.G1.g, bn128.Fr.add(r1, r2));

        assert(bn128.G1.eq(grsum1, grsum2));
    });
});

describe("Curve G2 Test", function() {
    this.timeout(0);

    let bn128;
    before( async() => {
        bn128 = await buildBn128();
    });
    after( async() => {
        bn128.terminate();
    });

    it ("r*one == 0", () => {
        const res = bn128.G2.timesScalar(bn128.G2.g, bn128.r);

        assert(bn128.G2.eq(res, bn128.G2.zero), "G2 does not have range r");
    });

    it("Should add match in various in G2", () => {
        const r1 = bn128.Fr.e(33);
        const r2 = bn128.Fr.e(44);

        const gr1 = bn128.G2.timesFr(bn128.G2.g, r1);
        const gr2 = bn128.G2.timesFr(bn128.G2.g, r2);

        const grsum1 = bn128.G2.add(gr1, gr2);

        const grsum2 = bn128.G2.timesFr(bn128.G2.g, bn128.Fr.add(r1, r2));

        /*
        console.log(G2.toString(grsum1));
        console.log(G2.toString(grsum2));
        */

        assert(bn128.G2.eq(grsum1, grsum2));
    });
});

describe("F6 testing", function() {
    this.timeout(0);

    let bn128;
    before( async() => {
        bn128 = await buildBn128();
    });
    after( async() => {
        bn128.terminate();
    });

    it("Should multiply and divide in F6", () => {

        const a = bn128.F6.fromObject([
            [Scalar.e("1"), Scalar.e("2")],
            [Scalar.e("3"), Scalar.e("4")],
            [Scalar.e("5"), Scalar.e("6")]
        ]);
        const b = bn128.F6.fromObject([
            [Scalar.e("12"), Scalar.e("11")],
            [Scalar.e("10"), Scalar.e("9")],
            [Scalar.e("8"), Scalar.e("7")]
        ]);
        const c = bn128.F6.mul(a,b);
        const d = bn128.F6.div(c,b);

        assert(bn128.F6.eq(a, d));
    });
});

describe("F12 testing", function() {
    this.timeout(0);

    let bn128;
    before( async() => {
        bn128 = await buildBn128();
    });
    after( async() => {
        bn128.terminate();
    });

    it("Should multiply and divide in F12", () => {
        const a = bn128.Gt.fromObject([
            [
                [Scalar.e("1"), Scalar.e("2")],
                [Scalar.e("3"), Scalar.e("4")],
                [Scalar.e("5"), Scalar.e("6")]
            ],
            [
                [Scalar.e("7"), Scalar.e("8")],
                [Scalar.e("9"), Scalar.e("10")],
                [Scalar.e("11"), Scalar.e("12")]
            ]
        ]);
        const b = bn128.Gt.fromObject([
            [
                [Scalar.e("12"), Scalar.e("11")],
                [Scalar.e("10"), Scalar.e("9")],
                [Scalar.e("8"), Scalar.e("7")]
            ],
            [
                [Scalar.e("6"), Scalar.e("5")],
                [Scalar.e("4"), Scalar.e("3")],
                [Scalar.e("2"), Scalar.e("1")]
            ]
        ]);
        const c = bn128.F12.mul(a,b);
        const d = bn128.F12.div(c,b);

        assert(bn128.F12.eq(a, d));
    });
});

describe("Pairing", function() {
    this.timeout(0);

    let bn128;
    before( async() => {
        bn128 = await buildBn128();
    });
    after( async() => {
        bn128.terminate();
    });

    /*
    it("Should match pairing", () => {
        for (let i=0; i<1; i++) {
            const bn128 = new BN128();

            const g1a = bn128.G1.mulScalar(bn128.G1.g, 25);
            const g2a = bn128.G2.mulScalar(bn128.G2.g, 30);

            const g1b = bn128.G1.mulScalar(bn128.G1.g, 30);
            const g2b = bn128.G2.mulScalar(bn128.G2.g, 25);

            const pre1a = bn128.prepareG1(g1a);
            const pre2a = bn128.prepareG2(g2a);
            const pre1b = bn128.prepareG1(g1b);
            const pre2b = bn128.prepareG2(g2b);

            const r1 = bn128.millerLoop(pre1a, pre2a);
            const r2 = bn128.millerLoop(pre1b, pre2b);

            const rbe = bn128.F12.mul(r1, bn128.F12.inverse(r2));

            const res = bn128.finalExponentiation(rbe);

            assert(bn128.F12.eq(res, bn128.F12.one));
        }
    })
    */
    it("Should generate another pairing pairing", () => {
        for (let i=0; i<1; i++) {
            const g1a = bn128.G1.timesScalar(bn128.G1.g, 10);
            const g2a = bn128.G2.timesScalar(bn128.G2.g, 1);

            const g1b = bn128.G1.timesScalar(bn128.G1.g, 1);
            const g2b = bn128.G2.timesScalar(bn128.G2.g, 10);

            const pre1a = bn128.prepareG1(g1a);
            const pre2a = bn128.prepareG2(g2a);
            const pre1b = bn128.prepareG1(g1b);
            const pre2b = bn128.prepareG2(g2b);

            const r1 = bn128.millerLoop(pre1a, pre2a);
            const r2 = bn128.finalExponentiation(r1);

            const r3 = bn128.millerLoop(pre1b, pre2b);

            const r4 = bn128.finalExponentiation(r3);

            /*
            console.log("ML1: " ,bn128.F12.toString(r1));
            console.log("FE1: " ,bn128.F12.toString(r2));
            console.log("ML2: " ,bn128.F12.toString(r3));
            console.log("FE2: " ,bn128.F12.toString(r4));
            */

            assert(bn128.F12.eq(r2, r4));


            /*
            const r2 = bn128.millerLoop(pre1b, pre2b);

            const rbe = bn128.F12.mul(r1, bn128.F12.inverse(r2));

            const res = bn128.finalExponentiation(rbe);

            assert(bn128.F12.eq(res, bn128.F12.one));
            */
        }
    });
});

describe("Compressed Form", function() {
    this.timeout(0);

    let bn128;
    before( async() => {
        bn128 = await buildBn128();
    });
    after( async() => {
        bn128.terminate();
    });

    it("Should test rpr of G2", () => {
        const P1 = bn128.G2.fromObject([
            [
                Scalar.e("1b2327ce7815d3358fe89fd8e5695305ed23682db29569f549ab8f48cae1f1c4",16),
                Scalar.e("1ed41ca6b3edc06237af648f845c270ff83bcde333f17863c1b71a43b271b46d",16)
            ],
            [
                Scalar.e("122057912ab892abcf2e729f0f342baea3fe1b484840eb97c7d78cd7530f4ab5",16),
                Scalar.e("2cb317fd40d56eeb17b0c1ff9443661a42ec00cea060012873b3f643f1a5bff8",16)
            ],
            [
                Scalar.one,
                Scalar.zero
            ]
        ]);
        const buff = new Uint8Array(64);
        bn128.G2.toRprCompressed(buff, 0, P1);

        const P2 = bn128.G2.fromRprCompressed(buff, 0);

        /*
        console.log(bn128.G2.toString(P1, 16));
        console.log(bn128.G2.toString(P2, 16));
        */

        assert(bn128.G2.eq(P1,P2));
    });
});
})
