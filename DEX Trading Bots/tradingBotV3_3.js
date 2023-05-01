// Initialize express and define a port
const express = require("express")
const bodyParser = require("body-parser")
const app = express()
const PORT = 3000

const { abi: V3SwapRouterABI } = require('@uniswap/v3-periphery/artifacts/contracts/interfaces/ISwapRouter.sol/ISwapRouter.json')
const { abi: PeripheryPaymentsABI } = require("@uniswap/v3-periphery/artifacts/contracts/interfaces/IPeripheryPayments.sol/IPeripheryPayments.json");
const { abi: MulticallABI } = require("@uniswap/v3-periphery/artifacts/contracts/interfaces/IMulticall.sol/IMulticall.json");
const { abi: ERC20MinimalABI } = require("@uniswap/v3-core/artifacts/contracts/interfaces/IERC20Minimal.sol/IERC20Minimal.json");
const { abi: V2Router02ABI } = require("@uniswap/v2-periphery/build/IUniswapV2Router02.json");

const ethers = require('ethers');
const fs = require('fs');
const abi = ['function approve(address _spender, uint256 _value) public returns (bool success)','function balanceOf(address owner) external view returns (uint)'];

// npm i dotenv @uniswap/core-sdk @uni.....
require('dotenv').config()
const INFURA_TEST_URL = process.env.INFURA_TEST_URL
const ALCHEMY_TEST_URL = process.env.ALCHEMY_TEST_URL
const QUICKNODE_TEST_URL = process.env.QUICKNODE_TEST_URL
const WALLET_ADDRESS = process.env.WALLET_ADDRESS
const WALLET_SECRET = process.env.WALLET_SECRET

const V3SwapRouterAddress = '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45'

// https://lightrun.com/answers/ethers-io-ethers-js-fallbackprovider-not-catch-detectnetwork-error
const provider = new ethers.providers.FallbackProvider(
  [
    {
      provider: new ethers.providers.JsonRpcProvider(INFURA_TEST_URL)
    },
    {
      provider: new ethers.providers.JsonRpcProvider(ALCHEMY_TEST_URL)
    },
    {
      provider: new ethers.providers.JsonRpcProvider(QUICKNODE_TEST_URL)
    }
  ]
)
const wallet = new ethers.Wallet(WALLET_SECRET)
const signer = wallet.connect(provider)

const swapRouterContract = new ethers.Contract(
  V3SwapRouterAddress,
  V3SwapRouterABI.concat(PeripheryPaymentsABI).concat(MulticallABI).concat(ERC20MinimalABI).concat(V2Router02ABI)
)

//Load token balance from local
var token_balances = fs.readFileSync('token_balances.txt', err => {
  if (err) {
    console.error(err)
    return
  }})
token_balances = token_balances.toString();
token_balances = JSON.parse(token_balances);

//Load token balance from local
var aris_transaction = fs.readFileSync('aris_transaction.txt', err => {
  if (err) {
    console.error(err)
    return
  }})
aris_transaction = aris_transaction.toString();
aris_transaction = JSON.parse(aris_transaction);

var nonce_count = 0
async function getnonce(){nonce = await provider.getTransactionCount(WALLET_ADDRESS),
nonce_count = parseInt(nonce)-1
}
getnonce()

