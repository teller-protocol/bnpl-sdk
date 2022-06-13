 

import { JsonRpcProvider, Provider } from '@ethersproject/providers'
import * as ethUtil from 'ethereumjs-util'
import    { ethers, BigNumber, BigNumberish, Contract, Signer, Wallet } from 'ethers' 
 
import { EthereumProvider, JsonRpcResponse } from 'hardhat/types'
import moment from 'moment'
import { OpenSeaAPI } from 'opensea-js/lib/api'
import {
  CK_ADDRESS,
  CK_RINKEBY_ADDRESS,
  DEFAULT_BUYER_FEE_BASIS_POINTS,
  DEFAULT_GAS_INCREASE_FACTOR,
  DEFAULT_MAX_BOUNTY,
  DEFAULT_SELLER_FEE_BASIS_POINTS,
  DEFAULT_WRAPPED_NFT_LIQUIDATION_UNISWAP_SLIPPAGE_IN_BASIS_POINTS,
  EIP_712_ORDER_TYPES,
  EIP_712_WYVERN_DOMAIN_NAME,
  EIP_712_WYVERN_DOMAIN_VERSION,
  ENJIN_ADDRESS,
  ENJIN_COIN_ADDRESS,
  INVERSE_BASIS_POINT,
  MANA_ADDRESS,
  MAX_EXPIRATION_MONTHS,
  MIN_EXPIRATION_MINUTES,
  MERKLE_VALIDATOR_MAINNET,
  MERKLE_VALIDATOR_RINKEBY,
  NULL_BLOCK_HASH,
  OPENSEA_FEE_RECIPIENT,
  OPENSEA_SELLER_BOUNTY_BASIS_POINTS,
  ORDER_MATCHING_LATENCY_SECONDS,
  RPC_URL_PATH,
  SELL_ORDER_BATCH_SIZE,
  STATIC_CALL_CHEEZE_WIZARDS_ADDRESS,
  STATIC_CALL_CHEEZE_WIZARDS_RINKEBY_ADDRESS,
  STATIC_CALL_DECENTRALAND_ESTATES_ADDRESS,
  STATIC_CALL_TX_ORIGIN_ADDRESS,
  STATIC_CALL_TX_ORIGIN_RINKEBY_ADDRESS,
  UNISWAP_FACTORY_ADDRESS_MAINNET,
  UNISWAP_FACTORY_ADDRESS_RINKEBY,
  WRAPPED_NFT_FACTORY_ADDRESS_MAINNET,
  WRAPPED_NFT_FACTORY_ADDRESS_RINKEBY,
  WRAPPED_NFT_LIQUIDATION_PROXY_ADDRESS_MAINNET,
  WRAPPED_NFT_LIQUIDATION_PROXY_ADDRESS_RINKEBY,
} from 'opensea-js/lib/constants'
import { StaticCheckTxOrigin } from 'opensea-js/lib/contracts'
import {
  Asset,
  ECSignature,
  EventData,
  EventType,
  ExchangeMetadata,
  FeeMethod,
  HowToCall,
  Network,
  OpenSeaAPIConfig,
  OpenSeaAsset,
  OrderSide,
  PartialReadonlyContractAbi,
  RawWyvernOrderJSON,
  SaleKind,
  Web3Callback,
  WyvernAsset,
  WyvernSchemaName,
} from 'opensea-js/lib/types'
import {
  encodeCall,
  encodeSell,
  encodeBuy,
  encodeAtomicizedBuy,
  encodeAtomicizedSell,
  encodeDefaultCall,
  encodeReplacementPattern,
  AbiType,
  Encoder,
} from 'opensea-js/lib/utils/schema'
import { 
  WyvernProtocol,
  getMaxOrderExpirationTimestamp
} from 'opensea-js/lib/utils/utils'
 
  
import * as WyvernSchemas from 'wyvern-schemas'
import { Schema } from 'wyvern-schemas/dist/types'

const _ = require('lodash')

/*
see https://github.com/ProjectOpenSea/opensea-js/blob/master/src/index.ts#L7-L10


*/


//from wyvern-js
interface AnnotatedFunctionABI {
  type: AbiType;
  name: string;
  target: string;
  inputs: any[];
  outputs: any[];
  constant: boolean;
  stateMutability: any;
  payable: boolean;
}

interface OpenSeaFees {
  openseaSellerFeeBasisPoints: number
  openseaBuyerFeeBasisPoints: number
  devSellerFeeBasisPoints: number
  devBuyerFeeBasisPoints: number
}
export interface ComputedFees extends OpenSeaFees {
  totalBuyerFeeBasisPoints: number
  totalSellerFeeBasisPoints: number
  transferFee: BigNumber
  transferFeeTokenAddress: string | null
  sellerBountyBasisPoints: number
}

export type WyvernAtomicMatchParameters = [
  string[],
  BigNumber[],
  Array<number | BigNumber>,
  string,
  string,
  string,
  string,
  string,
  string,
  Array<number | BigNumber>,
  string[]
]

export interface WyvernOrder {
  exchange: string
  maker: string
  taker: string
  makerRelayerFee: BigNumber
  takerRelayerFee: BigNumber
  makerProtocolFee: BigNumber
  takerProtocolFee: BigNumber
  feeRecipient: string
  feeMethod: number
  side: number
  saleKind: number
  target: string
  howToCall: number
  calldata: string
  replacementPattern: string
  staticTarget: string
  staticExtradata: string
  paymentToken: string
  basePrice: BigNumber
  extra: BigNumber
  listingTime: BigNumber
  expirationTime: BigNumber
  salt: BigNumber
}

export interface UnhashedOrder extends WyvernOrder {
  feeMethod: FeeMethod
  side: OrderSide
  saleKind: SaleKind
  howToCall: HowToCall
  quantity: BigNumber

  // OpenSea-specific
  makerReferrerFee: BigNumber
  waitingForBestCounterOrder: boolean
  englishAuctionReservePrice?: BigNumber

  metadata: ExchangeMetadata
}

export interface UnsignedOrder extends UnhashedOrder {
  hash: string
}

export interface SignedOrder extends UnsignedOrder {
  v: number
  r: string
  s: string
}

export const merkleValidatorByNetwork = {
  [Network.Main]: MERKLE_VALIDATOR_MAINNET,
  [Network.Rinkeby]: MERKLE_VALIDATOR_RINKEBY,
}

export const getMethod = (
  abi: PartialReadonlyContractAbi,
  name: string
): AnnotatedFunctionABI => {
  const methodAbi = abi.find((x: any) => x.type == 'function' && x.name == name)
  if (!methodAbi) {
    throw new Error(`ABI ${name} not found`)
  }
  // Have to cast since there's a bug in
  // web3 types on the 'type' field
  return methodAbi as AnnotatedFunctionABI
}

