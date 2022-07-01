import { parseFeeMethod, parseHowToCall, parseMetadata, parseSaleKind, WyvernAtomicMatchParameters } from "./opensea-helper"

 
import {BigNumber, ethers,Wallet} from 'ethers'

import moment from 'moment'

import { NULL_BLOCK_HASH } from 'opensea-js/lib/constants'

import { OpenseaHelper, SignedOrder, UnhashedOrder } from '../lib/opensea-helper'
import { BidSubmitArgs, CraResponse } from "./types"
 
  
require('dotenv').config() 



export function calculateTotalPrice( basicOrderParams: any ): string {
  let amount = BigNumber.from(0) 


  return amount.toString()
}

export function buildExecuteParams(inputData:CraResponse, contractsConfig: ContractsConfig ): any {

    let bidSubmitArgs:BidSubmitArgs = {
      assetContractAddress: inputData.tellerInputs.assetContractAddress,
      assetTokenId: inputData.tellerInputs.assetTokenId,
      downPayment: inputData.tellerInputs.downPayment,
      lenderAddress: inputData.tellerInputs.lenderAddress, 
      principal: inputData.tellerInputs.loanRequired,
      duration: inputData.tellerInputs.duration,
      APR: inputData.tellerInputs.interestRate,
      metadataURI: "ipfs://"
    }
   
  
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
   
   
    
 
   
  
    
   
    let atomicMatchInputs = OpenseaHelper.buildWyvernAtomicMatchParamsFromOrders( 
      buyOrderWithSignature,
      sellOrderWithSignature
    ) 
   
     
   
    
    let outputData : ExecuteParams = {
      bidSubmitArgs, 
      atomicMatchInputs,
      valueWei: inputData.tellerInputs.downPayment,
      buyOrder: newBuyOrder,
      sellOrder: sellOrderWithSignature,
      craSignature: inputData.craSignature
    }
  
    return outputData 
  }