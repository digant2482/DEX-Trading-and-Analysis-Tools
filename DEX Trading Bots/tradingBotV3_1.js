// Initialize express and define a port
const express = require("express")
const bodyParser = require("body-parser")
const app = express()
const PORT = 3000

const ethers = require('ethers');
const fs = require('fs');
const abi = ['function approve(address _spender, uint256 _value) public returns (bool success)','function balanceOf(address owner) external view returns (uint)'];

// npm i dotenv @uniswap/core-sdk @uni.....
require('dotenv').config()
const INFURA_TEST_URL = process.env.INFURA_TEST_URL
const WALLET_ADDRESS = process.env.WALLET_ADDRESS
const WALLET_SECRET = process.env.WALLET_SECRET

const { abi: V3SwapRouterABI } = require('@uniswap/v3-periphery/artifacts/contracts/interfaces/ISwapRouter.sol/ISwapRouter.json')
const { abi: PeripheryPaymentsABI } = require("@uniswap/v3-periphery/artifacts/contracts/interfaces/IPeripheryPayments.sol/IPeripheryPayments.json");
const { abi: MulticallABI } = require("@uniswap/v3-periphery/artifacts/contracts/interfaces/IMulticall.sol/IMulticall.json");
const { abi: ERC20MinimalABI } = require("@uniswap/v3-core/artifacts/contracts/interfaces/IERC20Minimal.sol/IERC20Minimal.json");
const { abi: V2Router02ABI } = require("@uniswap/v2-periphery/build/IUniswapV2Router02.json");

const V3SwapRouterAddress = '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45'

const provider = new ethers.providers.WebSocketProvider(INFURA_TEST_URL)
const wallet = new ethers.Wallet(WALLET_SECRET)
const signer = wallet.connect(provider)

const swapRouterContract = new ethers.Contract(
  V3SwapRouterAddress,
  V3SwapRouterABI.concat(PeripheryPaymentsABI).concat(MulticallABI).concat(ERC20MinimalABI).concat(V2Router02ABI)
)

const router = new ethers.Contract(
  V3SwapRouterAddress,
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
  signer
);

//Load token balance from local
var token_balances = fs.readFileSync('token_balances.txt', err => {
  if (err) {
    console.error(err)
    return
  }})
token_balances = token_balances.toString();
token_balances = JSON.parse(token_balances);

var nonce_count = 0
async function getnonce(){nonce = await provider.getTransactionCount(WALLET_ADDRESS),
nonce_count = parseInt(nonce)-1
}
getnonce()

