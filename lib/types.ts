import { BigNumber } from "ethers";

export interface BidSubmitArgs {
    assetContractAddress: string,
    assetTokenId: string,
    downPayment: string,
    lenderAddress: string, 
    principal: string,
    duration: string,
    APR: string,
    metadataURI: string
}
 


export interface CraResponse {
  craSignature: string;
  openSeaResponse: OpenseaResponse;
  tellerInputs: TellerInputs;
}




export interface OpenseaResponse {
  //nftPrice: string;
  parameters: OpenseaResponseParameters
  signature: string;
}

export interface OpenseaResponseParameters {
  //nftPrice: string;
  consideration: Consideration[];
  parameterOrderType: number;
  offerer: string;
  zone: string;
  offer: Consideration[];
  startTime: string;
  endTime: string;
  orderType: number;
  zoneHash: string;
  salt: string;
  totalOriginalConsiderationItems?: string,
  offererConduitKey: string;
}

export interface Consideration {
  token:string,
  identifierOrCriteria: string,
  startAmount: string,
  endAmount: string,
  itemType: number

}
  
export interface TellerInputs {
  assetContractAddress: string;
  assetTokenId: string;

  lenderAddress: string;
  downPayment: string;
  loanRequired: string;
  interestRate: string;
  duration: string;
  chainId: number;
}



  export interface ContractsConfig {

    BNPLContract: {
        address:string

    }

  }

  export interface BasicOrderParams {
    considerationToken: string,
    considerationIdentifier: BigNumber,
    considerationAmount: BigNumber,
    offerer: string,
    zone: string,
    offerToken: string,
    offerIdentifier:BigNumber,
    offerAmount: string,
    basicOrderType: number,
    startTime: BigNumber,
    endTime: BigNumber,
    zoneHash: string,
    salt: string,
    offererConduitKey: string,
    fulfillerConduitKey: string,
    totalOriginalAdditionalRecipients: BigNumber,
    additionalRecipients:object[],
    signature: string
 }

 