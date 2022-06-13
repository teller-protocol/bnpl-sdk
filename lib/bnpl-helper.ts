import { parseFeeMethod, parseHowToCall, parseMetadata, parseSaleKind, WyvernAtomicMatchParameters } from "./opensea-helper"



 
import {ethers,Wallet} from 'ethers'

import moment from 'moment'

import { NULL_BLOCK_HASH } from 'opensea-js/lib/constants'

import { OpenseaHelper, SignedOrder, UnhashedOrder } from '../lib/opensea-helper'
 
 
const OrderSide = {
  Buy: 0,
  Sell: 1
}

//let contractsConfig = require('../data/contractsConfig.json')['rinkeby']


require('dotenv').config()
const MerkleValidatorABI = require('../abi/MerkleValidator.json')




export interface BidSubmitArgs {

    lendingToken: string
    principal: string,
    duration: string,
    APR: string,
    metadataURI: string
}
 

export interface ExecuteParams {
    bidSubmitArgs: BidSubmitArgs,
    lenderAddress: string ,
    atomicMatchInputs: WyvernAtomicMatchParameters,
    valueWei: string
}

export interface CraResponse {
    craSignature: string
    openSeaResponse: OpenseaResponse
    tellerInputs: TellerInputs
  }
  
  export interface OpenseaResponse {
    objectId: string
    exchange: string
    maker: string
    taker: string
    makerRelayerFee: number
    takerRelayerFee: number
    makerProtocolFee: number
    takerProtocolFee: number
    feeRecipient: string
    feeMethod: string
    side: string
    saleKind: string
    target: string
    howToCall: string
    calldata: string
    replacementPattern: string
    staticTarget: string
    staticExtradata: string
    paymentToken: string
    basePrice: string
    extra: string
    listingTime: string
    expirationTime: string
    salt: string
    quantity: string
    makerReferrerFee: string
    metadata: string
    waitingForBestCounterOrder: boolean
    englishAuctionReservePrice: string
    v: number
    r: string
    s: string
    orderHash: string
  }
  
  export interface TellerInputs {
    assetContractAddress:string,
    assetTokenId: string,
    lenderAddress: string,
    lendingToken: string,
    downPayment: string
    loanRequired: string
    interestRate: string
    duration: string
  }
  
  export interface ContractsConfig {

    BNPLContract: {
        address:string

    }

  }




