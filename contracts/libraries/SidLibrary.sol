//SPDX-License-Identifier: BSL 1.1
pragma solidity 0.8.15;

library SidLibrary {
    uint constant MAXUINT64 = 0xFFFFFFFFFFFFFFFF;
    uint constant MAXUINT32 = 0xFFFFFFFF;

    function unpack(
        uint128 SID
    ) public pure returns (uint64 chainId, uint32 protocolId, uint32 poolId) {
        chainId = uint64((SID & (MAXUINT64 << 64)) >> 64);
        protocolId = uint32((SID & (MAXUINT32 << 32)) >> 32);
        poolId = uint32(SID & MAXUINT32);
    }

    function pack(uint64 chainId, uint32 protocolId, uint32 poolId) public pure returns (uint128) {
        return (chainId << 64) | (protocolId << 32) | poolId;
    }

    function pack(uint chainId, bytes32 protocolId, uint poolId) public pure returns (uint128) {
        return (uint64(chainId) << 64) | (uint32(bytes4(protocolId)) << 32) | uint32(poolId);
    }

    function pack(uint chainId, address chef, uint poolId) public pure returns (uint128) {
        bytes32 protocolId = keccak256(abi.encodePacked(chef));
        return pack(chainId, protocolId, poolId);
    }

    function peekChainId(uint128 sid) public pure returns (uint256 chainId) {
        (chainId, , ) = unpack(sid);
    }
}
