// SPDX-License-Identifier: MIT

pragma solidity ^0.8.19;

interface IHasher {
    function poseidon(bytes32[2] calldata inputs)
        external
        pure
        returns (bytes32);
}