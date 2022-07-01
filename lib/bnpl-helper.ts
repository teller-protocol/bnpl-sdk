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

export function buildExecuteParams(inputData:CraResponse, contractsConfig: ContractsConfig ): ExecuteParams {

    let submitBidArgs:SubmitBidArgs = {

      lender: inputData.tellerInputs.lenderAddress,
      principal: inputData.tellerInputs.loanRequired,
      downPayment: inputData.tellerInputs.downPayment,
      duration: inputData.tellerInputs.duration,
      interestRate: inputData.tellerInputs.interestRate,
      metadataURI: "ipfs://"


      //assetContractAddress: inputData.tellerInputs.assetContractAddress,
      //assetTokenId: inputData.tellerInputs.assetTokenId,
      
       
      
      
    }
     
    //deployed on rinkeby 
    //let bnplContractAddress = contractsConfig.BNPLContract.address
  
    //let openSeaData = inputData.openSeaResponse
   
 
    
   
    
    let outputData : ExecuteParams = {
      submitBidArgs: submitBidArgs, 
      basicOrderParams: inputData.basicOrderParams,
      craSignature: inputData.craSignature
    }
  
    return  outputData
  }