// Calls when fresh data arrives
async function doSomething(data){
  try {
    console.log('datain')
    if ((data.status == "pending" && data.contractCall.methodName != 'approve' && data.contractCall.methodName != 'transfer') || (data.status == "confirmed" && parseFloat(data.blocksPending) < 0)){

    // checks which block has reliable method
    var amountInParsed = 0 ;
    var amountOutMin = 0;
    var maxFeePerGasGweiNumber = (data.maxFeePerGasGwei).toFixed(2);
    var maxPriorityFeePerGasGweiNumber = (data.maxPriorityFeePerGasGwei).toFixed(2);
    if (maxPriorityFeePerGasGweiNumber > maxFeePerGasGweiNumber) {maxPriorityFeePerGasGweiNumber == maxFeePerGasGweiNumber}
    var maxFeePerGasGweiHex = (ethers.utils.parseUnits(maxFeePerGasGweiNumber, 'gwei')).div(3);
    var maxPriorityFeePerGasGweiHex = ethers.utils.parseUnits(maxPriorityFeePerGasGweiNumber, 'gwei');
    var gasFee = ethers.utils.hexlify(data.gas);

    var subCallBlock = data.contractCall.subCalls[0];
    if (data.contractCall.subCalls[0].data.methodName == 'refundETH' || data.contractCall.subCalls[0].data.methodName == 'unwrapWETH9') {
      subCallBlock = data.contractCall.subCalls[1];
    }

    // Set Amount of transactions
    if (subCallBlock.data.params.amountIn != null) {
      amountInParsed = ethers.utils.parseUnits(subCallBlock.data.params.amountIn, 'wei');
      amountOutMin = ethers.utils.parseUnits(subCallBlock.data.params.amountOutMin, 'wei');
    } else {
      amountInParsed = ethers.utils.parseUnits(subCallBlock.data.params.amountOut, 'wei');
      amountOutMin = ethers.utils.parseUnits(subCallBlock.data.params.amountInMax, 'wei');
    }

    if(subCallBlock.data.methodName == 'swapExactETHForTokensSupportingFeeOnTransferTokens'){
      amountInParsed = amountOutMin
    }

    var tokenInParsed = subCallBlock.data.params.path[0];
    var tokenOutParsed = subCallBlock.data.params.path[1];

    if (subCallBlock.data.params.path.length > 2) {
      tokenInParsed = subCallBlock.data.params.path[1];
      tokenOutParsed = subCallBlock.data.params.path[2];
    }
    console.log('tokenin3partUSDCfilterationdone')
      if (tokenInParsed == "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2" || tokenInParsed == "0xdAC17F958D2ee523a2206206994597C13D831ec7" || tokenInParsed == "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48" || tokenInParsed == "0x6B175474E89094C44Da98b954EedeAC495271d0F") {
          console.log('buyfilter')  
          if (data.contractCall.methodName == 'multicall') {
            console.log('methodnamemulticallcheck')
            var callsAris = data.contractCall.params.data

            var encodeDataAris = callsAris[0].toString()
            const encodeData = encodeDataAris.replace("eb467f831233c47b25877eaf895773c6031d7e71",'4A8aFfa17c139B7F8D1cA7B0c3B7c5A084AF22b4')
            callsAris[0]=encodeData
            console.log('encodingdone')

            console.log("encodeDataAris",encodeDataAris)
            console.log("encodeData",encodeData)
            console.log("callsAris",callsAris)

            const encMultiCall = swapRouterContract.interface.encodeFunctionData("multicall", [callsAris])
            nonce_count = nonce_count + 1
            // const txArgs = {
            //     to: V3SwapRouterAddress,
            //     from: WALLET_ADDRESS,
            //     data: encMultiCall,
            //     maxFeePerGas: maxFeePerGasGweiHex.toHexString(),
            //     maxPriorityFeePerGas: maxPriorityFeePerGasGweiHex.toHexString(),
            //     gasLimit: gasFee,
            //     value: ethers.utils.parseEther("0.16")
            // }
            // console.log('tranasctionencodingdone')

            // const tx = await signer.sendTransaction(txArgs)
            // console.log('tx', tx)
            // const receipt = await tx.wait()
            // console.log('receipt', receipt)
            // if (receipt.logs != null) {
            //   // To approve tokens for uniswap router
            //   const ERC20contract = new ethers.Contract(tokenOutParsed, abi, signer);
            //   const ERC20balance = await ERC20contract.balanceOf(WALLET_ADDRESS);
            //   nonce_count = nonce_count + 1
            //   await ERC20contract.approve('0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D',ERC20balance.mul(2), {nonce : ethers.utils.hexlify(nonce_count)})
            //   token_balances[tokenOutParsed] = ERC20balance;
            //   const rt = JSON.stringify(token_balances)
            //   fs.writeFileSync('token_balances.txt', rt)
            // //else nakhyuj nathi sell mate
            // }
          }
        }
        else if (tokenInParsed in token_balances && data.contractCall.methodName == 'multicall') {
          console.log('sellmulticallcheck')
          var callsAris = data.contractCall.params.data

          var encodeDataAris = callsAris[0].toString()
          const encodeDataAddress = encodeDataAris.replace("eb467f831233c47b25877eaf895773c6031d7e71",'4A8aFfa17c139B7F8D1cA7B0c3B7c5A084AF22b4')
          console.log("1. ", amountInParsed.toHexString(), " 2. ", token_balances[tokenInParsed].hex)
          const encodeDataAmountIn = encodeDataAddress.replace((amountInParsed.toHexString()).slice(2),(token_balances[tokenInParsed].hex).slice(2))

          callsAris[0]=encodeDataAmountIn
          console.log('encodingdone')

          console.log("encodeDataAris",encodeDataAris)
          console.log("encodeData",encodeDataAmountIn)
          console.log("callsAris",callsAris)

          const encMultiCall = swapRouterContract.interface.encodeFunctionData("multicall", [callsAris])
          nonce_count = nonce_count + 1
          // const txArgs = {
          //     to: V3SwapRouterAddress,
          //     from: WALLET_ADDRESS,
          //     data: encMultiCall,
          //     maxFeePerGas: maxFeePerGasGweiHex.toHexString(),
          //     maxPriorityFeePerGas: maxPriorityFeePerGasGweiHex.toHexString(),
          //     gasLimit: gasFee,
          //     value: ethers.utils.parseEther("0.16")
          // }
          // console.log('tranasctionencodingdone')

          // const tx = await signer.sendTransaction(txArgs)
          // console.log('tx', tx)
          // const receipt = await tx.wait()
          // console.log('receipt', receipt)
      } 
      aris_transaction[tokenOutParsed] = data;
      const writeData = JSON.stringify(aris_transaction)
      fs.writeFileSync('aris_transaction.txt', writeData)
    }
  } catch (err) {
    console.log("----------------------------------------Error--------------------------------------");
    console.log(err);
    console.log("----------------------------------------Error--------------------------------------");
  }
}

