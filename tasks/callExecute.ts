
import {Contract, Wallet, providers, utils, BigNumber} from 'ethers'
import { calculateTotalPrice } from '../lib/bnpl-helper'
import { BasicOrderParams } from '../lib/types'

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



const marketplaceId = 3 

export async function callExecute(): Promise<any> {

    let executeParams:any  = require('../data/output.json')

    let rpcURI = process.env.RINKEBY_RPC_URL
    let privateKey = process.env.WALLET_PRIVATE_KEY

    let rpcProvider = new providers.JsonRpcProvider( rpcURI )
    
    let tellerV2Instance = new Contract(tellerV2Config.address,tellerV2Config.abi, rpcProvider)
    let bnplContractInstance = new Contract(bnplConfig.address,bnplConfig.abi,rpcProvider)

    if(!privateKey) throw new Error('Missing privateKey')

    let wallet = new Wallet(privateKey).connect(rpcProvider)
 

 

 
   const submitBidArgs = executeParams.submitBidArgs



   let value:BigNumber = BigNumber.from(submitBidArgs.downPayment)  //calculateTotalPrice( executeParams.basicOrderParams )

     

   let lenderAddress = submitBidArgs.lender

   let basicOrderParams:BasicOrderParams = executeParams.basicOrderParams

   if(!basicOrderParams.offererConduitKey){
     throw new Error('Missing offererConduitKey')
   }

    //let borrowerAddress = wallet.address

    let isApproved = await tellerV2Instance.hasApprovedMarketForwarder(marketplaceId, bnplContractInstance.address, lenderAddress)
    console.log('lender has approved BNPL as forwarder: ',isApproved)

    if(!isApproved) {
        console.error('ERROR: lender has not approved bnpl as forwarder ')
        return 
    }


    let domainSeparator = await bnplContractInstance.DOMAIN_SEPARATOR()
    console.log({domainSeparator})

    if( domainSeparator != "0x1c76e430b4dc12c3600a4aa299d979e1ea0cd62b00bbb1ce7fe162ad994800f9" ){
        throw new Error('Invalid domain separator')
    }
    
    console.log('passing in params',
    submitBidArgs, 
    basicOrderParams, 
    executeParams.craSignature 
    )

 

    //this address needs to approve the forwarder on tellerv2
  //  lenderAddress =  "0xF4dAb24C52b51cB69Ab62cDE672D3c9Df0B39681"

    //Set price to 1 Gwei
    let gasPrice = utils.hexlify(8000000000);
    //Set max gas limit to 4M
    var gasLimit = utils.hexlify(25000000);

    let unsignedTx = await bnplContractInstance
    .populateTransaction
    .execute(
      submitBidArgs, 
      executeParams.basicOrderParams, 
      executeParams.craSignature , {value, gasLimit, gasPrice} )

    console.log({unsignedTx})

    let response = await wallet.sendTransaction(unsignedTx);
    console.log('response',response)
         //erc20 low level call failed (weth approval )->sending weth from lender 
    
   
    return true 
  }
  
  

  
