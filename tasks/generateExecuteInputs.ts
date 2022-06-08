

 
import {ethers,Wallet} from 'ethers'

import moment from 'moment'

import { NULL_BLOCK_HASH } from 'opensea-js/lib/constants'

import { OpenseaHelper, SignedOrder, UnhashedOrder } from '../lib/opensea-helper'
 
import fs from 'fs';
import { BidSubmitArgs, ExecuteParams } from '../lib/bnpl-helper';

const OrderSide = {
  Buy: 0,
  Sell: 1
}

let contractsConfig = require('../data/contractsConfig.json')['rinkeby']


require('dotenv').config()
const MerkleValidatorABI = require('../abi/MerkleValidator.json')


export async function generateExecuteInputs(): Promise<any> {

  let inputData = require('../data/inputOrder.json')

  inputData.lenderAddress = "0xF4dAb24C52b51cB69Ab62cDE672D3c9Df0B39681"

  let outputData = buildExecuteParams( inputData  )


  try {
    fs.writeFileSync('data/output.json', JSON.stringify(outputData) );
  } catch (err) {
    console.error(err);
  }
    console.log('output ', outputData )
  
 
  return true 
}



export function buildExecuteParams(inputData:any): any {

  let bidSubmitArgs:BidSubmitArgs = {
    lendingToken: "0xc778417e063141139fce010982780140aa0cd5ab",  //wethAddress rinkeby
    principal: inputData.tellerInputs.loanRequired,
    duration: inputData.tellerInputs.duration,
    APR: inputData.tellerInputs.interestRate,
    metadataURI: "ipfs://"
  }


  let lenderAddress = inputData.lenderAddress// "0xF4dAb24C52b51cB69Ab62cDE672D3c9Df0B39681"


 
  /* 

  need to make sure that howToCall being 1 (merkle validator) is OK 

  */


  //deployed on rinkeby 
  let bnplContractAddress = contractsConfig.BNPLContract.address

  let openSeaData = inputData.openSeaResponse

  //this comes from the opensea API 
  let sellOrderWithSignature:SignedOrder = {
    feeMethod: openSeaData.feeMethod,
    side: OrderSide.Sell,
    saleKind: openSeaData.saleKind,
    howToCall: openSeaData.howToCall,
    quantity: openSeaData.quantity,
    makerReferrerFee: openSeaData.makerReferrerFee,
    waitingForBestCounterOrder: openSeaData.waitingForBestCounterOrder,
    metadata: openSeaData.metadata,
    exchange: openSeaData.exchange,
    maker: openSeaData.maker,
    taker: openSeaData.taker,
    makerRelayerFee: openSeaData.makerRelayerFee,
    takerRelayerFee: openSeaData.takerRelayerFee,
    makerProtocolFee: openSeaData.makerProtocolFee,
    takerProtocolFee: openSeaData.takerProtocolFee,
    feeRecipient: openSeaData.feeRecipient,
    target: openSeaData.target,
    calldata: openSeaData.calldata,
    replacementPattern: openSeaData.replacementPattern,
    staticTarget: openSeaData.staticTarget,
    staticExtradata: openSeaData.staticExtradata,
    paymentToken: openSeaData.paymentToken,
    basePrice: openSeaData.basePrice,
    extra: openSeaData.extra,
    listingTime: openSeaData.listingTime,
    expirationTime: openSeaData.expirationTime,
    salt: openSeaData.salt,
    hash: openSeaData.orderHash,
    v: openSeaData.v, 
    r: openSeaData.r,
    s: openSeaData.s 
  } 
 

  const minListingTimestamp = Math.round(Date.now() / 1000)

  const listingTime = minListingTimestamp - 300 // + moment.duration(1,'day').asSeconds()
  const expirationTime = listingTime + moment.duration(2, 'days').asSeconds() //getMaxOrderExpirationTimestamp()

  let privateKey = process.env.WALLET_PRIVATE_KEY

  let wallet = new Wallet(privateKey) 
 


  const iface = new ethers.utils.Interface(MerkleValidatorABI);

  /*
  matchERC721UsingCriteria(
        address from,
        address to,
        IERC721 token,
        uint256 tokenId,
        bytes32 root,
        bytes32[] calldata proof*/

  //0xfb16a595000000000000000000000000b11ca87e32075817c82cc471994943a4290f4a140000000000000000000000000000000000000000000000000000000000000000000000000000000000000000388f486dbcbe05029ba7adf784459b580b4270320000000000000000000000000000000000000000000000000000000000000012000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000c00000000000000000000000000000000000000000000000000000000000000000
  let decodedCalldata = iface.decodeFunctionData("matchERC721UsingCriteria" ,   openSeaData.calldata  )
 
  // Prepare encoded data to be used in a function call
  
    console.log('decodedCalldata',decodedCalldata)
  
  //we should do this in our contract 

  let buyerDecodedCalldata = Object.assign([], decodedCalldata  )
  buyerDecodedCalldata[1] = bnplContractAddress
    
 
  let modifiedBuyCallData = iface.encodeFunctionData( "matchERC721UsingCriteria" , buyerDecodedCalldata )

  let customBuyReplacementPattern = "0x00000000ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000" ;

 
  //we build this ourselves and dont need to sign it 
  let newBuyOrder:UnhashedOrder = {
    feeMethod: openSeaData.feeMethod,
    side: OrderSide.Buy,
    saleKind: openSeaData.saleKind,
    howToCall: openSeaData.howToCall,
    quantity: openSeaData.quantity,
    makerReferrerFee: openSeaData.makerReferrerFee,
    waitingForBestCounterOrder: openSeaData.waitingForBestCounterOrder,
    metadata: openSeaData.metadata,
    exchange: openSeaData.exchange,
    maker: bnplContractAddress,  //the buyer (bnpl contract) 
    taker: openSeaData.maker,  // the seller
    makerRelayerFee: openSeaData.takerRelayerFee,
    takerRelayerFee: openSeaData.makerRelayerFee,
    makerProtocolFee: OpenseaHelper.makeBigNumber(0),
    takerProtocolFee: OpenseaHelper.makeBigNumber(0),
    feeRecipient:  ethers.constants.AddressZero,// must be zero
    target: openSeaData.target,
    calldata: modifiedBuyCallData,
    replacementPattern: customBuyReplacementPattern,
    staticTarget: openSeaData.staticTarget,
    staticExtradata: openSeaData.staticExtradata,
    paymentToken: openSeaData.paymentToken,
    basePrice: openSeaData.basePrice,
    extra: openSeaData.extra,
    listingTime: openSeaData.listingTime,
    expirationTime: OpenseaHelper.makeBigNumber(expirationTime),
    salt: OpenseaHelper.generatePseudoRandomSalt()
  } 


  let buyOrderWithSignature:SignedOrder = Object.assign(newBuyOrder ,{
    hash:"",
    v:0,
    r:NULL_BLOCK_HASH,
    s:NULL_BLOCK_HASH
  })

  
 
  let atomicMatchInputs = OpenseaHelper.buildWyvernAtomicMatchParamsFromOrders( 
    buyOrderWithSignature,
    sellOrderWithSignature
  ) 
 
   
 
  
  let outputData = {
    bidSubmitArgs,
    lenderAddress,
    atomicMatchInputs,
    valueWei: inputData.tellerInputs.downpayment,
    buyOrder: newBuyOrder,
    sellOrder: sellOrderWithSignature
  }

  return outputData 
}