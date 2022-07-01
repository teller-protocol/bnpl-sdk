import { parseFeeMethod, parseHowToCall, parseMetadata, parseSaleKind, WyvernAtomicMatchParameters } from "./opensea-helper"

 
import {BigNumber, ethers,Wallet} from 'ethers'

import moment from 'moment'

import { NULL_BLOCK_HASH } from 'opensea-js/lib/constants'

import { OpenseaHelper, SignedOrder, UnhashedOrder } from '../lib/opensea-helper'
import { SubmitBidArgs, ContractsConfig, CraResponse, ExecuteParams } from "./types"
 
  
require('dotenv').config() 



export function calculateTotalPrice( basicOrderParams: any ): BigNumber {
  let amount = BigNumber.from(basicOrderParams.considerationAmount) 


  for(let additionalRecipient of basicOrderParams.additionalRecipients){

    amount = amount.add( BigNumber.from( additionalRecipient.amount )  )
  }


  return amount 
}

export function buildExecuteParams(inputData:CraResponse, contractsConfig?: ContractsConfig ): ExecuteParams {

  
      
    // may be able to remove this method as it does nearly nothing now 
    
    let outputData : ExecuteParams = {
      submitBidArgs: inputData.submitBidArgs, 
      basicOrderParams: inputData.basicOrderParams,
      craSignature: inputData.craSignature
    }
  
    return  outputData
  }