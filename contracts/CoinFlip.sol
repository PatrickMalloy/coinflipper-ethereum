//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

import "hardhat/console.sol";
import "./Ownable.sol";


contract CoinFlip is Ownable {

  //uint256 constant NUM_RANDOM_BYTES_REQUESTED = 1;

  enum SIDE { HEAD, TAIL }

  struct Player {
    uint id;
    string name;
    uint numTotalBets;
    uint numWins;
    int totalAmountWon;
    bool lastBetWon;
    uint lastBetAmount;
    SIDE sideBet;
    SIDE randomSide;
  }

  mapping (address => Player) private players;
  mapping (address => uint) private playerBalances;
  mapping (uint => address) private playerRandomQueryIds;
	mapping (address => bool) private playersWaiting; 

  event generatedRandomNumber(uint queryId, SIDE randomNumber, bool won);
  event betStarted(address player, uint queryId, SIDE sideBet, uint amountBet);
  event poolBalanceChanged(uint poolBalance, uint maxBetAmount);

  uint public poolBalance;  // Contract balance - (sum of player balances)

  constructor() {
    //numPlayers = 0;
    poolBalance = 0;
    emit poolBalanceChanged(poolBalance, 0);
  }

  function fundContract() public payable onlyOwner {
    poolBalance += msg.value;
    emit poolBalanceChanged(poolBalance, maxBetAmount());
  }

  function addPlayerFunds() public payable {
    require (msg.value > 0);
    playerBalances[msg.sender] += msg.value;
  }

  function getPlayerInfo() public view returns (uint numTotalBets, uint numWins, int totalAmountWon,
                                                bool lastBetWon, uint lastBetAmount, SIDE randomSide) {
    Player memory player = players[msg.sender];
    return (player.numTotalBets, player.numWins, player.totalAmountWon,
            player.lastBetWon, player.lastBetAmount, player.randomSide);
  }

  function getPlayerBalance() public view returns (uint playerBalance) {
    return playerBalances[msg.sender];
  }

  function updatePlayerInfo(bool won, SIDE randomSide) private {
    console.log("updatePlayerInfo() called.");
    address _player = msg.sender;
    Player storage player = players[_player];
    player.numTotalBets += 1;
    player.lastBetWon = won;
    player.randomSide = randomSide;

    if (won)
    {
      player.totalAmountWon = player.totalAmountWon + int(player.lastBetAmount);
      player.numWins += 1;
      uint newAmount = playerBalances[_player] + (player.lastBetAmount * 2);
      playerBalances[_player] = newAmount;      
    }
    else {
      player.totalAmountWon = player.totalAmountWon - int(player.lastBetAmount);
      poolBalance += player.lastBetAmount * 2;
    }

    playersWaiting[_player] = false;
    console.log("  playerWaiting: %s", playersWaiting[_player]);
  }

	function playerWaiting(address player) public view returns (bool) {
    console.log("playerWaiting() called.");
    console.log("  playerWaiting: %s", playersWaiting[player]);
		return playersWaiting[player];
	}

	function clearPlayerWaiting(address player) public onlyOwner {
		playersWaiting[player] = false;
    console.log("playerWaiting: %s", playersWaiting[player]);
	}

  function maxBetAmount() public view returns (uint) {
    return poolBalance / 5;     
  }

  function placeBet(SIDE whichSide) public payable {
    console.log("placeBet() called.");
    uint256 betAmount = msg.value;
    address player = msg.sender;

    require (betAmount > 0, "Bet amount must be larger than 0.");
    require (betAmount <= maxBetAmount(), "Bet must be <= to maxBetAmount.");
		require (playersWaiting[player] == false, "Only 1 bet per player at a time.");

    poolBalance -= betAmount;
    emit poolBalanceChanged(poolBalance, maxBetAmount());

    playersWaiting[player] = true;
    console.log("  playerWaiting: %s", playersWaiting[player]);
    players[player].sideBet = whichSide;
    players[player].lastBetAmount = betAmount;

    uint queryId = flipCoin(player);
    emit betStarted(player, queryId, whichSide, betAmount);
  }

  function flipCoin(address _player) private returns(uint) {
    console.log("flipCoin() called.");
    uint queryId;

    //queryId = getRandom();
    queryId = testRandom();
    //players[msg.sender].queryId = queryId;
    playerRandomQueryIds[queryId] = _player;

    return queryId;
  }

  function __callback(uint _queryId, string memory _result, bytes memory _proof) public {
    console.log("__callback() called.");
    address player = playerRandomQueryIds[_queryId];

    SIDE randomSide = SIDE(uint256(keccak256(abi.encodePacked(_result))) % 2);
    players[player].randomSide = randomSide;
    // Player Won
    if (randomSide == players[player].sideBet) {
      updatePlayerInfo(true, randomSide);
      emit generatedRandomNumber(_queryId, randomSide, true);
    }
    // Player Lost
    else {
      poolBalance += (players[player].lastBetAmount * 2);
      emit poolBalanceChanged(poolBalance, maxBetAmount());

      updatePlayerInfo(false, randomSide);
      emit generatedRandomNumber(_queryId, randomSide, false);
    }
    playersWaiting[player] = false;
    console.log("  playerWaiting: %s", playersWaiting[player]);
  }

  function getRandom() payable public returns (uint) {
    //uint256 QUERY_EXECUTION_DELAY = 0;
    //uint256 GAS_FOR_CALLBACK = 200000;
    // bytes32 queryId = provable_newRandomDSQuery(QUERY_EXECUTION_DELAY, NUM_RANDOM_BYTES_REQUESTED, GAS_FOR_CALLBACK);
		uint queryId = 100;
	  return queryId;
  }

  function testRandom() public returns (uint) {
    console.log("testRandom() called.");
    uint queryId = uint(keccak256(abi.encodePacked(msg.sender)));
    uint side = block.timestamp % 2;
    string memory randomSide = (side == 0 ? "0" : "1");

    __callback(queryId, randomSide, bytes("test"));
    return queryId;
  }

  function withdrawAll() public onlyOwner {
    uint toTransfer = poolBalance;
    poolBalance = 0;
    emit poolBalanceChanged(poolBalance, 0);
    owner.transfer(toTransfer);
  }

  function withdrawBalance() public {
    address payable player = payable(msg.sender);
    uint amount = playerBalances[player];
    console.log("withdrawBalance() amount: %s", amount);
    playerBalances[player] = 0;
    player.transfer(amount);
  }
}