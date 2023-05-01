// Require express, body-parser, ethers
const express = require("express")
const bodyParser = require("body-parser")
const ethers = require('ethers');
const fs = require('fs');
const abi = ['function approve(address _spender, uint256 _value) public returns (bool success)','function balanceOf(address owner) external view returns (uint)'];

//Load token balance from local
// var token_balances = fs.readFileSync('token_balances.txt', err => {
//   if (err) {
//     console.error(err)
//     return
//   }})
// token_balances = token_balances.toString();
// token_balances = JSON.parse(token_balances);

// Initialize express and define a port
const app = express()
const PORT = 3000

const addresses = {
  WETH: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
  router: '0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D',
  recipient: '0x4A8aFfa17c139B7F8D1cA7B0c3B7c5A084AF22b4'
}

const mnemonic = 'd97fc79e58573451873bc8e9f73165559d7fc53a5979922fd2f6088be4fcc51e';

const provider = new ethers.providers.AlchemyProvider("homestead", '45gNIRViOhvLosZx4_FFdPMVvxYauBTd');
// const provider = new ethers.providers.FallbackProvider(
//   [
//     {
//       provider: new ethers.providers.WebSocketProvider("wss://mainnet.infura.io/ws/v3/2d59854215484d6284d19203d8f4197b")
//     },
//     {
//       provider: new ethers.providers.WebSocketProvider("wss://eth-mainnet.g.alchemy.com/v2/45gNIRViOhvLosZx4_FFdPMVvxYauBTd")
//     }
//   ]
// )
const wallet = new ethers.Wallet(mnemonic);
const account = wallet.connect(provider);

// Get actual nonce from account
var nonce_count = 0
async function getnonce(){
  nonce = await provider.getTransactionCount('0x4A8aFfa17c139B7F8D1cA7B0c3B7c5A084AF22b4'),
  nonce_count = parseInt(nonce)-1
}
getnonce()

var tokens_list = []

const router = new ethers.Contract(
  addresses.router,
  [
    'function getAmountsOut(uint amountIn, address[] memory path) public view returns (uint[] memory amounts)',
    'function swapExactTokensForTokens(uint amountIn, uint amountOutMin, address[] calldata path, address to, uint deadline) external returns (uint[] memory amounts)',
    'function swapTokensForExactTokens(uint amountOut, uint amountInMax, address[] calldata path, address to, uint deadline) external returns (uint[] memory amounts)',
    'function swapExactETHForTokens(uint amountOutMin, address[] calldata path, address to, uint deadline) external payable returns (uint[] memory amounts)',
    'function swapTokensForExactETH(uint amountOut, uint amountInMax, address[] calldata path, address to, uint deadline) external returns (uint[] memory amounts)',
    'function swapExactTokensForETH(uint amountIn, uint amountOutMin, address[] calldata path, address to, uint deadline) external returns (uint[] memory amounts)',
    'function swapETHForExactTokens(uint amountOut, address[] calldata path, address to, uint deadline) external payable returns (uint[] memory amounts)',
    'function swapExactTokensForTokensSupportingFeeOnTransferTokens(uint amountIn, uint amountOutMin, address[] calldata path, address to, uint deadline) external',
    'function swapExactETHForTokensSupportingFeeOnTransferTokens(uint amountOutMin, address[] calldata path, address to, uint deadline) external payable',
    'function swapExactTokensForETHSupportingFeeOnTransferTokens(uint amountIn, uint amountOutMin, address[] calldata path, address to, uint deadline) external'
  ],
  account
);

token_data = { "token_out" : {"data": "internal"}}

