//SPDX-License-Identifier: BSL 1.1
pragma solidity ^0.8.15;

library SidLibrary {
    uint128 constant MAXUINT64 = 0xFFFFFFFFFFFFFFFF;
    uint128 constant MAXUINT32 = 0xFFFFFFFF;

    function chainId(uint128 SID) public pure returns (uint64) {
        return uint64((SID & (MAXUINT64 << 64)) >> 64);
    }

    function protocolId(uint128 SID) public pure returns (uint32) {
        return uint32((SID & (MAXUINT32 << 32)) >> 32);
    }

    function poolId(uint128 SID) public pure returns (uint32) {
        return uint32(SID & MAXUINT32);
    }

    function isLpStackingSynth(uint128 SID) public pure returns (bool) {
        return (protocolId(SID) & (1 << 32)) != 0 ? true : false;
    }

    function unpack(uint128 SID) public pure returns (uint64, uint32, uint32) {
        return (chainId(SID), protocolId(SID), poolId(SID));
    }
}
