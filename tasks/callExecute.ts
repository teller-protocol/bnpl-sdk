
import {Contract, Wallet, providers, utils} from 'ethers'
import { ExecuteParams } from '../lib/bnpl-helper'

require('dotenv').config()



let contractsConfig = require('../data/contractsConfig.json')['rinkeby']


//was 0x519b957ecaa80C5aEd4C5547Ff2Eac3ff5dE229c
const tellerV2Config = {
    address: contractsConfig.tellerV2.address,
    abi: require('../abi/TellerV2.json')
}

const bnplConfig = {
    address: contractsConfig.BNPLContract.address,
    abi: require('../abi/BNPLMarket.json')
  }


export async function callExecute(): Promise<any> {

    let callData:ExecuteParams = require('../data/output.json')

    let rpcURI = process.env.RINKEBY_RPC_URL
    let privateKey = process.env.WALLET_PRIVATE_KEY

    let rpcProvider = new providers.JsonRpcProvider( rpcURI )
    
    let tellerV2Instance = new Contract(tellerV2Config.address,tellerV2Config.abi, rpcProvider)
    let bnplContractInstance = new Contract(bnplConfig.address,bnplConfig.abi,rpcProvider)

    let wallet = new Wallet(privateKey).connect(rpcProvider)
 

    let value = callData.valueWei

    console.log('callData.atomicMatchInputs', JSON.stringify(callData.atomicMatchInputs))
    

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

    let isApproved = await tellerV2Instance.hasApprovedMarketForwarder(2, bnplContractInstance.address, lenderAddress)
    console.log('lender has approved BNPL as forwarder: ',isApproved)

    if(!isApproved) {
        console.error('ERROR: lender has not approved bnpl as forwarder ')
        return 
    }
      



    //this address needs to approve the forwarder on tellerv2
  //  lenderAddress =  "0xF4dAb24C52b51cB69Ab62cDE672D3c9Df0B39681"

    //Set price to 1 Gwei
    let gasPrice = utils.hexlify(8000000000);
    //Set max gas limit to 4M
    var gasLimit = utils.hexlify(25000000);

    let unsignedTx = await bnplContractInstance
    .populateTransaction
    .execute(
        callData.bidSubmitArgs, 
        lenderAddress, 
        atomicMatchInputs , {value, gasLimit, gasPrice} )

    let response = await wallet.sendTransaction(unsignedTx);
    console.log('response',response)
         //erc20 low level call failed (weth approval )->sending weth from lender 
    
   
    return true 
  }
  
  

  