// Calls when fresh data arrives
async function doSomething(data,wants_to_trade){
  try {
    if ((data.status == "pending" && data.contractCall.methodName != 'approve') || (data.status == "confirmed" && parseFloat(data.blocksPending) < 0)){
      var amountIn = 0 ;
      var amountOutMin = 0;
      var tokenIn = data.contractCall.params.path[0];
      var tokenOut = data.contractCall.params.path[1];
      var maxFeePerGasGweiNumber = (data.maxFeePerGasGwei).toFixed(2);
      var maxPriorityFeePerGasGweiNumber = (data.maxPriorityFeePerGasGwei).toFixed(2);
      if (maxPriorityFeePerGasGweiNumber >= 3){maxPriorityFeePerGasGweiNumber = (parseInt(maxPriorityFeePerGasGweiNumber) + 0.5).toFixed(2).toString()}
      if (maxPriorityFeePerGasGweiNumber > maxFeePerGasGweiNumber) {maxPriorityFeePerGasGweiNumber == maxFeePerGasGweiNumber}
      var maxFeePerGasGweiHex = ethers.utils.parseUnits(maxFeePerGasGweiNumber, 'gwei');
      var maxPriorityFeePerGasGweiHex = ethers.utils.parseUnits(maxPriorityFeePerGasGweiNumber, 'gwei');

      var gasFee = data.gas;
      gasFee = ethers.utils.hexlify(gasFee);

      token_data[tokenOut.toLowerCase()] = data
      if (wants_to_trade) {} else {return "Bye"}

      // Set Amount of transactions
      if (data.contractCall.params.amountIn != null) {
        amountIn = data.contractCall.params.amountIn
        amountOutMin = data.contractCall.params.amountOutMin
        if (parseInt(amountIn) > 100000000000000000) 
           {amountIn = '100000000000000000'}
      } else {
        amountIn = data.contractCall.params.amountOut
        amountOutMin = data.contractCall.params.amountInMax
        if (parseInt(amountOutMin) > 100000000000000000) 
           {amountOutMin = '100000000000000000'}
      }

      amountIn = ethers.utils.parseUnits(amountIn, 'wei');
      amountOutMin = ethers.utils.parseUnits(amountOutMin, 'wei');

      const path = data.contractCall.params.path;
      const deadline = ethers.utils.hexlify(Date.now() + 1000 * 60 * 10);
      
      if (tokenIn == "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2" || tokenIn == "0xdAC17F958D2ee523a2206206994597C13D831ec7" || tokenIn == "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48" || tokenIn == "0x6B175474E89094C44Da98b954EedeAC495271d0F") {
        const readingTimeStamp = new Date
        const sendersDispatchTimeStamp = new Date(data.dispatchTimestamp)
        console.log(sendersDispatchTimeStamp - readingTimeStamp)

        if (tokens_list.filter(token => token == tokenOut).length != 0) {
          return "token present";
        } else {
          tokens_list.push(tokenOut)
        }

        // If delay is greater than 3sec => Don't buy
        if ((readingTimeStamp - sendersDispatchTimeStamp) < 3000) { 

          if ("swapExactTokensForTokens" == data.contractCall.methodName) {
            console.log("methodchosen - swapExactTokensForTokens");
            nonce_count = nonce_count + 1
            const tx = await router.swapExactTokensForTokens(
              amountIn.toHexString(),
              amountOutMin.toHexString(),
              path,
              addresses.recipient,
              deadline,{
                maxFeePerGas: maxFeePerGasGweiHex.toHexString(),
                maxPriorityFeePerGas: maxPriorityFeePerGasGweiHex.toHexString(),
                gasLimit : gasFee,
                nonce : ethers.utils.hexlify(nonce_count)
              }
            );
            const receipt = await tx.wait();
            console.log('Transaction receipt');
            console.log(receipt); 
            if (receipt.logs != null) {
              //To approve tokens for uniswap router
              const ERC20contract = new ethers.Contract(tokenOut, abi, account);
              const ERC20balance = await ERC20contract.balanceOf(addresses.recipient);
              nonce_count = nonce_count + 1
              await ERC20contract.approve('0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D',ERC20balance.mul(2), {nonce : ethers.utils.hexlify(nonce_count)})
              token_balances[tokenOut] = ERC20balance;
              const rt = JSON.stringify(token_balances)
              fs.writeFileSync('token_balances.txt', rt)
            }

          } else if ("swapTokensForExactTokens" == data.contractCall.methodName) {
              console.log("methodchosen - swapTokensForExactTokens");
              nonce_count = nonce_count + 1
              const tx = await router.swapTokensForExactTokens(
                amountIn.toHexString(),
                amountOutMin.toHexString(),
                path,
                addresses.recipient,
                deadline,{
                  maxFeePerGas: maxFeePerGasGweiHex.toHexString(),
                  maxPriorityFeePerGas: maxPriorityFeePerGasGweiHex.toHexString(),
                  gasLimit : gasFee,
                  nonce : ethers.utils.hexlify(nonce_count)
                }
              );
              const receipt = await tx.wait();
              console.log('Transaction receipt');
              console.log(receipt); //create txt file where all the files to be approved goes, approval takes place in another module
              if (receipt.logs != null) {
                //To approve tokens for uniswap router
                const ERC20contract = new ethers.Contract(tokenOut, abi, account);
                const ERC20balance = await ERC20contract.balanceOf(addresses.recipient);
                nonce_count = nonce_count + 1
                await ERC20contract.approve('0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D',ERC20balance.mul(2), {nonce : ethers.utils.hexlify(nonce_count)})
                token_balances[tokenOut] = ERC20balance;
                const rt = JSON.stringify(token_balances)
                fs.writeFileSync('token_balances.txt', rt)
              }

            } else if ("swapExactTokensForTokensSupportingFeeOnTransferTokens" == data.contractCall.methodName) {
              console.log("methodchosen - swapExactTokensForTokensSupportingFeeOnTransferTokensBuying");
              nonce_count = nonce_count + 1
              const tx = await router.swapExactTokensForTokensSupportingFeeOnTransferTokens(
                amountIn.toHexString(),
                amountOutMin.toHexString(),
                path,
                addresses.recipient,
                deadline,{
                  maxFeePerGas: maxFeePerGasGweiHex.toHexString(),
                  maxPriorityFeePerGas: maxPriorityFeePerGasGweiHex.toHexString(),
                  gasLimit : gasFee,
                  nonce : ethers.utils.hexlify(nonce_count)
                }
              );
              const receipt = await tx.wait();
              console.log('Transaction receipt');
              console.log(receipt); //create txt file where all the files to be approved goes, approval takes place in another module
              if (receipt.logs != null) {
                //To approve tokens for uniswap router
                const ERC20contract = new ethers.Contract(tokenOut, abi, account);
                const ERC20balance = await ERC20contract.balanceOf(addresses.recipient);
                nonce_count = nonce_count + 1
                await ERC20contract.approve('0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D',ERC20balance.mul(2), {nonce : ethers.utils.hexlify(nonce_count)})              
                token_balances[tokenOut] = ERC20balance;
                const rt = JSON.stringify(token_balances)
                fs.writeFileSync('token_balances.txt', rt)
              }
            }
          }
        } 
          else if ("swapExactTokensForTokensSupportingFeeOnTransferTokens" == data.contractCall.methodName && tokenIn in token_balances) {
            console.log("methodchosen - swapExactTokensForTokensSupportingFeeOnTransferTokensSelling");
            nonce_count = nonce_count + 1
            var newmaxPriorityFeePerGasGweiNumber = (parseInt(maxPriorityFeePerGasGweiNumber)*1.1).toFixed(2).toString()
            const tx = await router.swapExactTokensForTokensSupportingFeeOnTransferTokens(
              token_balances[tokenIn].hex, 
              amountOutMin.toHexString(),
              [tokenIn, tokenOut],
              addresses.recipient,
              deadline,{
                maxFeePerGas: maxFeePerGasGweiHex.toHexString(),
                maxPriorityFeePerGas: (ethers.utils.parseUnits(newmaxPriorityFeePerGasGweiNumber, 'gwei')).toHexString(),
                gasLimit : gasFee,
                nonce : ethers.utils.hexlify(nonce_count)
              }
            );
            const receipt = await tx.wait();
            console.log('Transaction receipt');
            console.log(receipt);

            //nonce nathi
            if (receipt.logs != null) {
            const ERC20contract = new ethers.Contract(tokenIn, abi, account);
            const ERC20balance = await ERC20contract.balanceOf(addresses.recipient);
            token_balances[tokenOut] = ERC20balance;
            const rt = JSON.stringify(token_balances)
            fs.writeFileSync('token_balances.txt', rt)
            }
          } 
          
    }
  } catch (err) {
    console.log("----------------------------------------Error--------------------------------------");
    console.log(err);
    console.log("----------------------------------------Error--------------------------------------");
  }
}

async function readFileAndTrade(tokenOutFromTwitter){
  doSomething(token_data[tokenOutFromTwitter.toLowerCase()], true)
}

app.use(bodyParser.json())
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`))

// URL: https://ad5c-2405-201-200d-e1b4-9c62-63-4481-9a72.in.ngrok.io/hook
app.post("/hook", (req, res) => {
 var body = req.body
 console.log(req.query.twitter_contract_address) // Call your action on the request here
 res.status(200).end()
 if (req.query.twitter_contract_address != undefined) {
    readFileAndTrade(req.query.twitter_contract_address)
 } else {
    doSomething(body, false)
  } 
})

// doSomething(JSON.parse('{"status": "pending","contractCall": { "methodName": "swapTokensForExactTokens", "params": {"amountIn": "5000000000000000","amountOutMin": "100000","path": ["0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2", "0xdAC17F958D2ee523a2206206994597C13D831ec7"], "deadline": "1664733474669" } }}'))