// Calls when fresh data arrives
async function doSomething(data){
  try {
    // checks which block has reliable method
    var subCallBlock = data.contractCall.subCalls[0];
    if (data.contractCall.subCalls[0].data.methodName == 'refundETH') {
      subCallBlock = data.contractCall.subCalls[1];
    }

    if ((data.status == "pending" && subCallBlock.data.methodName != 'approve') || (data.status == "confirmed" && parseFloat(data.blocksPending) < 0)){

      var amountInParsed = 0 ;
      var amountOutMin = 0;
      var tokenInParsed = subCallBlock.data.params.path[0];
      var tokenOutParsed = subCallBlock.data.params.path[1];
      var maxFeePerGasGweiNumber = (data.maxFeePerGasGwei).toFixed(2);
      var maxPriorityFeePerGasGweiNumber = (data.maxPriorityFeePerGasGwei).toFixed(2);
      if (maxPriorityFeePerGasGweiNumber > maxFeePerGasGweiNumber) {maxPriorityFeePerGasGweiNumber == maxFeePerGasGweiNumber}
      var maxFeePerGasGweiHex = (ethers.utils.parseUnits(maxFeePerGasGweiNumber, 'gwei')).mul(2);
      var maxPriorityFeePerGasGweiHex = ethers.utils.parseUnits(maxPriorityFeePerGasGweiNumber, 'gwei');
      var gasFee = ethers.utils.hexlify(data.gas);

      // Set Amount of transactions
      if (subCallBlock.data.params.amountIn != null) {
        amountInParsed = ethers.utils.parseUnits(subCallBlock.data.params.amountIn, 'wei');
        amountOutMin = ethers.utils.parseUnits(subCallBlock.data.params.amountOutMin, 'wei');
      } else {
        amountInParsed = ethers.utils.parseUnits(subCallBlock.data.params.amountOut, 'wei');
        amountOutMin = ethers.utils.parseUnits(subCallBlock.data.params.amountInMax, 'wei');
      }

      amountInParsed = ethers.utils.parseUnits(amountInParsed.toString(), 'wei');
      amountOutMin = ethers.utils.parseUnits(amountOutMin.toString(), 'wei');

      if (subCallBlock.data.params.path.length > 2) {
        tokenInParsed = subCallBlock.data.params.path[1];
        tokenOutParsed = subCallBlock.data.params.path[2];
      }
      
      console.log("Decode Input Single Token ::: ",swapRouterContract.interface.decodeFunctionData("swapTokensForExactTokens","0x8803dbee0000000000000000000000000000000000000000204efa9c1475d9b2d816400000000000000000000000000000000000000000000000000001b667a56d4880000000000000000000000000000000000000000000000000000000000000000080000000000000000000000000eb467f831233c47b25877eaf895773c6031d7e710000000000000000000000000000000000000000000000000000000000000002000000000000000000000000c02aaa39b223fe8d0a0e5c4f27ead9083c756cc2000000000000000000000000099c5c9415e8cbda538bdb7c5a4a361e3b7abe77"))
      //console.log("Decode Swap Token with v2 abi::: ",router.interface.decodeFunctionData("swapTokensForExactTokens","0x8803dbee0000000000000000000000000000000000000000000000000000b4f8aa2d8900000000000000000000000000000000000000000000000000016345785d8a000000000000000000000000000000000000000000000000000000000000000000a0000000000000000000000000eb467f831233c47b25877eaf895773c6031d7e71000000000000000000000000000000000000000000000000000001842f1884810000000000000000000000000000000000000000000000000000000000000002000000000000000000000000c02aaa39b223fe8d0a0e5c4f27ead9083c756cc20000000000000000000000001430bbcaaf051c83e83bca63891bc3146bf3c2ea"))
      //console.log("Decode Swap Token ::: ",swapRouterContract.interface.decodeFunctionData("swapTokensForExactTokens","0x8803dbee0000000000000000000000000000000000000000000000000000b4f8aa2d8900000000000000000000000000000000000000000000000000016345785d8a00000000000000000000000000000000000000000000000000000000000000000080000000000000000000000000eb467f831233c47b25877eaf895773c6031d7e710000000000000000000000000000000000000000000000000000000000000002000000000000000000000000c02aaa39b223fe8d0a0e5c4f27ead9083c756cc20000000000000000000000001430bbcaaf051c83e83bca63891bc3146bf3c2ea"))
      //console.log("Decode Refund ETH ::: ",swapRouterContract.interface.decodeFunctionData("refundETH","0x12210e8a"))
      //console.log("Decode MultiCall ::: ",swapRouterContract.interface.decodeFunctionData("multicall","0xac9650d80000000000000000000000000000000000000000000000000000000000000020000000000000000000000000000000000000000000000000000000000000000200000000000000000000000000000000000000000000000000000000000000400000000000000000000000000000000000000000000000000000000000000180000000000000000000000000000000000000000000000000000000000000010438ed17390000000000000000000000000000000000000000000000000001c6bf52634000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000a00000000000000000000000004a8affa17c139b7f8d1ca7b0c3b7c5a084af22b400000000000000000000000000000000000000000000000000000000635d80030000000000000000000000000000000000000000000000000000000000000002000000000000000000000000c02aaa39b223fe8d0a0e5c4f27ead9083c756cc2000000000000000000000000a0b86991c6218b36c1d19d4a2e9eb0ce3606eb4800000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000412210e8a00000000000000000000000000000000000000000000000000000000"))
      if (tokenInParsed == "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2" || tokenInParsed == "0xdAC17F958D2ee523a2206206994597C13D831ec7" || tokenInParsed == "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48" || tokenInParsed == "0x6B175474E89094C44Da98b954EedeAC495271d0F") {
        const readingTimeStamp = new Date
        const sendersDispatchTimeStamp = new Date(data.dispatchTimestamp)
        //console.log("Delay between dispatch and reading time ::: ", readingTimeStamp - sendersDispatchTimeStamp)

        // If delay is greater than 3sec => Don't buy
        if ((readingTimeStamp - sendersDispatchTimeStamp) < 3000) { 
          if ("swapExactTokensForTokens" == subCallBlock.data.methodName) {
            // nonce_count = nonce_count + 1
            // console.log("swapRouter",swapRouterContract)
            
            // const params1 = [
            //   amountInParsed.toHexString(),
            //   amountOutMin.toHexString(),
            //   subCallBlock.data.params.path,
            //   WALLET_ADDRESS,
            //   ethers.utils.hexlify(Math.floor(Date.now() / 1000) + (60 * 10))
            // ]

            const params1 = [
              ethers.utils.parseUnits("198980100000000", 'wei'),
              ethers.utils.parseUnits("100000000000000000", 'wei'),
              [
                "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",
                "0x1430bbCAaF051c83E83Bca63891bc3146BF3C2eA"
              ],
              "0xeb467f831233c47b25877eaf895773c6031d7e71",
              ethers.utils.hexlify(2)
            ]
            //const yyy = ethers.utils.arrayify(params1)
            console.log()
            console.log("param1",params1) 
            console.log("Big to Str",0x02.toString()) 
            console.log(swapRouterContract.interface.getSighash("swapTokensForExactTokens"))
            // const encData1 = swapRouterContract.interface.functions.swapExactTokensForTokens(params1).encodeABI();
            const encData1 = swapRouterContract.interface.encodeFunctionData("swapTokensForExactTokens", params1)

            const params5 = {
              tokenIn: tokenInParsed,
              tokenOut: tokenOutParsed,
              fee: 3000,
              recipient: WALLET_ADDRESS,
              deadline: Math.floor(Date.now() / 1000) + (60 * 10),
              amountIn: ethers.utils.parseEther("0.001"),
              amountOutMinimum: 0,
              sqrtPriceLimitX96: 0
          }
            console.log(ethers.utils.arrayify(params5))
          //   console.log("param1",params1) 
          //   const encData1 = swapRouterContract.interface.encodeFunctionData("exactInputSingle", [params1])

            // const encData1 = iface.encodeFunctionData('swapExactTokensForTokens', params1)

            console.log("encData1",encData1)
            const encData2 = swapRouterContract.interface.encodeFunctionData("refundETH", [])
            // const encData2 = swapRouterContract.interface.functions.refundETH().encodeABI();
            console.log("encData2",encData2)

            const calls = [encData1, encData2]
            console.log(typeof(calls))
            const encMultiCall = swapRouterContract.interface.encodeFunctionData("multicall", [calls])
            //console.log(encMultiCall)
            // const txArgs = {
            //     to: V3SwapRouterAddress,
            //     from: WALLET_ADDRESS,
            //     data: encMultiCall,
            //     maxFeePerGas: maxFeePerGasGweiHex.toHexString(),
            //     maxPriorityFeePerGas: maxPriorityFeePerGasGweiHex.toHexString(),
            //     gasLimit: gasFee,
            //     value: ethers.utils.parseEther("0.01")
            // }

            // const tx = await signer.sendTransaction(txArgs)
            // console.log('tx', tx)
            // const receipt = await tx.wait()
            // console.log('receipt', receipt)
            // if (receipt.logs != null) {
            //   //To approve tokens for uniswap router
            //   const ERC20contract = new ethers.Contract(tokenOutParsed, abi, signer);
            //   const ERC20balance = await ERC20contract.balanceOf(WALLET_ADDRESS);
            //   nonce_count = nonce_count + 1
            //   await ERC20contract.approve('0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D',ERC20balance.mul(2), {nonce : ethers.utils.hexlify(nonce_count)})
            //   token_balances[tokenOutParsed] = ERC20balance;
            //   const rt = JSON.stringify(token_balances)
            //   fs.writeFileSync('token_balances.txt', rt)
            // }
          }
        }
      }  
    }
  } catch (err) {
    console.log("----------------------------------------Error--------------------------------------");
    console.log(err);
    console.log("----------------------------------------Error--------------------------------------");
  }
}


