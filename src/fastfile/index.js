import * as memFile from "./memfile.js";

export async function createOverride(o) {
    if (o.type === "mem") {
        return memFile.createNew(o);
    } else {
        throw new Error("Invalid FastFile type: "+o.type);
    }
}

export async function readExisting(o) {
    if (o instanceof Uint8Array) {
        o = {
            type: "mem",
            data: o
        };
    }
    if (typeof o === "string") {
        const buff = await fetch(o).then( function(res) {
            return res.arrayBuffer();
        }).then(function (ab) {
            return new Uint8Array(ab);
        });
        o = {
            type: "mem",
            data: buff
        };
    }
    if (o.type === "mem") {
        return await memFile.readExisting(o);
    } else {
        throw new Error("Invalid FastFile type: "+o.type);
    }
}