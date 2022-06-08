import { WyvernAtomicMatchParameters } from "./opensea-helper"

export interface BidSubmitArgs {

    lendingToken: string
    principal: string,
    duration: number,
    APR: number,
    metadataURI: string
}
 

export interface ExecuteParams {
    bidSubmitArgs: BidSubmitArgs,
    lenderAddress: string ,
    atomicMatchInputs: WyvernAtomicMatchParameters,
    valueWei: string
}