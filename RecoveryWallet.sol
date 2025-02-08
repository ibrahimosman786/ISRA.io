// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

/**
 * @title RecoveryWallet
 * @notice A wallet with a secure recovery mechanism using guardians.
 * The wallet owner is protected by a set of guardian addresses. In case
 * the owner loses access, any guardian can propose a new owner. If a sufficient
 * number of guardians vote to approve the proposal (meeting the recoveryThreshold),
 * ownership is transferred.
 */
contract RecoveryWallet {
    // Primary owner of the wallet
    address public owner;
    // List of guardian addresses
    address[] public guardians;
    // Number of guardian approvals required to execute a recovery
    uint public recoveryThreshold;

    // Recovery proposal state variables
    bool public proposalActive;
    uint public currentProposalId;
    address public proposedNewOwner;
    uint public approvalCount;
    uint public proposalTimestamp;

    // Mapping to track which proposal a guardian has voted on.
    // A guardian can vote only once per proposal.
    mapping(address => uint) public guardianVotes;

    // Events for off-chain monitoring and logging
    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);
    event RecoveryProposed(uint proposalId, address indexed proposedNewOwner, uint timestamp);
    event GuardianVoted(address indexed guardian, uint proposalId, uint approvalCount);
    event RecoveryExecuted(address indexed newOwner);
    event RecoveryCancelled(uint proposalId);

    // Only the current owner can perform certain actions.
    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner can call this function");
        _;
    }

    // Only a guardian (an address in the guardians array) can call these functions.
    modifier onlyGuardian() {
        bool isGuardian = false;
        for (uint i = 0; i < guardians.length; i++) {
            if (guardians[i] == msg.sender) {
                isGuardian = true;
                break;
            }
        }
        require(isGuardian, "Only guardian can call this function");
        _;
    }

    /**
     * @notice Constructor to initialize the RecoveryWallet.
     * @param _owner The address of the wallet owner.
     * @param _guardians An array of guardian addresses.
     * @param _recoveryThreshold The number of guardian approvals required for recovery.
     */
    constructor(address _owner, address[] memory _guardians, uint _recoveryThreshold) {
        require(_owner != address(0), "Invalid owner address");
        require(_guardians.length > 0, "At least one guardian required");
        require(_recoveryThreshold > 0 && _recoveryThreshold <= _guardians.length, "Invalid recovery threshold");

        owner = _owner;
        guardians = _guardians;
        recoveryThreshold = _recoveryThreshold;
    }

    // Allow the contract to receive ETH.
    receive() external payable {}

    /**
     * @notice A guardian starts a recovery proposal by specifying a new owner.
     * The guardian who proposes automatically votes.
     * @param _newOwner The address proposed to become the new owner.
     */
    function proposeRecovery(address _newOwner) external onlyGuardian {
        require(!proposalActive, "A recovery proposal is already active");
        require(_newOwner != address(0), "Invalid new owner address");

        proposalActive = true;
        currentProposalId++;  // increment proposal id for each new proposal
        proposedNewOwner = _newOwner;
        approvalCount = 0;
        proposalTimestamp = block.timestamp;

        // The guardian who initiates the proposal automatically votes
        guardianVotes[msg.sender] = currentProposalId;
        approvalCount++;

        emit RecoveryProposed(currentProposalId, _newOwner, proposalTimestamp);
        emit GuardianVoted(msg.sender, currentProposalId, approvalCount);
    }

    /**
     * @notice A guardian votes to approve the active recovery proposal.
     */
    function voteRecovery() external onlyGuardian {
        require(proposalActive, "No active recovery proposal");
        require(guardianVotes[msg.sender] != currentProposalId, "Guardian already voted for current proposal");

        guardianVotes[msg.sender] = currentProposalId;
        approvalCount++;

        emit GuardianVoted(msg.sender, currentProposalId, approvalCount);
    }

    /**
     * @notice Once enough guardians have approved, anyone may call to execute the recovery.
     * This transfers ownership of the wallet to the proposed new owner.
     */
    function executeRecovery() external {
        require(proposalActive, "No active recovery proposal");
        require(approvalCount >= recoveryThreshold, "Not enough guardian approvals");

        address previousOwner = owner;
        owner = proposedNewOwner;

        emit OwnershipTransferred(previousOwner, owner);
        emit RecoveryExecuted(owner);

        // Reset the proposal state after successful recovery.
        _resetProposal();
    }

    /**
     * @notice The current owner can cancel an active recovery proposal.
     * This is useful if the owner still controls their keys.
     */
    function cancelRecovery() external onlyOwner {
        require(proposalActive, "No active recovery proposal");
        uint canceledProposalId = currentProposalId;
        _resetProposal();

        emit RecoveryCancelled(canceledProposalId);
    }

    /// @dev Internal function to reset recovery proposal state.
    function _resetProposal() internal {
        proposalActive = false;
        proposedNewOwner = address(0);
        approvalCount = 0;
        proposalTimestamp = 0;
    }

    /**
     * @notice Add a new guardian. Only the owner can add a guardian.
     * @param _guardian The address of the new guardian.
     */
    function addGuardian(address _guardian) external onlyOwner {
        require(_guardian != address(0), "Invalid guardian address");
        for (uint i = 0; i < guardians.length; i++) {
            require(guardians[i] != _guardian, "Guardian already exists");
        }
        guardians.push(_guardian);
    }

    /**
     * @notice Remove a guardian. Only the owner can remove a guardian.
     * @param _guardian The address of the guardian to remove.
     */
    function removeGuardian(address _guardian) external onlyOwner {
        require(_guardian != address(0), "Invalid guardian address");
        bool found = false;
        for (uint i = 0; i < guardians.length; i++) {
            if (guardians[i] == _guardian) {
                guardians[i] = guardians[guardians.length - 1];
                guardians.pop();
                found = true;
                break;
            }
        }
        require(found, "Guardian not found");
    }

    /**
     * @notice Utility function to get the list of current guardians.
     */
    function getGuardians() external view returns (address[] memory) {
        return guardians;
    }
}
