import * as fastFile from "../src/fastfile/index.js";
import * as chai from "chai";
import chaiAsPromised from "chai-as-promised";

chai.use(chaiAsPromised);
const {  assert, expect }  = chai

const testUtils = {
    async  writeStringToFile(fd, str) {
        let buff = new Uint8Array(str.length + 1);
        for (let i = 0; i < str.length; i++) {
            buff[i] = str.charCodeAt(i);
        }
        buff[str.length] = 0;
        fd.write(buff);
    },
    async  writeFakeStringToFile(fd, length) {
        let buff = new Uint8Array(length);
        for (let i = 0; i < length; i++) {
            buff[i] = 1;
        }
        await fd.write(buff);
    }
}

describe("fastfile", function () {
    this.timeout(3000);

    let str1 = "0123456789";
    let str2 = "Hi_there";
    let str3 = "/!!--::**";

    it("should read valid strings from mem file", async () => {
        const file = {
            type: "mem"
        };

        let fd = await fastFile.createOverride(file);

        await testUtils.writeFakeStringToFile(fd, 10);

        await testUtils.writeStringToFile(fd, str1);
        await testUtils.writeStringToFile(fd, str2);
        await testUtils.writeStringToFile(fd, str3);

        let str = await fd.readString(10);
        assert.strictEqual(str, str1);

        str = await fd.readString();
        assert.strictEqual(str, str2);

        str = await fd.readString();
        assert.strictEqual(str, str3);

        await fd.close();
    });

    it("should throws an error when trying to access out of bounds on a mem read only file", async () => {
        const file = {
            type: "mem",
            data: {
                byteLength: 1
            }
        };
        let fd = await fastFile.readExisting(file);
        expect(fd.readString(10)).to.be.rejectedWith("Reading out of bounds");
    });
});



