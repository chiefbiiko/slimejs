/*
    Copyright 2018 0KIMS association.

    This file is part of snarkJS.

    snarkJS is a free software: you can redistribute it and/or modify it
    under the terms of the GNU General Public License as published by
    the Free Software Foundation, either version 3 of the License, or
    (at your option) any later version.

    snarkJS is distributed in the hope that it will be useful, but WITHOUT
    ANY WARRANTY; without even the implied warranty of MERCHANTABILITY
    or FITNESS FOR A PARTICULAR PURPOSE. See the GNU General Public
    License for more details.

    You should have received a copy of the GNU General Public License
    along with snarkJS. If not, see <https://www.gnu.org/licenses/>.
*/

import * as binFileUtils from "../binfileutils/index.js";
import { unstringifyBigInts } from "../ffjavascript/index.js";
import * as fastFile from "../fastfile/index.js";
import { WitnessCalculatorBuilder } from "../circom_runtime/index.js";
import * as wtnsUtils from "./wtns_utils.js";

export default async function wtnsCalculate(_input, wasmFileName, wtnsFileName, options) {
    const input = unstringifyBigInts(_input);

    const fdWasm = await fastFile.readExisting(wasmFileName);
    const wasm = await fdWasm.read(fdWasm.totalSize);
    await fdWasm.close();

    const wc = await WitnessCalculatorBuilder(wasm, options);
    if (wc.circom_version() === 1) {
        const w = await wc.calculateBinWitness(input);

        const fdWtns = await binFileUtils.createBinFile(wtnsFileName, "wtns", 2, 2);

        await wtnsUtils.writeBin(fdWtns, w, wc.prime);
        await fdWtns.close();
    } else {
        const fdWtns = await fastFile.createOverride(wtnsFileName);

        const w = await wc.calculateWTNSBin(input);

        await fdWtns.write(w);
        await fdWtns.close();
    }
}