const encodeSellCustom: Encoder = (
  schema,
  asset,
  address,
  validatorAddress?: string
) => {
  const transfer =
    validatorAddress && schema.functions.checkAndTransfer
      ? schema.functions.checkAndTransfer(asset, validatorAddress)
      : schema.functions.transfer(asset)

  return {
    target: transfer.target,
    calldata: encodeDefaultCall(transfer, address),
    replacementPattern: encodeReplacementPattern(transfer),
  }
}


export function parseFeeMethod(input:string) : FeeMethod{
  return input == "0" ? FeeMethod.ProtocolFee : FeeMethod.SplitFee
}

export function parseSaleKind(input:string) : SaleKind{
  return input == "0" ? SaleKind.FixedPrice : SaleKind.DutchAuction
}

export function parseHowToCall(input:string): HowToCall{
  return input == "0" ? HowToCall.Call : HowToCall.DelegateCall
}

export function parseMetadata(input:any) : ExchangeMetadata{
  console.log('parsing metadata', input )
  return JSON.parse(JSON.stringify(input))
}


export const OpenseaHelper = {
  async getPaymentTokensFromApi(openseaAPI: OpenSeaAPI, tokenAddress: string) {
    const tokens = await openseaAPI.getPaymentTokens({ address: tokenAddress })
    return tokens
  },

  async getAssetFromAPI(
    openseaAPI: OpenSeaAPI,
    asset: Asset
  ): Promise<OpenSeaAsset> {
    const stubbedAsset = {
      tokenAddress: '0x06012c8cf97bead5deae237070f9587f8e7a266d', // CryptoKitties
      tokenId: '1', // Token ID
    }

    return await openseaAPI.getAsset(stubbedAsset)
  },

  getMerkleValidatorFromNetwork(networkName: string): string {
    if (networkName == 'rinkeby') {
      return MERKLE_VALIDATOR_RINKEBY
    }

    return MERKLE_VALIDATOR_MAINNET
  },

  /**
   * Get the Wyvern representation of a fungible asset
   * @param schema The WyvernSchema needed to access this asset
   * @param asset The asset to trade
   * @param quantity The number of items to trade
   */
  getWyvernAsset(
    schema: Schema<WyvernAsset>,
    asset: Asset,
    quantity = BigNumber.from(1)
  ): WyvernAsset {
    const tokenId = asset.tokenId != null ? asset.tokenId.toString() : undefined

    return schema.assetFromFields({
      ID: tokenId,
      Quantity: quantity.toString(),
      Address: asset.tokenAddress.toLowerCase(),
      Name: asset.name,
    })
  },

  /**
   * Generates a pseudo-random 256-bit salt.
   * The salt can be included in an 0x order, ensuring that the order generates a unique orderHash
   * and will not collide with other outstanding orders that are identical in all other parameters.
   * @return  A pseudo-random 256-bit number that can be used as a salt.
   */

  generatePseudoRandomSalt(): BigNumber {
    const MAX_BITS = 256
    const size = Math.floor(MAX_BITS / 8) - 1

    const salt = BigNumber.from(ethers.utils.randomBytes(size))
    return salt
  },

  /**
   * A baseUnit is defined as the smallest denomination of a token. An amount expressed in baseUnits
   * is the amount expressed in the smallest denomination.
   * E.g: 1 unit of a token with 18 decimal places is expressed in baseUnits as 1000000000000000000
   * @param   amount      The amount of units that you would like converted to baseUnits.
   * @param   decimals    The number of decimal places the unit amount has.
   * @return  The amount in baseUnits.
   */
  toBaseUnitAmount(amount: BigNumber, decimals: number) {
    const unit = BigNumber.from(10).pow(decimals)
    const baseUnitAmount = amount.mul(unit)
    /*const hasDecimals = baseUnitAmount.decimalPlaces() !== 0;
            if (hasDecimals) {
                throw new Error(`Invalid unit amount: ${amount.toString()} - Too many decimal places`);
            }*/
    return baseUnitAmount
  },

  /**
   * Special fixes for making BigNumbers using web3 results
   * @param arg An arg or the result of a web3 call to turn into a BigNumber
   */
  makeBigNumber(arg: number | string | BigNumber): BigNumber {
    const result = arg === '0x' ? 0 : arg
    return BigNumber.from(result.toString())
  },

  _getSchemaName(asset: Asset | OpenSeaAsset) {
    if (asset.schemaName) {
      return asset.schemaName
    } else if ('assetContract' in asset) {
      return asset.assetContract.schemaName
    }

    return undefined
  },

  _getSchema(
    networkName: string,
    schemaName?: WyvernSchemaName
  ): Schema<WyvernAsset> {
    const schemaName_ = schemaName ?? WyvernSchemaName.ERC721

    //  const allSchemas: { string: Schema<any> } = WyvernSchemas.schemas
    //  const networkSchemas: Array<Schema<any>> = allSchemas[networkName as keyof { string: Schema<any> }]

    // @ts-ignore
    const schema = WyvernSchemas.schemas[networkName].filter(
      (s: { name: string }) => s.name == schemaName_
    )[0]

    if (!schema) {
      throw new Error(
        `Trading for this asset (${schemaName_}) is not yet supported. Please contact us or check back later!`
      )
    }
    return schema
  },

  async getStaticCallTargetAndExtraData({
    asset,
    useTxnOriginStaticCall,
    network,
  }: {
    asset: OpenSeaAsset
    useTxnOriginStaticCall: boolean
    network: Network
  }): Promise<{
    staticTarget: string
    staticExtradata: string
  }> {
    const isMainnet = network == Network.Main

    if (isMainnet && !useTxnOriginStaticCall) {
      // While testing, we will use dummy values for mainnet. We will remove this if-statement once we have pushed the PR once and tested on Rinkeby
      return {
        staticTarget: ethers.constants.AddressZero,
        staticExtradata: '0x',
      }
    }

    if (useTxnOriginStaticCall) {
      return {
        staticTarget: isMainnet
          ? STATIC_CALL_TX_ORIGIN_ADDRESS
          : STATIC_CALL_TX_ORIGIN_RINKEBY_ADDRESS,
        staticExtradata: encodeCall(
          getMethod(
            StaticCheckTxOrigin,
            'succeedIfTxOriginMatchesHardcodedAddress'
          ),
          []
        ),
      }
    } else {
      // Noop - no checks
      return {
        staticTarget: ethers.constants.AddressZero,
        staticExtradata: '0x',
      }
    }
  },

  /**
   * Get the listing and expiration time parameters for a new order
   * @param expirationTimestamp Timestamp to expire the order (in seconds), or 0 for non-expiring
   * @param listingTimestamp Timestamp to start the order (in seconds), or undefined to start it now
   * @param waitingForBestCounterOrder Whether this order should be hidden until the best match is found
   */
  getTimeParameters({
    expirationTimestamp = getMaxOrderExpirationTimestamp(),
    listingTimestamp,
    waitingForBestCounterOrder = false,
    isMatchingOrder = false,
  }: {
    expirationTimestamp?: number
    listingTimestamp?: number
    waitingForBestCounterOrder?: boolean
    isMatchingOrder?: boolean
  }) {
    const maxExpirationDate = new Date()

    maxExpirationDate.setMonth(
      maxExpirationDate.getMonth() + MAX_EXPIRATION_MONTHS
    )

    const maxExpirationTimeStamp = Math.round(
      maxExpirationDate.getTime() / 1000
    )

    const minListingTimestamp = Math.round(Date.now() / 1000)

    if (!isMatchingOrder && expirationTimestamp === 0) {
      throw new Error('Expiration time cannot be 0')
    }
    if (listingTimestamp && listingTimestamp < minListingTimestamp) {
      //Ignore this so we can create a listing in the past for testing
      //    throw new Error("Listing time cannot be in the past.");
    }
    if (listingTimestamp && listingTimestamp >= expirationTimestamp) {
      throw new Error('Listing time must be before the expiration time.')
    }

    if (waitingForBestCounterOrder && listingTimestamp) {
      throw new Error(`Cannot schedule an English auction for the future.`)
    }
    if (parseInt(expirationTimestamp.toString()) != expirationTimestamp) {
      throw new Error(`Expiration timestamp must be a whole number of seconds`)
    }
    if (expirationTimestamp > maxExpirationTimeStamp) {
      throw new Error('Expiration time must not exceed six months from now')
    }

    if (waitingForBestCounterOrder) {
      // The minimum expiration time has to be at least fifteen minutes from now
      const minEnglishAuctionListingTimestamp =
        minListingTimestamp + MIN_EXPIRATION_MINUTES * 60

      if (
        !isMatchingOrder &&
        listingTimestamp! < minEnglishAuctionListingTimestamp
      ) {
        throw new Error(
          `Expiration time must be at least ${MIN_EXPIRATION_MINUTES} minutes from now`
        )
      }

      return {
        listingTime: OpenseaHelper.makeBigNumber(expirationTimestamp),
        expirationTime: OpenseaHelper.makeBigNumber(
          expirationTimestamp + ORDER_MATCHING_LATENCY_SECONDS
        ),
      }
    } else {
      // The minimum expiration time has to be at least fifteen minutes from now
      const minExpirationTimestamp =
        listingTimestamp! + MIN_EXPIRATION_MINUTES * 60

      if (!isMatchingOrder && expirationTimestamp < minExpirationTimestamp) {
        throw new Error(
          `Expiration time must be at least ${MIN_EXPIRATION_MINUTES} minutes from the listing date`
        )
      }

      return {
        listingTime: OpenseaHelper.makeBigNumber(
          listingTimestamp ?? Math.round(Date.now() / 1000 - 100)
        ),
        expirationTime: OpenseaHelper.makeBigNumber(expirationTimestamp),
      }
    }
  },

  /**
   * Validate fee parameters
   * @param totalBuyerFeeBasisPoints Total buyer fees
   * @param totalSellerFeeBasisPoints Total seller fees
   */
  validateFees(
    totalBuyerFeeBasisPoints: number,
    totalSellerFeeBasisPoints: number
  ) {
    const maxFeePercent = INVERSE_BASIS_POINT / 100

    if (
      totalBuyerFeeBasisPoints > INVERSE_BASIS_POINT ||
      totalSellerFeeBasisPoints > INVERSE_BASIS_POINT
    ) {
      throw new Error(
        `Invalid buyer/seller fees: must be less than ${maxFeePercent}%`
      )
    }

    if (totalBuyerFeeBasisPoints < 0 || totalSellerFeeBasisPoints < 0) {
      throw new Error(`Invalid buyer/seller fees: must be at least 0%`)
    }
  },

  getBuyFeeParameters(
    totalBuyerFeeBasisPoints: number,
    totalSellerFeeBasisPoints: number,
    sellOrder?: UnhashedOrder
  ) {
    OpenseaHelper.validateFees(
      totalBuyerFeeBasisPoints,
      totalSellerFeeBasisPoints
    )

    let makerRelayerFee
    let takerRelayerFee

    let feeRecipient = OPENSEA_FEE_RECIPIENT

    if (sellOrder) {
      // Use the sell order's fees to ensure compatiblity and force the order
      // to only be acceptable by the sell order maker.
      // Swap maker/taker depending on whether it's an English auction (taker)
      // TODO add extraBountyBasisPoints when making bidder bounties
      makerRelayerFee = sellOrder.waitingForBestCounterOrder
        ? OpenseaHelper.makeBigNumber(sellOrder.makerRelayerFee)
        : OpenseaHelper.makeBigNumber(sellOrder.takerRelayerFee)
      takerRelayerFee = sellOrder.waitingForBestCounterOrder
        ? OpenseaHelper.makeBigNumber(sellOrder.takerRelayerFee)
        : OpenseaHelper.makeBigNumber(sellOrder.makerRelayerFee)
      feeRecipient = ethers.constants.AddressZero
    } else {
      makerRelayerFee = OpenseaHelper.makeBigNumber(totalBuyerFeeBasisPoints)
      takerRelayerFee = OpenseaHelper.makeBigNumber(totalSellerFeeBasisPoints)
    }

    return {
      makerRelayerFee,
      takerRelayerFee,
      makerProtocolFee: OpenseaHelper.makeBigNumber(0),
      takerProtocolFee: OpenseaHelper.makeBigNumber(0),
      makerReferrerFee: OpenseaHelper.makeBigNumber(0), // TODO use buyerBountyBPS
      feeRecipient,
      feeMethod: FeeMethod.SplitFee,
    }
  },

  getSellFeeParameters(
    totalBuyerFeeBasisPoints: number,
    totalSellerFeeBasisPoints: number,
    waitForHighestBid: boolean,
    sellerBountyBasisPoints = 0
  ) {
    OpenseaHelper.validateFees(
      totalBuyerFeeBasisPoints,
      totalSellerFeeBasisPoints
    )
    // Use buyer as the maker when it's an English auction, so Wyvern sets prices correctly
    const feeRecipient = waitForHighestBid
      ? ethers.constants.AddressZero
      : OPENSEA_FEE_RECIPIENT

    // Swap maker/taker fees when it's an English auction,
    // since these sell orders are takers not makers
    const makerRelayerFee = waitForHighestBid
      ? OpenseaHelper.makeBigNumber(totalBuyerFeeBasisPoints)
      : OpenseaHelper.makeBigNumber(totalSellerFeeBasisPoints)
    const takerRelayerFee = waitForHighestBid
      ? OpenseaHelper.makeBigNumber(totalSellerFeeBasisPoints)
      : OpenseaHelper.makeBigNumber(totalBuyerFeeBasisPoints)

    return {
      makerRelayerFee,
      takerRelayerFee,
      makerProtocolFee: OpenseaHelper.makeBigNumber(0),
      takerProtocolFee: OpenseaHelper.makeBigNumber(0),
      makerReferrerFee: OpenseaHelper.makeBigNumber(sellerBountyBasisPoints),
      feeRecipient,
      feeMethod: FeeMethod.SplitFee,
    }
  },

  /**
   * Compute the `basePrice` and `extra` parameters to be used to price an order.
   * Also validates the expiration time and auction type.
   * @param tokenAddress Address of the ERC-20 token to use for trading.
   * Use the null address for ETH
   * @param expirationTime When the auction expires, or 0 if never.
   * @param startAmount The base value for the order, in the token's main units (e.g. ETH instead of wei)
   * @param endAmount The end value for the order, in the token's main units (e.g. ETH instead of wei). If unspecified, the order's `extra` attribute will be 0
   */
  async getPriceParameters(
    openseaAPI: OpenSeaAPI,
    orderSide: OrderSide,
    tokenAddress: string,
    expirationTime: number,
    startAmount: BigNumber,
    endAmount?: BigNumber,
    waitingForBestCounterOrder = false,
    englishAuctionReservePrice?: number
  ) {
    const priceDiff =
      endAmount != null ? BigNumber.from(startAmount).sub(endAmount) : 0
    const paymentToken = tokenAddress.toLowerCase()
    const isEther = tokenAddress == ethers.constants.AddressZero
    const { tokens } = await OpenseaHelper.getPaymentTokensFromApi(
      openseaAPI,
      paymentToken
    )
    const token = tokens[0]

    // Validation
    if (startAmount == null || BigNumber.from(startAmount).lt(0)) {
      throw new Error(`Starting price must be a number >= 0`)
    }
    if (!isEther && !token) {
      throw new Error(`No ERC-20 token found for '${paymentToken}'`)
    }
    if (isEther && waitingForBestCounterOrder) {
      throw new Error(
        `English auctions must use wrapped ETH or an ERC-20 token.`
      )
    }
    if (isEther && orderSide === OrderSide.Buy) {
      // throw new Error(`Offers must use wrapped ETH or an ERC-20 token.`)
    }
    if (priceDiff < 0) {
      throw new Error(
        'End price must be less than or equal to the start price.'
      )
    }
    if (priceDiff > 0 && expirationTime == 0) {
      throw new Error(
        'Expiration time must be set if order will change in price.'
      )
    }
    if (englishAuctionReservePrice && !waitingForBestCounterOrder) {
      throw new Error('Reserve prices may only be set on English auctions.')
    }
    if (
      englishAuctionReservePrice &&
      startAmount.gt(englishAuctionReservePrice)
      /// englishAuctionReservePrice < startAmount
    ) {
      throw new Error(
        'Reserve price must be greater than or equal to the start amount.'
      )
    }

    // Note: WyvernProtocol.toBaseUnitAmount(makeBigNumber(startAmount), token.decimals)
    // will fail if too many decimal places, so special-case ether
    const basePrice = isEther
      ?  ethers.utils.parseUnits(startAmount.toString(), 'ether')   
      : OpenseaHelper.toBaseUnitAmount(
          BigNumber.from(startAmount),
          token.decimals
        )

    const extra = isEther
      ? ethers.utils.parseUnits(priceDiff.toString(), 'ether')
      : OpenseaHelper.toBaseUnitAmount(
          BigNumber.from(priceDiff),
          token.decimals
        )

    const reservePrice = englishAuctionReservePrice
      ? isEther
        ?  ethers.utils.parseUnits(englishAuctionReservePrice.toString(), 'ether') 
        : OpenseaHelper.toBaseUnitAmount(
            BigNumber.from(englishAuctionReservePrice),
            token.decimals
          )
      : undefined

    return { basePrice, extra, paymentToken, reservePrice }
  },

  /**
   * Get current transfer fees for an asset
   * @param web3 Web3 instance
   * @param asset The asset to check for transfer fees
   */
  getTransferFeeSettings() {
    let transferFee: BigNumber | undefined
    let transferFeeTokenAddress: string | undefined

    /* if (asset.tokenAddress.toLowerCase() == ENJIN_ADDRESS.toLowerCase()) {
      // Enjin asset
      const feeContract = new web3.eth.Contract(
        ERC1155,
        asset.tokenAddress
      ) as unknown as ERC1155Abi;
  
      const params = await feeContract.methods
        .transferSettings(asset.tokenId as string)
        .call({ from: accountAddress });
      if (params) {
        transferFee = makeBigNumber(params[3]);
        if (params[2] === "0") {
          transferFeeTokenAddress = ENJIN_COIN_ADDRESS;
        }
      }
    }*/
    return { transferFee, transferFeeTokenAddress }
  },

  /**
   * Compute the fees for an order
   * @param param0 __namedParameters
   * @param asset Asset to use for fees. May be blank ONLY for multi-collection bundles.
   * @param side The side of the order (buy or sell)
   * @param accountAddress The account to check fees for (useful if fees differ by account, like transfer fees)
   * @param extraBountyBasisPoints The basis points to add for the bounty. Will throw if it exceeds the assets' contract's OpenSea fee.
   */
  async computeFees({
    asset,
    side,
    accountAddress,
    extraBountyBasisPoints = 0,
  }: {
    asset?: OpenSeaAsset
    side: OrderSide
    accountAddress?: string
    extraBountyBasisPoints?: number
  }): Promise<ComputedFees> {
    let openseaBuyerFeeBasisPoints = DEFAULT_BUYER_FEE_BASIS_POINTS
    let openseaSellerFeeBasisPoints = DEFAULT_SELLER_FEE_BASIS_POINTS
    let devBuyerFeeBasisPoints = 0
    let devSellerFeeBasisPoints = 0
    let transferFee = OpenseaHelper.makeBigNumber(0)
    let transferFeeTokenAddress = null
    let maxTotalBountyBPS = DEFAULT_MAX_BOUNTY

    if (asset) {
      openseaBuyerFeeBasisPoints = +asset.collection.openseaBuyerFeeBasisPoints
      openseaSellerFeeBasisPoints =
        +asset.collection.openseaSellerFeeBasisPoints
      devBuyerFeeBasisPoints = +asset.collection.devBuyerFeeBasisPoints
      devSellerFeeBasisPoints = +asset.collection.devSellerFeeBasisPoints

      maxTotalBountyBPS = openseaSellerFeeBasisPoints
    }

    // Compute transferFrom fees
    if (side == OrderSide.Sell && asset) {
      // Server-side knowledge
      transferFee = asset.transferFee
        ? OpenseaHelper.makeBigNumber(asset.transferFee.toString())
        : transferFee
      transferFeeTokenAddress = asset.transferFeePaymentToken
        ? asset.transferFeePaymentToken.address
        : transferFeeTokenAddress

      try {
        // no transfer fees typically

        // web3 call to update it
        const result = OpenseaHelper.getTransferFeeSettings()
        transferFee =
          result.transferFee != null ? result.transferFee : transferFee
        transferFeeTokenAddress =
          result.transferFeeTokenAddress ?? transferFeeTokenAddress
      } catch (error) {
        // Use server defaults
        console.error(error)
      }
    }

    // Compute bounty
    const sellerBountyBasisPoints =
      side == OrderSide.Sell ? extraBountyBasisPoints : 0

    // Check that bounty is in range of the opensea fee
    const bountyTooLarge =
      sellerBountyBasisPoints + OPENSEA_SELLER_BOUNTY_BASIS_POINTS >
      maxTotalBountyBPS
    if (sellerBountyBasisPoints > 0 && bountyTooLarge) {
      let errorMessage = `Total bounty exceeds the maximum for this asset type (${
        maxTotalBountyBPS / 100
      }%).`
      if (maxTotalBountyBPS >= OPENSEA_SELLER_BOUNTY_BASIS_POINTS) {
        errorMessage += ` Remember that OpenSea will add ${
          OPENSEA_SELLER_BOUNTY_BASIS_POINTS / 100
        }% for referrers with OpenSea accounts!`
      }
      throw new Error(errorMessage)
    }

    return {
      totalBuyerFeeBasisPoints:
        openseaBuyerFeeBasisPoints + devBuyerFeeBasisPoints,
      totalSellerFeeBasisPoints:
        openseaSellerFeeBasisPoints + devSellerFeeBasisPoints,
      openseaBuyerFeeBasisPoints,
      openseaSellerFeeBasisPoints,
      devBuyerFeeBasisPoints,
      devSellerFeeBasisPoints,
      sellerBountyBasisPoints,
      transferFee,
      transferFeeTokenAddress,
    }
  },

  /**
   * Get the non-prefixed hash for the order
   * (Fixes a Wyvern typescript issue and casing issue)
   * @param order order to hash
   */
  getOrderHash(order: UnhashedOrder) {
    const orderWithStringTypes = {
      ...order,
      maker: order.maker.toLowerCase(),
      taker: order.taker.toLowerCase(),
      feeRecipient: order.feeRecipient.toLowerCase(),
      side: order.side.toString(),
      saleKind: order.saleKind.toString(),
      howToCall: order.howToCall.toString(),
      feeMethod: order.feeMethod.toString(),
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return WyvernProtocol.getOrderHashHex(orderWithStringTypes as any)
  },

  _dispatch(event: EventType, data: any) {
    //_emitter.emit(event, data);

    console.log('emit', event, data)
  },

  /**
   * Generate the signature for authorizing an order
   * @param order Unsigned wyvern order
   * @returns order signature in the form of v, r, s, also an optional nonce
   */
  async authorizeOrder(
    wallet: Wallet,
    order: UnsignedOrder,
    txProvider: JsonRpcProvider,
    wyvernNonce: number
  ): Promise<(ECSignature & { nonce?: number }) | null> {
    const signerAddress = order.maker

    const walletAddress = await wallet.getAddress()
    if (order.maker != walletAddress) {
      throw new Error(`WARN MISMATCH: ',${order.maker}, ${walletAddress}`)
    }

    const txNetwork = await txProvider.getNetwork()
    const chainId = txNetwork.chainId

    this._dispatch(EventType.CreateOrder, {
      order,
      accountAddress: order.maker,
    })

    try {
      // 2.3 Sign order flow using EIP-712
      /* const signerOrderNonce = await txProvider.getTransactionCount(
        signerAddress
      )*/

      const signerOrderNonce = wyvernNonce

      // We need to manually specify each field because OS orders can contain unrelated data
      const orderForSigning: RawWyvernOrderJSON = {
        exchange: order.exchange,
        maker: order.maker,
        taker: order.taker,
        makerRelayerFee: order.makerRelayerFee.toString(),
        takerRelayerFee: order.takerRelayerFee.toString(),
        makerProtocolFee: order.makerProtocolFee.toString(),
        takerProtocolFee: order.takerProtocolFee.toString(),
        feeRecipient: order.feeRecipient,
        feeMethod: order.feeMethod,
        side: order.side,
        saleKind: order.saleKind,
        target: order.target,
        howToCall: order.howToCall,
        calldata: order.calldata,
        replacementPattern: order.replacementPattern,
        staticTarget: order.staticTarget,
        staticExtradata: order.staticExtradata,
        paymentToken: order.paymentToken,
        basePrice: order.basePrice.toString(),
        extra: order.extra.toString(),
        listingTime: order.listingTime.toString(),
        expirationTime: order.expirationTime.toString(),
        salt: order.salt.toString(),
      }

      // We don't JSON.stringify as certain wallet providers sanitize this data
      // https://github.com/coinbase/coinbase-wallet-sdk/issues/60
      const typedData = {
        types: {
          /*EIP712Domain: {
                name: 'string',
                type: 'string'
            },*/
          Order: [
            { name: 'exchange', type: 'address' },
            { name: 'maker', type: 'address' },
            { name: 'taker', type: 'address' },
            { name: 'makerRelayerFee', type: 'uint256' },
            { name: 'takerRelayerFee', type: 'uint256' },
            { name: 'makerProtocolFee', type: 'uint256' },
            { name: 'takerProtocolFee', type: 'uint256' },
            { name: 'feeRecipient', type: 'address' },
            { name: 'feeMethod', type: 'uint8' },
            { name: 'side', type: 'uint8' },
            { name: 'saleKind', type: 'uint8' },
            { name: 'target', type: 'address' },
            { name: 'howToCall', type: 'uint8' },
            { name: 'calldata', type: 'bytes' },
            { name: 'replacementPattern', type: 'bytes' },
            { name: 'staticTarget', type: 'address' },
            { name: 'staticExtradata', type: 'bytes' },
            { name: 'paymentToken', type: 'address' },
            { name: 'basePrice', type: 'uint256' },
            { name: 'extra', type: 'uint256' },
            { name: 'listingTime', type: 'uint256' },
            { name: 'expirationTime', type: 'uint256' },
            { name: 'salt', type: 'uint256' },
            { name: 'nonce', type: 'uint256' },
          ],
        },
        domain: {
          name: EIP_712_WYVERN_DOMAIN_NAME,
          version: EIP_712_WYVERN_DOMAIN_VERSION,
          chainId, //networkName == Network.Main ? 1 : 4,
          verifyingContract: order.exchange,
        },

        message: { ...orderForSigning, nonce: signerOrderNonce },
      }

      /*

      const domain = {
                name: 'My Messaging App',
                version: '1',
                chainId: 5,
                verifyingContract: '0x7753cfAD258eFbC52A9A1452e42fFbce9bE486cb'
            };

        const types = {
            Message: [
                { name: 'content', type: 'string' }
            ]
        };

        const message = {
            content: 'a signed message'
        };

      */

      const ecSignature: ECSignature =
        await OpenseaHelper.signTypedDataWithWallet(wallet, typedData)

      return { ...ecSignature, nonce: signerOrderNonce }
    } catch (error) {
      this._dispatch(EventType.OrderDenied, {
        order,
        accountAddress: signerAddress,
      })
      throw error
    }
  },

  async signTypedDataWithWallet(
    wallet: Wallet,
    typedData: any
  ): Promise<ECSignature> {
    const signature = await wallet._signTypedData(
      typedData.domain,
      typedData.types,
      typedData.message
    )

    return OpenseaHelper.parseSignatureHex(signature)
  },

  /**
   * Sign messages using web3 signTypedData signatures
   * @param web3 Web3 instance
   * @param message message to sign
   * @param signerAddress web3 address signing the message
   * @returns A signature if provider can sign, otherwise null
   */

  async signTypedDataAsync(
    provider: EthereumProvider,
    message: object,
    signerAddress: string
  ): Promise<ECSignature> {
    // Using sign typed data V4 works with a stringified message, used by browser providers i.e. Metamask
    const signature = await OpenseaHelper.promisify<
      JsonRpcResponse | undefined
    >((c) =>
      provider.sendAsync(
        {
          method: 'eth_signTypedData_v4',
          params: [signerAddress, JSON.stringify(message)],
          from: signerAddress,
          id: new Date().getTime(),
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } as any,
        c
      )
    )

    return OpenseaHelper.parseSignatureHex(signature?.result)
  },

  /**
   * Promisify a callback-syntax web3 function
   * @param inner callback function that accepts a Web3 callback function and passes
   * it to the Web3 function
   */
  async promisify<T>(inner: (fn: Web3Callback<T>) => void) {
    return await new Promise<T>((resolve, reject) =>
      inner((err: any, res: any) => {
        if (err) {
          reject(err)
        }
        resolve(res)
      })
    )
  },

  // sourced from 0x.js:
  // https://github.com/ProjectWyvern/wyvern-js/blob/39999cb93ce5d80ea90b4382182d1bd4339a9c6c/src/utils/signature_utils.ts
  parseSignatureHex(signature: string): ECSignature {
    // HACK: There is no consensus on whether the signatureHex string should be formatted as
    // v + r + s OR r + s + v, and different clients (even different versions of the same client)
    // return the signature params in different orders. In order to support all client implementations,
    // we parse the signature in both ways, and evaluate if either one is a valid signature.
    const validVParamValues = [27, 28]

    const ecSignatureRSV = _parseSignatureHexAsRSV(signature)
    if (_.includes(validVParamValues, ecSignatureRSV.v)) {
      return ecSignatureRSV
    }

    // For older clients
    const ecSignatureVRS = _parseSignatureHexAsVRS(signature)
    if (_.includes(validVParamValues, ecSignatureVRS.v)) {
      return ecSignatureVRS
    }

    throw new Error('Invalid signature')

    function _parseSignatureHexAsVRS(signatureHex: string): ECSignature {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const signatureBuffer: Buffer = ethUtil.toBuffer(signatureHex)
      let v = signatureBuffer[0]
      if (v < 27) {
        v += 27
      }
      const r = signatureBuffer.slice(1, 33)
      const s = signatureBuffer.slice(33, 65)
      const ecSignature = {
        v,
        r: ethUtil.bufferToHex(r),
        s: ethUtil.bufferToHex(s),
      }
      return ecSignature
    }

    function _parseSignatureHexAsRSV(signatureHex: string): ECSignature {
      const { v, r, s } = ethUtil.fromRpcSig(signatureHex)
      const ecSignature = {
        v,
        r: ethUtil.bufferToHex(r),
        s: ethUtil.bufferToHex(s),
      }
      return ecSignature
    }
  },

  async makeSimpleBuyOrder({
    exchangeAddress,
    openSeaAPI,
    asset,
    quantity = 1,
    accountAddress,
    startAmount,
    paymentTokenAddress,
    extraBountyBasisPoints = 0,
    sellOrder,
    referrerAddress,
    networkName,
  }: {
    exchangeAddress: string
    openSeaAPI: OpenSeaAPI
    asset: Asset
    quantity?: number
    accountAddress: string
    startAmount: BigNumberish
    paymentTokenAddress: string
    extraBountyBasisPoints?: number
    sellOrder?: UnhashedOrder
    referrerAddress?: string
    networkName: string
  }): Promise<UnhashedOrder> {
    //accountAddress = validateAndFormatWalletAddress(this.web3, accountAddress);

    const schema = this._getSchema(networkName, this._getSchemaName(asset))

    const quantityBN = OpenseaHelper.toBaseUnitAmount(
      OpenseaHelper.makeBigNumber(quantity),
      asset.decimals ?? 0
    )
    const wyAsset = OpenseaHelper.getWyvernAsset(schema, asset, quantityBN)

    const openSeaAsset: OpenSeaAsset = await OpenseaHelper.getAssetFromAPI(
      openSeaAPI,
      asset
    ) // this.api.getAsset(asset);

    const minListingTimestamp = Math.round(Date.now() / 1000)

    const listingTime = minListingTimestamp - 300 // + moment.duration(1,'day').asSeconds()
    const expirationTime = listingTime + moment.duration(2, 'days').asSeconds() //getMaxOrderExpirationTimestamp()

    const taker = sellOrder ? sellOrder.maker : ethers.constants.AddressZero

    const { totalBuyerFeeBasisPoints, totalSellerFeeBasisPoints } =
      await this.computeFees({
        asset: openSeaAsset,
        extraBountyBasisPoints,
        side: OrderSide.Buy,
      })

    const {
      makerRelayerFee,
      takerRelayerFee,
      makerProtocolFee,
      takerProtocolFee,
      makerReferrerFee,
      feeRecipient,
      feeMethod,
    } = OpenseaHelper.getBuyFeeParameters(
      totalBuyerFeeBasisPoints,
      totalSellerFeeBasisPoints,
      sellOrder
    )

    const { target, calldata, replacementPattern } = encodeBuy(
      schema,
      wyAsset,
      accountAddress,
      undefined
    )

    const { basePrice, extra, paymentToken } =
      await OpenseaHelper.getPriceParameters(
        openSeaAPI,
        OrderSide.Buy,
        paymentTokenAddress,
        expirationTime,
        BigNumber.from(startAmount)
      )

    const times = OpenseaHelper.getTimeParameters({
      expirationTimestamp: expirationTime,
      listingTimestamp: listingTime,
    })

    const network = networkName == 'main' ? Network.Main : Network.Rinkeby

    const { staticTarget, staticExtradata } =
      await OpenseaHelper.getStaticCallTargetAndExtraData({
        asset: openSeaAsset,
        useTxnOriginStaticCall: false,
        network,
      })

    return {
      exchange: exchangeAddress,
      maker: accountAddress,
      taker,
      quantity: quantityBN,
      makerRelayerFee,
      takerRelayerFee,
      makerProtocolFee,
      takerProtocolFee,
      makerReferrerFee,
      waitingForBestCounterOrder: false,
      feeMethod,
      feeRecipient,
      side: OrderSide.Buy,
      saleKind: SaleKind.FixedPrice,
      target,
      howToCall:
        target === OpenseaHelper.getMerkleValidatorFromNetwork(networkName) //merkleValidatorByNetwork[networkName]
          ? HowToCall.DelegateCall
          : HowToCall.Call,
      calldata,
      replacementPattern,
      staticTarget,
      staticExtradata,
      paymentToken,
      basePrice: BigNumber.from(basePrice),
      extra: BigNumber.from(extra),
      listingTime: times.listingTime,
      expirationTime: times.expirationTime,
      salt: OpenseaHelper.generatePseudoRandomSalt(),
      metadata: {
        asset: wyAsset,
        schema: schema.name as WyvernSchemaName,
        referrerAddress,
      },
    }
  },

  //seaport docs https://projectopensea.github.io/opensea-js/

  async makeSimpleSellOrder({
    exchangeAddress,
    openSeaAPI,
    asset,
    quantity = 1,
    sellerAddress,
    buyerAddress = ethers.constants.AddressZero,
    paymentAmount,
    paymentTokenAddress,
    networkName = 'main',
  }: {
    exchangeAddress: string
    openSeaAPI: OpenSeaAPI
    asset: Asset
    quantity?: number
    sellerAddress: string
    buyerAddress?: string
    paymentAmount: number
    paymentTokenAddress: string
    networkName?: string
  }): Promise<UnhashedOrder> {
    //accountAddress,
    const startAmount = paymentAmount
    const endAmount = paymentAmount

    const minListingTimestamp = Math.round(Date.now() / 1000)

    //Listing time is 5 minutes in the past so the solidity contract accepts the value as valid
    const listingTime = minListingTimestamp - 300 // + moment.duration(1,'day').asSeconds()
    const expirationTime = listingTime + moment.duration(2, 'days').asSeconds() //getMaxOrderExpirationTimestamp()

    const waitForHighestBid = false
    const englishAuctionReservePrice = 0

    const extraBountyBasisPoints = 0
    //const buyerAddress = ethers.constants.AddressZero

    const network = networkName == 'main' ? Network.Main : Network.Rinkeby

    const schema = this._getSchema(networkName, this._getSchemaName(asset))
    const quantityBN: BigNumber = OpenseaHelper.toBaseUnitAmount(
      OpenseaHelper.makeBigNumber(quantity),
      asset.decimals ?? 0
    )
    const wyAsset = OpenseaHelper.getWyvernAsset(schema, asset, quantityBN)
    const openSeaAsset: OpenSeaAsset = await OpenseaHelper.getAssetFromAPI(
      openSeaAPI,
      asset
    ) // this.api.getAsset(asset);

    const {
      totalSellerFeeBasisPoints,
      totalBuyerFeeBasisPoints,
      sellerBountyBasisPoints,
    } = await OpenseaHelper.computeFees({
      asset: openSeaAsset,
      side: OrderSide.Sell,
      extraBountyBasisPoints,
    })

    const { target, calldata, replacementPattern } = encodeSell(
      schema,
      wyAsset,
      sellerAddress,
      undefined //no merkle validator - only need merkle validator for batch nft transfer
    )

    const orderSaleKind =
      endAmount != null && endAmount !== startAmount
        ? SaleKind.DutchAuction
        : SaleKind.FixedPrice

    const { basePrice, extra, paymentToken, reservePrice } =
      await OpenseaHelper.getPriceParameters(
        openSeaAPI,
        OrderSide.Sell,
        paymentTokenAddress,
        expirationTime,
        BigNumber.from(startAmount),
        BigNumber.from(endAmount),
        waitForHighestBid,
        englishAuctionReservePrice
      )
    const times = OpenseaHelper.getTimeParameters({
      expirationTimestamp: expirationTime,
      listingTimestamp: listingTime,
      waitingForBestCounterOrder: waitForHighestBid,
    })

    const {
      makerRelayerFee,
      takerRelayerFee,
      makerProtocolFee,
      takerProtocolFee,
      makerReferrerFee,
      feeRecipient,
      feeMethod,
    } = OpenseaHelper.getSellFeeParameters(
      totalBuyerFeeBasisPoints,
      totalSellerFeeBasisPoints,
      waitForHighestBid,
      sellerBountyBasisPoints
    )

    const { staticTarget, staticExtradata } =
      await OpenseaHelper.getStaticCallTargetAndExtraData({
        asset: openSeaAsset,
        useTxnOriginStaticCall: waitForHighestBid,
        network,
      })

    return {
      exchange: exchangeAddress,
      maker: sellerAddress,
      taker: buyerAddress,
      quantity: quantityBN,
      makerRelayerFee,
      takerRelayerFee,
      makerProtocolFee,
      takerProtocolFee,
      makerReferrerFee,
      waitingForBestCounterOrder: waitForHighestBid,
      englishAuctionReservePrice: reservePrice
        ? OpenseaHelper.makeBigNumber(reservePrice)
        : undefined,
      feeMethod,
      feeRecipient,
      side: OrderSide.Sell,
      saleKind: orderSaleKind,
      target,
      howToCall:
        target === OpenseaHelper.getMerkleValidatorFromNetwork(networkName)
          ? HowToCall.DelegateCall
          : HowToCall.Call,
      calldata,
      replacementPattern,
      staticTarget,
      staticExtradata,
      paymentToken,
      basePrice: BigNumber.from(basePrice),
      extra: BigNumber.from(extra),
      listingTime: times.listingTime,
      expirationTime: times.expirationTime,
      salt: OpenseaHelper.generatePseudoRandomSalt(),
      metadata: {
        asset: wyAsset,
        schema: schema.name as WyvernSchemaName,
      },
    }
  },

  async hashAndAuthorizeOrder(
    unhashedOrder: UnhashedOrder,
    wallet: Wallet,
    txProvider: JsonRpcProvider,
    wyvernNonce: number
  ): Promise<SignedOrder | undefined> {
    const hashedOrder = {
      ...unhashedOrder,
      hash: OpenseaHelper.getOrderHash(unhashedOrder),
    }

    const signature = await OpenseaHelper.authorizeOrder(
      wallet,
      hashedOrder,
      txProvider,
      wyvernNonce
    )

    if (!signature) {
      return undefined
    }

    const orderWithSignature = {
      ...hashedOrder,
      ...signature,
    }

    return orderWithSignature
  },

  async simpleValidateOrder(wyvernContract: Contract, order: SignedOrder) {
    const isValid = await wyvernContract.validateOrder_(
      [
        order.exchange,
        order.maker,
        order.taker,
        order.feeRecipient,
        order.target,
        order.staticTarget,
        order.paymentToken,
      ],
      [
        order.makerRelayerFee,
        order.takerRelayerFee,
        order.makerProtocolFee,
        order.takerProtocolFee,
        order.basePrice,
        order.extra,
        order.listingTime,
        order.expirationTime,
        order.salt,
      ],
      order.feeMethod,
      order.side,
      order.saleKind,
      order.howToCall,
      order.calldata,
      order.replacementPattern,
      order.staticExtradata,
      order.v || 0,
      order.r || NULL_BLOCK_HASH,
      order.s || NULL_BLOCK_HASH
    )
    //.callAsync();

    return isValid
  },

  async simpleOrdersCanMatch(
    exchangeContractInstance: Contract,

    buyOrderWithSignature: SignedOrder,
    sellOrderWithSignature: SignedOrder
  ) {
    if (sellOrderWithSignature.side != OrderSide.Sell) {
      throw new Error('Must be sell order')
    }
    if (buyOrderWithSignature.side != OrderSide.Buy) {
      throw new Error('Must be buy order')
    }

    const args = OpenseaHelper.buildWyvernAtomicMatchParamsFromOrders(
      buyOrderWithSignature,
      sellOrderWithSignature
    )

    const result = await exchangeContractInstance.ordersCanMatch_(
      args[0],
      args[1],
      args[2],
      args[3],
      args[4],
      args[5],
      args[6],
      args[7],
      args[8]
    )

    return result
  },



  buildWyvernAtomicMatchParamFromOrder( 
    orderWithSignature: SignedOrder){
      const metadata = undefined

      const args = [
        [
          orderWithSignature.exchange,
          orderWithSignature.maker,
          orderWithSignature.taker,
          orderWithSignature.feeRecipient,
          orderWithSignature.target,
          orderWithSignature.staticTarget,
          orderWithSignature.paymentToken,
          
        ],
        [
          orderWithSignature.makerRelayerFee,
          orderWithSignature.takerRelayerFee,
          orderWithSignature.makerProtocolFee,
          orderWithSignature.takerProtocolFee,
          orderWithSignature.basePrice,
          orderWithSignature.extra,
          orderWithSignature.listingTime,
          orderWithSignature.expirationTime,
          orderWithSignature.salt,
          
        ],
        orderWithSignature.feeMethod,
        orderWithSignature.side,
        orderWithSignature.saleKind,
        orderWithSignature.howToCall,
       
        orderWithSignature.calldata,
         
        orderWithSignature.replacementPattern,
        
        orderWithSignature.staticExtradata,
         
        orderWithSignature.v || 0 ,
         
          orderWithSignature.r || NULL_BLOCK_HASH,
          orderWithSignature.s || NULL_BLOCK_HASH,
        
      ]
  
      return args


  },

  buildWyvernAtomicMatchParamsFromOrders(
    buyOrderWithSignature: SignedOrder,
    sellOrderWithSignature: SignedOrder
    
  ) : WyvernAtomicMatchParameters {
    const metadata = undefined

    const args: WyvernAtomicMatchParameters = [
      [
        buyOrderWithSignature.exchange,
        buyOrderWithSignature.maker,
        buyOrderWithSignature.taker,
        buyOrderWithSignature.feeRecipient,
        buyOrderWithSignature.target,
        buyOrderWithSignature.staticTarget,
        buyOrderWithSignature.paymentToken,
        sellOrderWithSignature.exchange,
        sellOrderWithSignature.maker,
        sellOrderWithSignature.taker,
        sellOrderWithSignature.feeRecipient,
        sellOrderWithSignature.target,
        sellOrderWithSignature.staticTarget,
        sellOrderWithSignature.paymentToken,
      ],
      [
        buyOrderWithSignature.makerRelayerFee,
        buyOrderWithSignature.takerRelayerFee,
        buyOrderWithSignature.makerProtocolFee,
        buyOrderWithSignature.takerProtocolFee,
        buyOrderWithSignature.basePrice,
        buyOrderWithSignature.extra,
        buyOrderWithSignature.listingTime,
        buyOrderWithSignature.expirationTime,
        buyOrderWithSignature.salt,
        sellOrderWithSignature.makerRelayerFee,
        sellOrderWithSignature.takerRelayerFee,
        sellOrderWithSignature.makerProtocolFee,
        sellOrderWithSignature.takerProtocolFee,
        sellOrderWithSignature.basePrice,
        sellOrderWithSignature.extra,
        sellOrderWithSignature.listingTime,
        sellOrderWithSignature.expirationTime,
        sellOrderWithSignature.salt,
      ],
      [
        buyOrderWithSignature.feeMethod,
        buyOrderWithSignature.side,
        buyOrderWithSignature.saleKind,
        buyOrderWithSignature.howToCall,
        sellOrderWithSignature.feeMethod,
        sellOrderWithSignature.side,
        sellOrderWithSignature.saleKind,
        sellOrderWithSignature.howToCall,
      ],
      buyOrderWithSignature.calldata,
      sellOrderWithSignature.calldata,
      buyOrderWithSignature.replacementPattern,
      sellOrderWithSignature.replacementPattern,
      buyOrderWithSignature.staticExtradata,
      sellOrderWithSignature.staticExtradata,
      [buyOrderWithSignature.v || 0, sellOrderWithSignature.v || 0],
      [
        buyOrderWithSignature.r || NULL_BLOCK_HASH,
        buyOrderWithSignature.s || NULL_BLOCK_HASH,
        sellOrderWithSignature.r || NULL_BLOCK_HASH,
        sellOrderWithSignature.s || NULL_BLOCK_HASH,
        metadata ?? NULL_BLOCK_HASH,
      ],
    ]

    return args
  },

  async simpleAtomicMatch(
    exchangeContractInstance: Contract,
    buyer: Signer,
    sellOrderWithSignature: SignedOrder,
    buyOrderWithSignature: SignedOrder
  ) {
    const args = OpenseaHelper.buildWyvernAtomicMatchParamsFromOrders(
      buyOrderWithSignature,
      sellOrderWithSignature
    )

    const result = await exchangeContractInstance
      .connect(buyer)
      .atomicMatch_(
        args[0],
        args[1],
        args[2],
        args[3],
        args[4],
        args[5],
        args[6],
        args[7],
        args[8],
        args[9],
        args[10]
      )
    return result
  },
}