export function buildExecuteParams(inputData:CraResponse, contractsConfig: ContractsConfig ): any {

    let bidSubmitArgs:BidSubmitArgs = {
      lendingToken: "0xc778417e063141139fce010982780140aa0cd5ab",  //wethAddress rinkeby
      principal: inputData.tellerInputs.loanRequired,
      duration: inputData.tellerInputs.duration,
      APR: inputData.tellerInputs.interestRate,
      metadataURI: "ipfs://"
    }
  
  
    let lenderAddress = inputData.tellerInputs.lenderAddress// "0xF4dAb24C52b51cB69Ab62cDE672D3c9Df0B39681"
  
   
  
    //deployed on rinkeby 
    let bnplContractAddress = contractsConfig.BNPLContract.address
  
    let openSeaData = inputData.openSeaResponse
  
    //this comes from the opensea API 
    let sellOrderWithSignature:SignedOrder = {
      feeMethod: parseFeeMethod(openSeaData.feeMethod),
      side: OrderSide.Sell,
      saleKind: parseSaleKind(openSeaData.saleKind),
      howToCall: parseHowToCall(openSeaData.howToCall),
      quantity: OpenseaHelper.makeBigNumber(openSeaData.quantity),
      makerReferrerFee: OpenseaHelper.makeBigNumber(openSeaData.makerReferrerFee),
      waitingForBestCounterOrder: openSeaData.waitingForBestCounterOrder,
      metadata: parseMetadata(openSeaData.metadata),
      exchange: openSeaData.exchange,
      maker: openSeaData.maker,
      taker: openSeaData.taker,
      makerRelayerFee: OpenseaHelper.makeBigNumber(openSeaData.makerRelayerFee),
      takerRelayerFee: OpenseaHelper.makeBigNumber(openSeaData.takerRelayerFee),
      makerProtocolFee: OpenseaHelper.makeBigNumber(openSeaData.makerProtocolFee),
      takerProtocolFee: OpenseaHelper.makeBigNumber(openSeaData.takerProtocolFee),
      feeRecipient: openSeaData.feeRecipient,
      target: openSeaData.target,
      calldata: openSeaData.calldata,
      replacementPattern: openSeaData.replacementPattern,
      staticTarget: openSeaData.staticTarget,
      staticExtradata: openSeaData.staticExtradata,
      paymentToken: openSeaData.paymentToken,
      basePrice: OpenseaHelper.makeBigNumber(openSeaData.basePrice),
      extra: OpenseaHelper.makeBigNumber(openSeaData.extra),
      listingTime: OpenseaHelper.makeBigNumber(openSeaData.listingTime),
      expirationTime: OpenseaHelper.makeBigNumber(openSeaData.expirationTime),
      salt: OpenseaHelper.makeBigNumber(openSeaData.salt),
      hash: openSeaData.orderHash,
      v: openSeaData.v, 
      r: openSeaData.r,
      s: openSeaData.s 
    } 
   
  
    const minListingTimestamp = Math.round(Date.now() / 1000)
  
    const listingTime = minListingTimestamp - 300 // + moment.duration(1,'day').asSeconds()
    const expirationTime = listingTime + moment.duration(2, 'days').asSeconds() //getMaxOrderExpirationTimestamp()
  
    //let privateKey = process.env.WALLET_PRIVATE_KEY
  
   // let wallet = new Wallet(privateKey) 
   
  
  
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
    

    let buyerDecodedCalldata:any  = Object.assign([], decodedCalldata  )
    buyerDecodedCalldata[1] = bnplContractAddress
      
   
    let modifiedBuyCallData = iface.encodeFunctionData( "matchERC721UsingCriteria" , buyerDecodedCalldata )
  
    let customBuyReplacementPattern = "0x00000000ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000" ;
  
   
    //we build this ourselves and dont need to sign it 
    let newBuyOrder:UnhashedOrder = {
      feeMethod: parseFeeMethod(openSeaData.feeMethod),
      side: OrderSide.Buy,
      saleKind: parseSaleKind(openSeaData.saleKind),
      howToCall: parseHowToCall(openSeaData.howToCall),
      quantity: OpenseaHelper.makeBigNumber(openSeaData.quantity),
      makerReferrerFee: OpenseaHelper.makeBigNumber(openSeaData.makerReferrerFee),
      waitingForBestCounterOrder: openSeaData.waitingForBestCounterOrder,
      metadata: parseMetadata(openSeaData.metadata),
      exchange: openSeaData.exchange,
      maker: bnplContractAddress,  //the buyer (bnpl contract) 
      taker: openSeaData.maker,  // the seller
      makerRelayerFee: OpenseaHelper.makeBigNumber(openSeaData.takerRelayerFee),
      takerRelayerFee: OpenseaHelper.makeBigNumber(openSeaData.makerRelayerFee),
      makerProtocolFee: OpenseaHelper.makeBigNumber(0),
      takerProtocolFee: OpenseaHelper.makeBigNumber(0),
      feeRecipient:  ethers.constants.AddressZero,// must be zero
      target: openSeaData.target,
      calldata: modifiedBuyCallData,
      replacementPattern: customBuyReplacementPattern,
      staticTarget: openSeaData.staticTarget,
      staticExtradata: openSeaData.staticExtradata,
      paymentToken: openSeaData.paymentToken,
      basePrice: OpenseaHelper.makeBigNumber( openSeaData.basePrice) ,
      extra: OpenseaHelper.makeBigNumber(openSeaData.extra),
      listingTime: OpenseaHelper.makeBigNumber(openSeaData.listingTime),
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
      valueWei: inputData.tellerInputs.downPayment,
      buyOrder: newBuyOrder,
      sellOrder: sellOrderWithSignature
    }
  
    return outputData 
  }