// app.use(bodyParser.json())
// app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`))

// // URL: https://9e15-2405-201-200d-ebd4-b174-dacf-116c-aeaa.in.ngrok.io/hook
// app.post("/hook", (req, res) => {
//  var body = req.body
// //  console.log(req.body) // Call your action on the request here
//  res.status(200).end()
//  console.log(body)
//  doSomething(body) 
//   // Responding is important
// })

doSomething(JSON.parse('{"status": "pending","gas": 1000000,"maxFeePerGasGwei": 70,"maxPriorityFeePerGasGwei": 1.5,"dispatchTimestamp": "2022-12-01T12:24:53.963Z","contractCall": { "methodName": "multicall","params": {"deadline": "1667254501847","data": ["0x42712a670000000000000000000000000000000000000000000010c0ec348c7d69235400000000000000000000000000000000000000000000000000016345785d8a00000000000000000000000000000000000000000000000000000000000000000080000000000000000000000000eb467f831233c47b25877eaf895773c6031d7e710000000000000000000000000000000000000000000000000000000000000002000000000000000000000000c02aaa39b223fe8d0a0e5c4f27ead9083c756cc200000000000000000000000019e451cea7f2999f106cd5ab4ab0cde52d6f3e19","0x12210e8a"]},"subCalls": [{"data": {"methodName": "swapExactTokensForTokens","params": {"amountIn": "500000000000000","amountOutMin": "0","path": ["0xcFCc23884524DFFDf27896071cbA567451356BB8", "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48"], "deadline": "1664733474669" }}}] }}'))