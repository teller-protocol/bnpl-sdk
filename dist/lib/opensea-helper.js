"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.OpenseaHelper = exports.parseMetadata = exports.parseHowToCall = exports.parseSaleKind = exports.parseFeeMethod = exports.getMethod = exports.merkleValidatorByNetwork = void 0;
const ethUtil = __importStar(require("ethereumjs-util"));
const ethers_1 = require("ethers");
const moment_1 = __importDefault(require("moment"));
const constants_1 = require("opensea-js/lib/constants");
const contracts_1 = require("opensea-js/lib/contracts");
const types_1 = require("opensea-js/lib/types");
const schema_1 = require("opensea-js/lib/utils/schema");
const utils_1 = require("opensea-js/lib/utils/utils");
const WyvernSchemas = __importStar(require("wyvern-schemas"));
const _ = require('lodash');
exports.merkleValidatorByNetwork = {
    [types_1.Network.Main]: constants_1.MERKLE_VALIDATOR_MAINNET,
    [types_1.Network.Rinkeby]: constants_1.MERKLE_VALIDATOR_RINKEBY,
};
const getMethod = (abi, name) => {
    const methodAbi = abi.find((x) => x.type == 'function' && x.name == name);
    if (!methodAbi) {
        throw new Error(`ABI ${name} not found`);
    }
    // Have to cast since there's a bug in
    // web3 types on the 'type' field
    return methodAbi;
};
exports.getMethod = getMethod;
const encodeSellCustom = (schema, asset, address, validatorAddress) => {
    const transfer = validatorAddress && schema.functions.checkAndTransfer
        ? schema.functions.checkAndTransfer(asset, validatorAddress)
        : schema.functions.transfer(asset);
    return {
        target: transfer.target,
        calldata: (0, schema_1.encodeDefaultCall)(transfer, address),
        replacementPattern: (0, schema_1.encodeReplacementPattern)(transfer),
    };
};
function parseFeeMethod(input) {
    return input == "0" ? types_1.FeeMethod.ProtocolFee : types_1.FeeMethod.SplitFee;
}
exports.parseFeeMethod = parseFeeMethod;
function parseSaleKind(input) {
    return input == "0" ? types_1.SaleKind.FixedPrice : types_1.SaleKind.DutchAuction;
}
exports.parseSaleKind = parseSaleKind;
function parseHowToCall(input) {
    return input == "0" ? types_1.HowToCall.Call : types_1.HowToCall.DelegateCall;
}
exports.parseHowToCall = parseHowToCall;
function parseMetadata(input) {
    console.log('parsing metadata', input);
    return JSON.parse(JSON.stringify(input));
}
exports.parseMetadata = parseMetadata;
exports.OpenseaHelper = {
    getPaymentTokensFromApi(openseaAPI, tokenAddress) {
        return __awaiter(this, void 0, void 0, function* () {
            const tokens = yield openseaAPI.getPaymentTokens({ address: tokenAddress });
            return tokens;
        });
    },
    getAssetFromAPI(openseaAPI, asset) {
        return __awaiter(this, void 0, void 0, function* () {
            const stubbedAsset = {
                tokenAddress: '0x06012c8cf97bead5deae237070f9587f8e7a266d',
                tokenId: '1', // Token ID
            };
            return yield openseaAPI.getAsset(stubbedAsset);
        });
    },
    getMerkleValidatorFromNetwork(networkName) {
        if (networkName == 'rinkeby') {
            return constants_1.MERKLE_VALIDATOR_RINKEBY;
        }
        return constants_1.MERKLE_VALIDATOR_MAINNET;
    },
    /**
     * Get the Wyvern representation of a fungible asset
     * @param schema The WyvernSchema needed to access this asset
     * @param asset The asset to trade
     * @param quantity The number of items to trade
     */
    getWyvernAsset(schema, asset, quantity = ethers_1.BigNumber.from(1)) {
        const tokenId = asset.tokenId != null ? asset.tokenId.toString() : undefined;
        return schema.assetFromFields({
            ID: tokenId,
            Quantity: quantity.toString(),
            Address: asset.tokenAddress.toLowerCase(),
            Name: asset.name,
        });
    },
    /**
     * Generates a pseudo-random 256-bit salt.
     * The salt can be included in an 0x order, ensuring that the order generates a unique orderHash
     * and will not collide with other outstanding orders that are identical in all other parameters.
     * @return  A pseudo-random 256-bit number that can be used as a salt.
     */
    generatePseudoRandomSalt() {
        const MAX_BITS = 256;
        const size = Math.floor(MAX_BITS / 8) - 1;
        const salt = ethers_1.BigNumber.from(ethers_1.ethers.utils.randomBytes(size));
        return salt;
    },
    /**
     * A baseUnit is defined as the smallest denomination of a token. An amount expressed in baseUnits
     * is the amount expressed in the smallest denomination.
     * E.g: 1 unit of a token with 18 decimal places is expressed in baseUnits as 1000000000000000000
     * @param   amount      The amount of units that you would like converted to baseUnits.
     * @param   decimals    The number of decimal places the unit amount has.
     * @return  The amount in baseUnits.
     */
    toBaseUnitAmount(amount, decimals) {
        const unit = ethers_1.BigNumber.from(10).pow(decimals);
        const baseUnitAmount = amount.mul(unit);
        /*const hasDecimals = baseUnitAmount.decimalPlaces() !== 0;
                if (hasDecimals) {
                    throw new Error(`Invalid unit amount: ${amount.toString()} - Too many decimal places`);
                }*/
        return baseUnitAmount;
    },
    /**
     * Special fixes for making BigNumbers using web3 results
     * @param arg An arg or the result of a web3 call to turn into a BigNumber
     */
    makeBigNumber(arg) {
        const result = arg === '0x' ? 0 : arg;
        return ethers_1.BigNumber.from(result.toString());
    },
    _getSchemaName(asset) {
        if (asset.schemaName) {
            return asset.schemaName;
        }
        else if ('assetContract' in asset) {
            return asset.assetContract.schemaName;
        }
        return undefined;
    },
    _getSchema(networkName, schemaName) {
        const schemaName_ = schemaName !== null && schemaName !== void 0 ? schemaName : types_1.WyvernSchemaName.ERC721;
        //  const allSchemas: { string: Schema<any> } = WyvernSchemas.schemas
        //  const networkSchemas: Array<Schema<any>> = allSchemas[networkName as keyof { string: Schema<any> }]
        // @ts-ignore
        const schema = WyvernSchemas.schemas[networkName].filter((s) => s.name == schemaName_)[0];
        if (!schema) {
            throw new Error(`Trading for this asset (${schemaName_}) is not yet supported. Please contact us or check back later!`);
        }
        return schema;
    },
    getStaticCallTargetAndExtraData({ asset, useTxnOriginStaticCall, network, }) {
        return __awaiter(this, void 0, void 0, function* () {
            const isMainnet = network == types_1.Network.Main;
            if (isMainnet && !useTxnOriginStaticCall) {
                // While testing, we will use dummy values for mainnet. We will remove this if-statement once we have pushed the PR once and tested on Rinkeby
                return {
                    staticTarget: ethers_1.ethers.constants.AddressZero,
                    staticExtradata: '0x',
                };
            }
            if (useTxnOriginStaticCall) {
                return {
                    staticTarget: isMainnet
                        ? constants_1.STATIC_CALL_TX_ORIGIN_ADDRESS
                        : constants_1.STATIC_CALL_TX_ORIGIN_RINKEBY_ADDRESS,
                    staticExtradata: (0, schema_1.encodeCall)((0, exports.getMethod)(contracts_1.StaticCheckTxOrigin, 'succeedIfTxOriginMatchesHardcodedAddress'), []),
                };
            }
            else {
                // Noop - no checks
                return {
                    staticTarget: ethers_1.ethers.constants.AddressZero,
                    staticExtradata: '0x',
                };
            }
        });
    },
    /**
     * Get the listing and expiration time parameters for a new order
     * @param expirationTimestamp Timestamp to expire the order (in seconds), or 0 for non-expiring
     * @param listingTimestamp Timestamp to start the order (in seconds), or undefined to start it now
     * @param waitingForBestCounterOrder Whether this order should be hidden until the best match is found
     */
    getTimeParameters({ expirationTimestamp = (0, utils_1.getMaxOrderExpirationTimestamp)(), listingTimestamp, waitingForBestCounterOrder = false, isMatchingOrder = false, }) {
        const maxExpirationDate = new Date();
        maxExpirationDate.setMonth(maxExpirationDate.getMonth() + constants_1.MAX_EXPIRATION_MONTHS);
        const maxExpirationTimeStamp = Math.round(maxExpirationDate.getTime() / 1000);
        const minListingTimestamp = Math.round(Date.now() / 1000);
        if (!isMatchingOrder && expirationTimestamp === 0) {
            throw new Error('Expiration time cannot be 0');
        }
        if (listingTimestamp && listingTimestamp < minListingTimestamp) {
            //Ignore this so we can create a listing in the past for testing
            //    throw new Error("Listing time cannot be in the past.");
        }
        if (listingTimestamp && listingTimestamp >= expirationTimestamp) {
            throw new Error('Listing time must be before the expiration time.');
        }
        if (waitingForBestCounterOrder && listingTimestamp) {
            throw new Error(`Cannot schedule an English auction for the future.`);
        }
        if (parseInt(expirationTimestamp.toString()) != expirationTimestamp) {
            throw new Error(`Expiration timestamp must be a whole number of seconds`);
        }
        if (expirationTimestamp > maxExpirationTimeStamp) {
            throw new Error('Expiration time must not exceed six months from now');
        }
        if (waitingForBestCounterOrder) {
            // The minimum expiration time has to be at least fifteen minutes from now
            const minEnglishAuctionListingTimestamp = minListingTimestamp + constants_1.MIN_EXPIRATION_MINUTES * 60;
            if (!isMatchingOrder &&
                listingTimestamp < minEnglishAuctionListingTimestamp) {
                throw new Error(`Expiration time must be at least ${constants_1.MIN_EXPIRATION_MINUTES} minutes from now`);
            }
            return {
                listingTime: exports.OpenseaHelper.makeBigNumber(expirationTimestamp),
                expirationTime: exports.OpenseaHelper.makeBigNumber(expirationTimestamp + constants_1.ORDER_MATCHING_LATENCY_SECONDS),
            };
        }
        else {
            // The minimum expiration time has to be at least fifteen minutes from now
            const minExpirationTimestamp = listingTimestamp + constants_1.MIN_EXPIRATION_MINUTES * 60;
            if (!isMatchingOrder && expirationTimestamp < minExpirationTimestamp) {
                throw new Error(`Expiration time must be at least ${constants_1.MIN_EXPIRATION_MINUTES} minutes from the listing date`);
            }
            return {
                listingTime: exports.OpenseaHelper.makeBigNumber(listingTimestamp !== null && listingTimestamp !== void 0 ? listingTimestamp : Math.round(Date.now() / 1000 - 100)),
                expirationTime: exports.OpenseaHelper.makeBigNumber(expirationTimestamp),
            };
        }
    },
    /**
     * Validate fee parameters
     * @param totalBuyerFeeBasisPoints Total buyer fees
     * @param totalSellerFeeBasisPoints Total seller fees
     */
    validateFees(totalBuyerFeeBasisPoints, totalSellerFeeBasisPoints) {
        const maxFeePercent = constants_1.INVERSE_BASIS_POINT / 100;
        if (totalBuyerFeeBasisPoints > constants_1.INVERSE_BASIS_POINT ||
            totalSellerFeeBasisPoints > constants_1.INVERSE_BASIS_POINT) {
            throw new Error(`Invalid buyer/seller fees: must be less than ${maxFeePercent}%`);
        }
        if (totalBuyerFeeBasisPoints < 0 || totalSellerFeeBasisPoints < 0) {
            throw new Error(`Invalid buyer/seller fees: must be at least 0%`);
        }
    },
    getBuyFeeParameters(totalBuyerFeeBasisPoints, totalSellerFeeBasisPoints, sellOrder) {
        exports.OpenseaHelper.validateFees(totalBuyerFeeBasisPoints, totalSellerFeeBasisPoints);
        let makerRelayerFee;
        let takerRelayerFee;
        let feeRecipient = constants_1.OPENSEA_FEE_RECIPIENT;
        if (sellOrder) {
            // Use the sell order's fees to ensure compatiblity and force the order
            // to only be acceptable by the sell order maker.
            // Swap maker/taker depending on whether it's an English auction (taker)
            // TODO add extraBountyBasisPoints when making bidder bounties
            makerRelayerFee = sellOrder.waitingForBestCounterOrder
                ? exports.OpenseaHelper.makeBigNumber(sellOrder.makerRelayerFee)
                : exports.OpenseaHelper.makeBigNumber(sellOrder.takerRelayerFee);
            takerRelayerFee = sellOrder.waitingForBestCounterOrder
                ? exports.OpenseaHelper.makeBigNumber(sellOrder.takerRelayerFee)
                : exports.OpenseaHelper.makeBigNumber(sellOrder.makerRelayerFee);
            feeRecipient = ethers_1.ethers.constants.AddressZero;
        }
        else {
            makerRelayerFee = exports.OpenseaHelper.makeBigNumber(totalBuyerFeeBasisPoints);
            takerRelayerFee = exports.OpenseaHelper.makeBigNumber(totalSellerFeeBasisPoints);
        }
        return {
            makerRelayerFee,
            takerRelayerFee,
            makerProtocolFee: exports.OpenseaHelper.makeBigNumber(0),
            takerProtocolFee: exports.OpenseaHelper.makeBigNumber(0),
            makerReferrerFee: exports.OpenseaHelper.makeBigNumber(0),
            feeRecipient,
            feeMethod: types_1.FeeMethod.SplitFee,
        };
    },
    getSellFeeParameters(totalBuyerFeeBasisPoints, totalSellerFeeBasisPoints, waitForHighestBid, sellerBountyBasisPoints = 0) {
        exports.OpenseaHelper.validateFees(totalBuyerFeeBasisPoints, totalSellerFeeBasisPoints);
        // Use buyer as the maker when it's an English auction, so Wyvern sets prices correctly
        const feeRecipient = waitForHighestBid
            ? ethers_1.ethers.constants.AddressZero
            : constants_1.OPENSEA_FEE_RECIPIENT;
        // Swap maker/taker fees when it's an English auction,
        // since these sell orders are takers not makers
        const makerRelayerFee = waitForHighestBid
            ? exports.OpenseaHelper.makeBigNumber(totalBuyerFeeBasisPoints)
            : exports.OpenseaHelper.makeBigNumber(totalSellerFeeBasisPoints);
        const takerRelayerFee = waitForHighestBid
            ? exports.OpenseaHelper.makeBigNumber(totalSellerFeeBasisPoints)
            : exports.OpenseaHelper.makeBigNumber(totalBuyerFeeBasisPoints);
        return {
            makerRelayerFee,
            takerRelayerFee,
            makerProtocolFee: exports.OpenseaHelper.makeBigNumber(0),
            takerProtocolFee: exports.OpenseaHelper.makeBigNumber(0),
            makerReferrerFee: exports.OpenseaHelper.makeBigNumber(sellerBountyBasisPoints),
            feeRecipient,
            feeMethod: types_1.FeeMethod.SplitFee,
        };
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
    getPriceParameters(openseaAPI, orderSide, tokenAddress, expirationTime, startAmount, endAmount, waitingForBestCounterOrder = false, englishAuctionReservePrice) {
        return __awaiter(this, void 0, void 0, function* () {
            const priceDiff = endAmount != null ? ethers_1.BigNumber.from(startAmount).sub(endAmount) : 0;
            const paymentToken = tokenAddress.toLowerCase();
            const isEther = tokenAddress == ethers_1.ethers.constants.AddressZero;
            const { tokens } = yield exports.OpenseaHelper.getPaymentTokensFromApi(openseaAPI, paymentToken);
            const token = tokens[0];
            // Validation
            if (startAmount == null || ethers_1.BigNumber.from(startAmount).lt(0)) {
                throw new Error(`Starting price must be a number >= 0`);
            }
            if (!isEther && !token) {
                throw new Error(`No ERC-20 token found for '${paymentToken}'`);
            }
            if (isEther && waitingForBestCounterOrder) {
                throw new Error(`English auctions must use wrapped ETH or an ERC-20 token.`);
            }
            if (isEther && orderSide === types_1.OrderSide.Buy) {
                // throw new Error(`Offers must use wrapped ETH or an ERC-20 token.`)
            }
            if (priceDiff < 0) {
                throw new Error('End price must be less than or equal to the start price.');
            }
            if (priceDiff > 0 && expirationTime == 0) {
                throw new Error('Expiration time must be set if order will change in price.');
            }
            if (englishAuctionReservePrice && !waitingForBestCounterOrder) {
                throw new Error('Reserve prices may only be set on English auctions.');
            }
            if (englishAuctionReservePrice &&
                startAmount.gt(englishAuctionReservePrice)
            /// englishAuctionReservePrice < startAmount
            ) {
                throw new Error('Reserve price must be greater than or equal to the start amount.');
            }
            // Note: WyvernProtocol.toBaseUnitAmount(makeBigNumber(startAmount), token.decimals)
            // will fail if too many decimal places, so special-case ether
            const basePrice = isEther
                ? ethers_1.ethers.utils.parseUnits(startAmount.toString(), 'ether')
                : exports.OpenseaHelper.toBaseUnitAmount(ethers_1.BigNumber.from(startAmount), token.decimals);
            const extra = isEther
                ? ethers_1.ethers.utils.parseUnits(priceDiff.toString(), 'ether')
                : exports.OpenseaHelper.toBaseUnitAmount(ethers_1.BigNumber.from(priceDiff), token.decimals);
            const reservePrice = englishAuctionReservePrice
                ? isEther
                    ? ethers_1.ethers.utils.parseUnits(englishAuctionReservePrice.toString(), 'ether')
                    : exports.OpenseaHelper.toBaseUnitAmount(ethers_1.BigNumber.from(englishAuctionReservePrice), token.decimals)
                : undefined;
            return { basePrice, extra, paymentToken, reservePrice };
        });
    },
    /**
     * Get current transfer fees for an asset
     * @param web3 Web3 instance
     * @param asset The asset to check for transfer fees
     */
    getTransferFeeSettings() {
        let transferFee;
        let transferFeeTokenAddress;
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
        return { transferFee, transferFeeTokenAddress };
    },
    /**
     * Compute the fees for an order
     * @param param0 __namedParameters
     * @param asset Asset to use for fees. May be blank ONLY for multi-collection bundles.
     * @param side The side of the order (buy or sell)
     * @param accountAddress The account to check fees for (useful if fees differ by account, like transfer fees)
     * @param extraBountyBasisPoints The basis points to add for the bounty. Will throw if it exceeds the assets' contract's OpenSea fee.
     */
    computeFees({ asset, side, accountAddress, extraBountyBasisPoints = 0, }) {
        var _a;
        return __awaiter(this, void 0, void 0, function* () {
            let openseaBuyerFeeBasisPoints = constants_1.DEFAULT_BUYER_FEE_BASIS_POINTS;
            let openseaSellerFeeBasisPoints = constants_1.DEFAULT_SELLER_FEE_BASIS_POINTS;
            let devBuyerFeeBasisPoints = 0;
            let devSellerFeeBasisPoints = 0;
            let transferFee = exports.OpenseaHelper.makeBigNumber(0);
            let transferFeeTokenAddress = null;
            let maxTotalBountyBPS = constants_1.DEFAULT_MAX_BOUNTY;
            if (asset) {
                openseaBuyerFeeBasisPoints = +asset.collection.openseaBuyerFeeBasisPoints;
                openseaSellerFeeBasisPoints =
                    +asset.collection.openseaSellerFeeBasisPoints;
                devBuyerFeeBasisPoints = +asset.collection.devBuyerFeeBasisPoints;
                devSellerFeeBasisPoints = +asset.collection.devSellerFeeBasisPoints;
                maxTotalBountyBPS = openseaSellerFeeBasisPoints;
            }
            // Compute transferFrom fees
            if (side == types_1.OrderSide.Sell && asset) {
                // Server-side knowledge
                transferFee = asset.transferFee
                    ? exports.OpenseaHelper.makeBigNumber(asset.transferFee.toString())
                    : transferFee;
                transferFeeTokenAddress = asset.transferFeePaymentToken
                    ? asset.transferFeePaymentToken.address
                    : transferFeeTokenAddress;
                try {
                    // no transfer fees typically
                    // web3 call to update it
                    const result = exports.OpenseaHelper.getTransferFeeSettings();
                    transferFee =
                        result.transferFee != null ? result.transferFee : transferFee;
                    transferFeeTokenAddress =
                        (_a = result.transferFeeTokenAddress) !== null && _a !== void 0 ? _a : transferFeeTokenAddress;
                }
                catch (error) {
                    // Use server defaults
                    console.error(error);
                }
            }
            // Compute bounty
            const sellerBountyBasisPoints = side == types_1.OrderSide.Sell ? extraBountyBasisPoints : 0;
            // Check that bounty is in range of the opensea fee
            const bountyTooLarge = sellerBountyBasisPoints + constants_1.OPENSEA_SELLER_BOUNTY_BASIS_POINTS >
                maxTotalBountyBPS;
            if (sellerBountyBasisPoints > 0 && bountyTooLarge) {
                let errorMessage = `Total bounty exceeds the maximum for this asset type (${maxTotalBountyBPS / 100}%).`;
                if (maxTotalBountyBPS >= constants_1.OPENSEA_SELLER_BOUNTY_BASIS_POINTS) {
                    errorMessage += ` Remember that OpenSea will add ${constants_1.OPENSEA_SELLER_BOUNTY_BASIS_POINTS / 100}% for referrers with OpenSea accounts!`;
                }
                throw new Error(errorMessage);
            }
            return {
                totalBuyerFeeBasisPoints: openseaBuyerFeeBasisPoints + devBuyerFeeBasisPoints,
                totalSellerFeeBasisPoints: openseaSellerFeeBasisPoints + devSellerFeeBasisPoints,
                openseaBuyerFeeBasisPoints,
                openseaSellerFeeBasisPoints,
                devBuyerFeeBasisPoints,
                devSellerFeeBasisPoints,
                sellerBountyBasisPoints,
                transferFee,
                transferFeeTokenAddress,
            };
        });
    },
    /**
     * Get the non-prefixed hash for the order
     * (Fixes a Wyvern typescript issue and casing issue)
     * @param order order to hash
     */
    getOrderHash(order) {
        const orderWithStringTypes = Object.assign(Object.assign({}, order), { maker: order.maker.toLowerCase(), taker: order.taker.toLowerCase(), feeRecipient: order.feeRecipient.toLowerCase(), side: order.side.toString(), saleKind: order.saleKind.toString(), howToCall: order.howToCall.toString(), feeMethod: order.feeMethod.toString() });
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return utils_1.WyvernProtocol.getOrderHashHex(orderWithStringTypes);
    },
    _dispatch(event, data) {
        //_emitter.emit(event, data);
        console.log('emit', event, data);
    },
    /**
     * Generate the signature for authorizing an order
     * @param order Unsigned wyvern order
     * @returns order signature in the form of v, r, s, also an optional nonce
     */
    authorizeOrder(wallet, order, txProvider, wyvernNonce) {
        return __awaiter(this, void 0, void 0, function* () {
            const signerAddress = order.maker;
            const walletAddress = yield wallet.getAddress();
            if (order.maker != walletAddress) {
                throw new Error(`WARN MISMATCH: ',${order.maker}, ${walletAddress}`);
            }
            const txNetwork = yield txProvider.getNetwork();
            const chainId = txNetwork.chainId;
            this._dispatch(types_1.EventType.CreateOrder, {
                order,
                accountAddress: order.maker,
            });
            try {
                // 2.3 Sign order flow using EIP-712
                /* const signerOrderNonce = await txProvider.getTransactionCount(
                  signerAddress
                )*/
                const signerOrderNonce = wyvernNonce;
                // We need to manually specify each field because OS orders can contain unrelated data
                const orderForSigning = {
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
                };
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
                        name: constants_1.EIP_712_WYVERN_DOMAIN_NAME,
                        version: constants_1.EIP_712_WYVERN_DOMAIN_VERSION,
                        chainId,
                        verifyingContract: order.exchange,
                    },
                    message: Object.assign(Object.assign({}, orderForSigning), { nonce: signerOrderNonce }),
                };
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
                const ecSignature = yield exports.OpenseaHelper.signTypedDataWithWallet(wallet, typedData);
                return Object.assign(Object.assign({}, ecSignature), { nonce: signerOrderNonce });
            }
            catch (error) {
                this._dispatch(types_1.EventType.OrderDenied, {
                    order,
                    accountAddress: signerAddress,
                });
                throw error;
            }
        });
    },
    signTypedDataWithWallet(wallet, typedData) {
        return __awaiter(this, void 0, void 0, function* () {
            const signature = yield wallet._signTypedData(typedData.domain, typedData.types, typedData.message);
            return exports.OpenseaHelper.parseSignatureHex(signature);
        });
    },
    /**
     * Sign messages using web3 signTypedData signatures
     * @param web3 Web3 instance
     * @param message message to sign
     * @param signerAddress web3 address signing the message
     * @returns A signature if provider can sign, otherwise null
     */
    signTypedDataAsync(provider, message, signerAddress) {
        return __awaiter(this, void 0, void 0, function* () {
            // Using sign typed data V4 works with a stringified message, used by browser providers i.e. Metamask
            const signature = yield exports.OpenseaHelper.promisify((c) => provider.sendAsync({
                method: 'eth_signTypedData_v4',
                params: [signerAddress, JSON.stringify(message)],
                from: signerAddress,
                id: new Date().getTime(),
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
            }, c));
            return exports.OpenseaHelper.parseSignatureHex(signature === null || signature === void 0 ? void 0 : signature.result);
        });
    },
    /**
     * Promisify a callback-syntax web3 function
     * @param inner callback function that accepts a Web3 callback function and passes
     * it to the Web3 function
     */
    promisify(inner) {
        return __awaiter(this, void 0, void 0, function* () {
            return yield new Promise((resolve, reject) => inner((err, res) => {
                if (err) {
                    reject(err);
                }
                resolve(res);
            }));
        });
    },
    // sourced from 0x.js:
    // https://github.com/ProjectWyvern/wyvern-js/blob/39999cb93ce5d80ea90b4382182d1bd4339a9c6c/src/utils/signature_utils.ts
    parseSignatureHex(signature) {
        // HACK: There is no consensus on whether the signatureHex string should be formatted as
        // v + r + s OR r + s + v, and different clients (even different versions of the same client)
        // return the signature params in different orders. In order to support all client implementations,
        // we parse the signature in both ways, and evaluate if either one is a valid signature.
        const validVParamValues = [27, 28];
        const ecSignatureRSV = _parseSignatureHexAsRSV(signature);
        if (_.includes(validVParamValues, ecSignatureRSV.v)) {
            return ecSignatureRSV;
        }
        // For older clients
        const ecSignatureVRS = _parseSignatureHexAsVRS(signature);
        if (_.includes(validVParamValues, ecSignatureVRS.v)) {
            return ecSignatureVRS;
        }
        throw new Error('Invalid signature');
        function _parseSignatureHexAsVRS(signatureHex) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const signatureBuffer = ethUtil.toBuffer(signatureHex);
            let v = signatureBuffer[0];
            if (v < 27) {
                v += 27;
            }
            const r = signatureBuffer.slice(1, 33);
            const s = signatureBuffer.slice(33, 65);
            const ecSignature = {
                v,
                r: ethUtil.bufferToHex(r),
                s: ethUtil.bufferToHex(s),
            };
            return ecSignature;
        }
        function _parseSignatureHexAsRSV(signatureHex) {
            const { v, r, s } = ethUtil.fromRpcSig(signatureHex);
            const ecSignature = {
                v,
                r: ethUtil.bufferToHex(r),
                s: ethUtil.bufferToHex(s),
            };
            return ecSignature;
        }
    },
    makeSimpleBuyOrder({ exchangeAddress, openSeaAPI, asset, quantity = 1, accountAddress, startAmount, paymentTokenAddress, extraBountyBasisPoints = 0, sellOrder, referrerAddress, networkName, }) {
        var _a;
        return __awaiter(this, void 0, void 0, function* () {
            //accountAddress = validateAndFormatWalletAddress(this.web3, accountAddress);
            const schema = this._getSchema(networkName, this._getSchemaName(asset));
            const quantityBN = exports.OpenseaHelper.toBaseUnitAmount(exports.OpenseaHelper.makeBigNumber(quantity), (_a = asset.decimals) !== null && _a !== void 0 ? _a : 0);
            const wyAsset = exports.OpenseaHelper.getWyvernAsset(schema, asset, quantityBN);
            const openSeaAsset = yield exports.OpenseaHelper.getAssetFromAPI(openSeaAPI, asset); // this.api.getAsset(asset);
            const minListingTimestamp = Math.round(Date.now() / 1000);
            const listingTime = minListingTimestamp - 300; // + moment.duration(1,'day').asSeconds()
            const expirationTime = listingTime + moment_1.default.duration(2, 'days').asSeconds(); //getMaxOrderExpirationTimestamp()
            const taker = sellOrder ? sellOrder.maker : ethers_1.ethers.constants.AddressZero;
            const { totalBuyerFeeBasisPoints, totalSellerFeeBasisPoints } = yield this.computeFees({
                asset: openSeaAsset,
                extraBountyBasisPoints,
                side: types_1.OrderSide.Buy,
            });
            const { makerRelayerFee, takerRelayerFee, makerProtocolFee, takerProtocolFee, makerReferrerFee, feeRecipient, feeMethod, } = exports.OpenseaHelper.getBuyFeeParameters(totalBuyerFeeBasisPoints, totalSellerFeeBasisPoints, sellOrder);
            const { target, calldata, replacementPattern } = (0, schema_1.encodeBuy)(schema, wyAsset, accountAddress, undefined);
            const { basePrice, extra, paymentToken } = yield exports.OpenseaHelper.getPriceParameters(openSeaAPI, types_1.OrderSide.Buy, paymentTokenAddress, expirationTime, ethers_1.BigNumber.from(startAmount));
            const times = exports.OpenseaHelper.getTimeParameters({
                expirationTimestamp: expirationTime,
                listingTimestamp: listingTime,
            });
            const network = networkName == 'main' ? types_1.Network.Main : types_1.Network.Rinkeby;
            const { staticTarget, staticExtradata } = yield exports.OpenseaHelper.getStaticCallTargetAndExtraData({
                asset: openSeaAsset,
                useTxnOriginStaticCall: false,
                network,
            });
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
                side: types_1.OrderSide.Buy,
                saleKind: types_1.SaleKind.FixedPrice,
                target,
                howToCall: target === exports.OpenseaHelper.getMerkleValidatorFromNetwork(networkName) //merkleValidatorByNetwork[networkName]
                    ? types_1.HowToCall.DelegateCall
                    : types_1.HowToCall.Call,
                calldata,
                replacementPattern,
                staticTarget,
                staticExtradata,
                paymentToken,
                basePrice: ethers_1.BigNumber.from(basePrice),
                extra: ethers_1.BigNumber.from(extra),
                listingTime: times.listingTime,
                expirationTime: times.expirationTime,
                salt: exports.OpenseaHelper.generatePseudoRandomSalt(),
                metadata: {
                    asset: wyAsset,
                    schema: schema.name,
                    referrerAddress,
                },
            };
        });
    },
    //seaport docs https://projectopensea.github.io/opensea-js/
    makeSimpleSellOrder({ exchangeAddress, openSeaAPI, asset, quantity = 1, sellerAddress, buyerAddress = ethers_1.ethers.constants.AddressZero, paymentAmount, paymentTokenAddress, networkName = 'main', }) {
        var _a;
        return __awaiter(this, void 0, void 0, function* () {
            //accountAddress,
            const startAmount = paymentAmount;
            const endAmount = paymentAmount;
            const minListingTimestamp = Math.round(Date.now() / 1000);
            //Listing time is 5 minutes in the past so the solidity contract accepts the value as valid
            const listingTime = minListingTimestamp - 300; // + moment.duration(1,'day').asSeconds()
            const expirationTime = listingTime + moment_1.default.duration(2, 'days').asSeconds(); //getMaxOrderExpirationTimestamp()
            const waitForHighestBid = false;
            const englishAuctionReservePrice = 0;
            const extraBountyBasisPoints = 0;
            //const buyerAddress = ethers.constants.AddressZero
            const network = networkName == 'main' ? types_1.Network.Main : types_1.Network.Rinkeby;
            const schema = this._getSchema(networkName, this._getSchemaName(asset));
            const quantityBN = exports.OpenseaHelper.toBaseUnitAmount(exports.OpenseaHelper.makeBigNumber(quantity), (_a = asset.decimals) !== null && _a !== void 0 ? _a : 0);
            const wyAsset = exports.OpenseaHelper.getWyvernAsset(schema, asset, quantityBN);
            const openSeaAsset = yield exports.OpenseaHelper.getAssetFromAPI(openSeaAPI, asset); // this.api.getAsset(asset);
            const { totalSellerFeeBasisPoints, totalBuyerFeeBasisPoints, sellerBountyBasisPoints, } = yield exports.OpenseaHelper.computeFees({
                asset: openSeaAsset,
                side: types_1.OrderSide.Sell,
                extraBountyBasisPoints,
            });
            const { target, calldata, replacementPattern } = (0, schema_1.encodeSell)(schema, wyAsset, sellerAddress, undefined //no merkle validator - only need merkle validator for batch nft transfer
            );
            const orderSaleKind = endAmount != null && endAmount !== startAmount
                ? types_1.SaleKind.DutchAuction
                : types_1.SaleKind.FixedPrice;
            const { basePrice, extra, paymentToken, reservePrice } = yield exports.OpenseaHelper.getPriceParameters(openSeaAPI, types_1.OrderSide.Sell, paymentTokenAddress, expirationTime, ethers_1.BigNumber.from(startAmount), ethers_1.BigNumber.from(endAmount), waitForHighestBid, englishAuctionReservePrice);
            const times = exports.OpenseaHelper.getTimeParameters({
                expirationTimestamp: expirationTime,
                listingTimestamp: listingTime,
                waitingForBestCounterOrder: waitForHighestBid,
            });
            const { makerRelayerFee, takerRelayerFee, makerProtocolFee, takerProtocolFee, makerReferrerFee, feeRecipient, feeMethod, } = exports.OpenseaHelper.getSellFeeParameters(totalBuyerFeeBasisPoints, totalSellerFeeBasisPoints, waitForHighestBid, sellerBountyBasisPoints);
            const { staticTarget, staticExtradata } = yield exports.OpenseaHelper.getStaticCallTargetAndExtraData({
                asset: openSeaAsset,
                useTxnOriginStaticCall: waitForHighestBid,
                network,
            });
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
                    ? exports.OpenseaHelper.makeBigNumber(reservePrice)
                    : undefined,
                feeMethod,
                feeRecipient,
                side: types_1.OrderSide.Sell,
                saleKind: orderSaleKind,
                target,
                howToCall: target === exports.OpenseaHelper.getMerkleValidatorFromNetwork(networkName)
                    ? types_1.HowToCall.DelegateCall
                    : types_1.HowToCall.Call,
                calldata,
                replacementPattern,
                staticTarget,
                staticExtradata,
                paymentToken,
                basePrice: ethers_1.BigNumber.from(basePrice),
                extra: ethers_1.BigNumber.from(extra),
                listingTime: times.listingTime,
                expirationTime: times.expirationTime,
                salt: exports.OpenseaHelper.generatePseudoRandomSalt(),
                metadata: {
                    asset: wyAsset,
                    schema: schema.name,
                },
            };
        });
    },
    hashAndAuthorizeOrder(unhashedOrder, wallet, txProvider, wyvernNonce) {
        return __awaiter(this, void 0, void 0, function* () {
            const hashedOrder = Object.assign(Object.assign({}, unhashedOrder), { hash: exports.OpenseaHelper.getOrderHash(unhashedOrder) });
            const signature = yield exports.OpenseaHelper.authorizeOrder(wallet, hashedOrder, txProvider, wyvernNonce);
            if (!signature) {
                return undefined;
            }
            const orderWithSignature = Object.assign(Object.assign({}, hashedOrder), signature);
            return orderWithSignature;
        });
    },
    simpleValidateOrder(wyvernContract, order) {
        return __awaiter(this, void 0, void 0, function* () {
            const isValid = yield wyvernContract.validateOrder_([
                order.exchange,
                order.maker,
                order.taker,
                order.feeRecipient,
                order.target,
                order.staticTarget,
                order.paymentToken,
            ], [
                order.makerRelayerFee,
                order.takerRelayerFee,
                order.makerProtocolFee,
                order.takerProtocolFee,
                order.basePrice,
                order.extra,
                order.listingTime,
                order.expirationTime,
                order.salt,
            ], order.feeMethod, order.side, order.saleKind, order.howToCall, order.calldata, order.replacementPattern, order.staticExtradata, order.v || 0, order.r || constants_1.NULL_BLOCK_HASH, order.s || constants_1.NULL_BLOCK_HASH);
            //.callAsync();
            return isValid;
        });
    },
    simpleOrdersCanMatch(exchangeContractInstance, buyOrderWithSignature, sellOrderWithSignature) {
        return __awaiter(this, void 0, void 0, function* () {
            if (sellOrderWithSignature.side != types_1.OrderSide.Sell) {
                throw new Error('Must be sell order');
            }
            if (buyOrderWithSignature.side != types_1.OrderSide.Buy) {
                throw new Error('Must be buy order');
            }
            const args = exports.OpenseaHelper.buildWyvernAtomicMatchParamsFromOrders(buyOrderWithSignature, sellOrderWithSignature);
            const result = yield exchangeContractInstance.ordersCanMatch_(args[0], args[1], args[2], args[3], args[4], args[5], args[6], args[7], args[8]);
            return result;
        });
    },
    buildWyvernAtomicMatchParamFromOrder(orderWithSignature) {
        const metadata = undefined;
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
            orderWithSignature.v || 0,
            orderWithSignature.r || constants_1.NULL_BLOCK_HASH,
            orderWithSignature.s || constants_1.NULL_BLOCK_HASH,
        ];
        return args;
    },
    buildWyvernAtomicMatchParamsFromOrders(buyOrderWithSignature, sellOrderWithSignature) {
        const metadata = undefined;
        const args = [
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
                buyOrderWithSignature.r || constants_1.NULL_BLOCK_HASH,
                buyOrderWithSignature.s || constants_1.NULL_BLOCK_HASH,
                sellOrderWithSignature.r || constants_1.NULL_BLOCK_HASH,
                sellOrderWithSignature.s || constants_1.NULL_BLOCK_HASH,
                metadata !== null && metadata !== void 0 ? metadata : constants_1.NULL_BLOCK_HASH,
            ],
        ];
        return args;
    },
    simpleAtomicMatch(exchangeContractInstance, buyer, sellOrderWithSignature, buyOrderWithSignature) {
        return __awaiter(this, void 0, void 0, function* () {
            const args = exports.OpenseaHelper.buildWyvernAtomicMatchParamsFromOrders(buyOrderWithSignature, sellOrderWithSignature);
            const result = yield exchangeContractInstance
                .connect(buyer)
                .atomicMatch_(args[0], args[1], args[2], args[3], args[4], args[5], args[6], args[7], args[8], args[9], args[10]);
            return result;
        });
    },
};
//# sourceMappingURL=opensea-helper.js.map