// app.use(bodyParser.json())
// app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`))

// // URL: https://0b17-2405-201-200d-ebd4-b062-83eb-c8cd-fde9.in.ngrok.io/hook
// app.post("/hook", (req, res) => {
//  var body = req.body
// //  console.log(req.body) // Call your action on the request here
//  res.status(200).end()
//  doSomething(body) 
//   // Responding is important
// })

doSomething(JSON.parse('{"status": "pending","gas": 1000000,"maxFeePerGasGwei": 70,"maxPriorityFeePerGasGwei": 1.5,"dispatchTimestamp": "2022-12-01T12:24:53.963Z","contractCall": { "subCalls": [{"data": {"methodName": "swapExactTokensForTokens","params": {"amountIn": "500000000000000","amountOutMin": "0","path": ["0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2", "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48"], "deadline": "1664733474669" }}}] }}'))

// 0000000000000000000000000000000000000000000000000000b5b2e9201500000000000000000000000000000000000000000000000000016345785d8a000000000000000000000000000000000000000000000000000000000000000000a0000000000000000000000000eb467f831233c47b25877eaf895773c6031d7e71000000000000000000000000000000000000000000000000000001842f1884810000000000000000000000000000000000000000000000000000000000000002000000000000000000000000c02aaa39b223fe8d0a0e5c4f27ead9083c756cc20000000000000000000000003dbeb33ff6dcd3f6d85798e9bc00b96c2b222ef6
// 000000000000000000000000000000000000000000000000000b4f8aa2d8900000000000000000000000000000000000000000000000000016345785d8a00000000000000000000000000000000000000000000000000000000000000000080000000000000000000000000eb467f831233c47b25877eaf895773c6031d7e710000000000000000000000000000000000000000000000000000000000000002000000000000000000000000c02aaa39b223fe8d0a0e5c4f27ead9083c756cc20000000000000000000000001430bbcaaf051c83e83bca63891bc3146bf3c2ea