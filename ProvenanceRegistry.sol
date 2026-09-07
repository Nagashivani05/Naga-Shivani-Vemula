// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// @title ProvenanceRegistry
/// @notice Stores tamper-evident fingerprints (hashes) of content the caller owns.
///         Anyone can later re-hash a file and check whether it matches a
///         record that was registered on-chain, proving the file is
///         unmodified since registration (or detecting that it changed).
contract ProvenanceRegistry {
    struct Record {
        address submitter;     // who registered this fingerprint
        uint256 timestamp;     // block time of registration
        string  label;         // human-readable description (filename, post URL, etc.)
        string  sourceUrl;     // where the content was found (optional, can be empty)
        bool    exists;
    }

    // contentHash => Record
    mapping(bytes32 => Record) private records;

    // running list of hashes, for enumeration in the demo / UI
    bytes32[] private allHashes;

    event ContentRegistered(
        bytes32 indexed contentHash,
        address indexed submitter,
        uint256 timestamp,
        string label,
        string sourceUrl
    );

    /// @notice Register a new content fingerprint on-chain.
    /// @param contentHash keccak256 (or sha256, cast to bytes32) hash of the content/file.
    /// @param label short human-readable name for what this record is.
    /// @param sourceUrl where this content came from (leave "" if not applicable).
    function registerContent(
        bytes32 contentHash,
        string calldata label,
        string calldata sourceUrl
    ) external {
        require(!records[contentHash].exists, "Content already registered");

        records[contentHash] = Record({
            submitter: msg.sender,
            timestamp: block.timestamp,
            label: label,
            sourceUrl: sourceUrl,
            exists: true
        });
        allHashes.push(contentHash);

        emit ContentRegistered(contentHash, msg.sender, block.timestamp, label, sourceUrl);
    }

    /// @notice Verify whether a given hash matches an existing on-chain record.
    /// @return isVerified true if the hash exists on-chain
    /// @return submitter address that registered it
    /// @return timestamp when it was registered
    /// @return label the stored label
    /// @return sourceUrl the stored source URL
    function verifyContent(bytes32 contentHash)
        external
        view
        returns (
            bool isVerified,
            address submitter,
            uint256 timestamp,
            string memory label,
            string memory sourceUrl
        )
    {
        Record memory r = records[contentHash];
        return (r.exists, r.submitter, r.timestamp, r.label, r.sourceUrl);
    }

    function totalRecords() external view returns (uint256) {
        return allHashes.length;
    }

    function hashAt(uint256 index) external view returns (bytes32) {
        require(index < allHashes.length, "Index out of range");
        return allHashes[index];
    }
}
