
import {Contract, Wallet, providers, utils} from 'ethers'
import { ExecuteParams } from '../lib/bnpl-helper'
import { OpenseaHelper } from '../lib/opensea-helper'

require('dotenv').config()

let contractsConfig = require('../data/contractsConfig.json')['rinkeby']

const wyvernConfig = {
    address: contractsConfig.wyvern.address,
    abi: require('../abi/ExchangeCore.json')
}

const bnplConfig = {
  address: contractsConfig.BNPLContract.address,
  abi: require('../abi/BNPLMarket.json')
}

export async function matchOrder(): Promise<any> {

    
    let callData = require('../data/output.json')

    let rpcURI = process.env.RINKEBY_RPC_URL
    let privateKey = process.env.WALLET_PRIVATE_KEY

    let rpcProvider = new providers.JsonRpcProvider( rpcURI )
    
    let bnplContractInstance = new Contract(bnplConfig.address, bnplConfig.abi, rpcProvider )
    let wyvernContractInstance = new Contract(wyvernConfig.address,wyvernConfig.abi,rpcProvider)


    if(!privateKey) throw new Error('Missing privateKey')
    
    let wallet = new Wallet(privateKey).connect(rpcProvider)
 
               
    let value = '100000000000000000' //callData.valueWei

    console.log('callData.atomicMatchInputs', JSON.stringify(callData.atomicMatchInputs))
    

 

    /* 
    
    struct AtomicMatchInputs {
        address[14] addrs;
        uint256[18] uints;
        uint8[8] feeMethodsSidesKindsHowToCalls;
        bytes calldataBuy;
        bytes calldataSell;
        bytes replacementPatternBuy;
        bytes replacementPatternSell;
        uint8[2] vs;
        bytes32[5] rssMetadata;
    }
    */

    let lenderAddress = callData.lenderAddress



    let borrowerAddress = wallet.address


    //this address needs to approve the forwarder on tellerv2
    lenderAddress =  "0xF4dAb24C52b51cB69Ab62cDE672D3c9Df0B39681"

    //Set price to 1 Gwei
    let gasPrice = utils.hexlify(8000000000);
    //Set max gas limit to 4M
    var gasLimit = utils.hexlify(25000000);


    let sellOrderParams = OpenseaHelper.buildWyvernAtomicMatchParamFromOrder( 
      callData.sellOrder  )

   let validateSell = await wyvernContractInstance.validateOrder_( 
    sellOrderParams[0],
    sellOrderParams[1],
    sellOrderParams[2],
    sellOrderParams[3],
     sellOrderParams[4],
     sellOrderParams[5],
     sellOrderParams[6],
     sellOrderParams[7],
     sellOrderParams[8],
     sellOrderParams[9],
     sellOrderParams[10],
     sellOrderParams[11],
   )
  

   let sellOrderHash = await wyvernContractInstance.hashOrder_( 
    sellOrderParams[0],
    sellOrderParams[1],
    sellOrderParams[2],
    sellOrderParams[3],
     sellOrderParams[4],
     sellOrderParams[5],
     sellOrderParams[6],
     sellOrderParams[7],
     sellOrderParams[8],
   )
   
   let sellOrderHashToSign = await wyvernContractInstance.hashToSign_( 
    sellOrderParams[0],
    sellOrderParams[1],
    sellOrderParams[2],
    sellOrderParams[3],
     sellOrderParams[4],
     sellOrderParams[5],
     sellOrderParams[6],
     sellOrderParams[7],
     sellOrderParams[8],
   )
    
   //0x90fbbb5556cf59aabad2cecbed8d7f829eeebfc7be93f8b6117c235e769be03b
   ///this should equal order hash right ? 
 
    let buyOrderParams = OpenseaHelper.buildWyvernAtomicMatchParamFromOrder( 
       callData.buyOrder  )

    let validateBuy = await wyvernContractInstance.validateOrderParameters_( 
      buyOrderParams[0],
      buyOrderParams[1],
      buyOrderParams[2],
      buyOrderParams[3],
      buyOrderParams[4],
      buyOrderParams[5],
      buyOrderParams[6],
      buyOrderParams[7],
      buyOrderParams[8],
    )

 
    let canMatch = await wyvernContractInstance.ordersCanMatch_(
      callData.atomicMatchInputs[0], 
      callData.atomicMatchInputs[1],
      callData.atomicMatchInputs[2],
      callData.atomicMatchInputs[3],
      callData.atomicMatchInputs[4],
      callData.atomicMatchInputs[5],
      callData.atomicMatchInputs[6],
      callData.atomicMatchInputs[7],
      callData.atomicMatchInputs[8], 
    )

  

    let matchPrice = await wyvernContractInstance.calculateMatchPrice_(
      callData.atomicMatchInputs[0], 
      callData.atomicMatchInputs[1],
      callData.atomicMatchInputs[2],
      callData.atomicMatchInputs[3],
      callData.atomicMatchInputs[4],
      callData.atomicMatchInputs[5],
      callData.atomicMatchInputs[6],
      callData.atomicMatchInputs[7],
      callData.atomicMatchInputs[8], 

    )
     
 /*
    let unsignedTx = await wyvernContractInstance
    .populateTransaction
    .atomicMatch_( 
      callData.atomicMatchInputs[0],
      callData.atomicMatchInputs[1],
      callData.atomicMatchInputs[2],
      callData.atomicMatchInputs[3],//calldata buy 
      callData.atomicMatchInputs[4],//calldata sell
      callData.atomicMatchInputs[5],
      callData.atomicMatchInputs[6],
      callData.atomicMatchInputs[7],
      callData.atomicMatchInputs[8],
      callData.atomicMatchInputs[9], 
      callData.atomicMatchInputs[10],
      {value, gasLimit, gasPrice} )
      */


      const atomicMatchInputs = {
        addrs: callData.atomicMatchInputs[0],
        uints: callData.atomicMatchInputs[1],
        feeMethodsSidesKindsHowToCalls: callData.atomicMatchInputs[2],
        calldataBuy: callData.atomicMatchInputs[3],
        calldataSell: callData.atomicMatchInputs[4],
        replacementPatternBuy: callData.atomicMatchInputs[5],
        replacementPatternSell: callData.atomicMatchInputs[6],
        //args 7 and 8 must be null for this to work -- they typically are
        vs: callData.atomicMatchInputs[9],
        rssMetadata: callData.atomicMatchInputs[10],
      }

     // let exchangeAddress = await bnplContractInstance.exchange()
 

      let unsignedTx = await bnplContractInstance
      .populateTransaction
      .atomicMatchThrough_( 
        atomicMatchInputs, value,
        {value, gasLimit, gasPrice} )
 

    let response = await wallet.sendTransaction(unsignedTx);
    console.log('response',response)
         //erc20 low level call failed (weth approval )->sending weth from lender 
    
   
    return true 
  }
  
  

  
