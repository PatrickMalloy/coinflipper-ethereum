//const NODE_URL = "http://127.0.0.1:8545/"; // Hardhat Local
//const provider = new ethers.providers.JsonRpcProvider(ROPSTEN_SPEEDY_NODE);

//const abi = require("./abi/CoinFlip.json");
//const provider = new ethers.providers.Web3Provider(window.ethereum, "any");
let provider;
if (typeof window.ethereum !== 'undefined') {
  provider = new ethers.providers.Web3Provider(window.ethereum);
}
let signer;
const contractAddress = "0x9a676e781a523b5d0c0e43731313a708cb607508"; // Hardhat Local
//const ownerAccount = "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266"; // Hardhat Account #0
//const contractAddress = "0x70997970C51812dc3A010C7d01b50e0d17dc79C8"; // Hardhat Account #1
let contractInstance;
let playerAccount = "0";
let bet_amount;
let coinSide;
let config;
let maxBet;
let currentQueryId;
let owner;

$(document).ready(function() {
  $("#login_button").click(login);
  $("#login_button").text(playerAccount !== "0" ? "Disconnect":"Connect Wallet");
  $("#fundContract_button").hide();
  $("#withdrawAll_button").hide();  
});

async function login() {
  await provider.send("eth_requestAccounts", []);
  signer = provider.getSigner();
  playerAccount = await signer.getAddress();
  console.log("playerAccount:", playerAccount); 
  if (playerAccount !== "0") {
    $("#login_button").text("Disconnect");
    $("#login_button").click(logout);
    contractInstance = new ethers.Contract(contractAddress, abi, signer);
    //console.log("contractInstance", contractInstance);
    owner = await contractInstance.owner();
    console.log("Contract Owner: ", owner);

    contractInstance.on("poolBalanceChanged", (bal, maxBet, ev) => {
      console.log(ev.event + ":" + bal);
      console.log("  maxBetAmount:" + maxBet);
      $("#poolBalance_output").text(ethers.utils.formatEther(bal));
      _maxBet=ethers.utils.formatEther(maxBet);
      $("#maxBetAmount_output").text(_maxBet);
    });

    $("#flip_button").prop('disabled', true);
    displayResult();
    //getPoolBalance();
    //getMaxBetAmount();
    //getPlayerInfo();
    $("#flip_button").click(flipCoin);
    $("#addFunds_button").click(addFunds);
    $("#withdrawFunds_button").click(withdrawFunds);
    $("#betAmount_input").change(checkFlipCoinReady);
    $("input[name='optionCoinSide']").change(checkFlipCoinReady);
    if (playerAccount == owner) {
      $("#fundContract_button").show().click(fundContract);
      $("#withdrawAll_button").show().click(withdrawAll);
    }
  };
};

function logout() {
  location.reload(true);
}

function getData() {
	bet_amount = $("#betAmount_input").val();
	coinSide = $("input[name='optionCoinSide']:checked").val();
	console.log("coinSide chosen: " + coinSide);
	config = {
		value: ethers.utils.parseEther(bet_amount)
	}
}

function checkFlipCoinReady() {
	getPoolBalance();
	getMaxBetAmount();
	playerWaiting = isWaiting();
	coinReady = $("input[name='optionCoinSide']:checked").val();
	console.log("coinReady: " + coinReady);
	betReady = $("#betAmount_input").val();
	if (betReady > 0 && betReady <= maxBet && coinReady && !playerWaiting)
		$("#flip_button").prop('disabled', false);
	else
	$("#flip_button").prop('disabled', true);
}

function getPoolBalance() {
	contractInstance.poolBalance().then(function(res) {
		$("#poolBalance_output").text(ethers.utils.formatEther(res));
		console.log("getPoolBalance: " + ethers.utils.formatEther(res));
	})
}

function flipCoin() {
	//alert("flip button pressed");
	//$('#waitModal').modal('show');
	getData();
	_config = {
		value: ethers.utils.parseEther(bet_amount)
	}

	contractInstance.placeBet(coinSide, _config)
		.then( () => {
			$('#waitModal').modal('show');
	});

	contractInstance.on("betStarted", (player, queryID, sideBet, amountBet, ev) => {
		currentQueryId = queryID;
		//$('#waitModal').modal('show');
		console.log(Date.now() + ": [" + ev.event + "]" + " queryId: " + currentQueryId);
		//console.log(JSON.stringify(ev, null, 4));
	});

	contractInstance.on("generatedRandomNumber", (queryID, randomNumber, won, ev) => {
		//setTimeout(() => { $('#waitModal').modal('hide'); }, 1000);
		console.log(Date.now() + ": [" + ev.event + "]");
		console.log("queryID: " + queryID);
		console.log(" randomNumber: " + randomNumber + "   won: " + won);
		//console.log(JSON.stringify(ev, null, 4));
		$('#waitModal').modal('hide');
		displayResult();
	});
}

function getMaxBetAmount() {
	contractInstance.maxBetAmount()
		.then(function(res) {
			let max = ethers.utils.formatEther(res);
			console.log("getMaxBetAmount", max);
			maxBet = max;
			$("#maxBetAmount_output").text(max);
		})
}

function getPlayerInfo() {
	contractInstance.getPlayerInfo().then(function(res) {
		console.log("Player info: ", res);
		$("#user_address").text(playerAccount);
		$("#total_bets").text(res.numTotalBets);
		$("#total_wins").text(res.numWins);
		$("#lifetime_winning").text(ethers.utils.formatEther(res.totalAmountWon));
		$("#sideShown_output").text(res.randomSide == 0 ? "Head" : "Tail");
		if (res.lastBetWon) {
			$("#win_output").text("Won");
			$("#win_output").css({'color': 'green'});
		}
		else {
			$("#win_output").text("Lost");
			$("#win_output").css({'color': 'red'});
		}
		$("#amountWon_output").text(ethers.utils.formatEther(res.lastBetAmount));
		getPlayerBalance();
	})
}

function isWaiting() {
	contractInstance.playerWaiting(playerAccount).then(function(res) {
		console.log("isWaiting: " + res);
		return res;
	})
}

function getPlayerBalance() {
	contractInstance.getPlayerBalance().then(function(res) {
		balance = ethers.utils.formatEther(res);
		$("#player_balance").text(balance);
		console.log("player balance: " + balance);
		if (balance == 0)
			$("#withdrawFunds_button").prop('disabled', true);
		else
			$("#withdrawFunds_button").prop('disabled', false);
	})
}

function displayResult() {
	getPoolBalance();
	getMaxBetAmount();
	getPlayerInfo();
}

function fundContract() {
	contractInstance.fundContract({value: ethers.utils.parseEther("1")})
		.then( () => {
			//getPoolBalance();
			//getMaxBetAmount();
		})

}

function withdrawAll() {
	contractInstance.withdrawAll()
		.then( () => {
			//getPoolBalance();
			//getMaxBetAmount();
		})
}

function addFunds() {
	let addFunds_amount = $("#addFunds_input").val();

	config = {
		value: ethers.utils.parseEther(addFunds_amount)
	}

	contractInstance.addPlayerFunds({value: ethers.utils.parseEther(addFunds_amount)})
		.then( () => {
			getPlayerBalance();
		})
}

async function withdrawFunds() {
	/*contractInstance.withdrawBalance()
		.then( () => {
			getPlayerBalance();
	})*/
  await contractInstance.withdrawBalance();
  getPlayerBalance();
}