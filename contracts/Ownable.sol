//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

contract Ownable{
    address payable public owner;

    modifier onlyOwner(){
        require(msg.sender == owner);
        _; //Continue execution
    }

    constructor() {
        owner = payable(msg.sender);
    }
}