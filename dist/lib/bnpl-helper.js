"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildExecuteParams = void 0;
const opensea_helper_1 = require("./opensea-helper");
const ethers_1 = require("ethers");
const moment_1 = __importDefault(require("moment"));
const constants_1 = require("opensea-js/lib/constants");
const opensea_helper_2 = require("../lib/opensea-helper");
const OrderSide = {
    Buy: 0,
    Sell: 1
};
let contractsConfig = require('../data/contractsConfig.json')['rinkeby'];
require('dotenv').config();
const MerkleValidatorABI = require('../abi/MerkleValidator.json');
function buildExecuteParams(inputData) {
    let bidSubmitArgs = {
        lendingToken: "0xc778417e063141139fce010982780140aa0cd5ab",
        principal: inputData.tellerInputs.loanRequired,
        duration: inputData.tellerInputs.duration,
        APR: inputData.tellerInputs.interestRate,
        metadataURI: "ipfs://"
    };
    let lenderAddress = inputData.tellerInputs.lenderAddress; // "0xF4dAb24C52b51cB69Ab62cDE672D3c9Df0B39681"
    //deployed on rinkeby 
    let bnplContractAddress = contractsConfig.BNPLContract.address;
    let openSeaData = inputData.openSeaResponse;
    //this comes from the opensea API 
    let sellOrderWithSignature = {
        feeMethod: (0, opensea_helper_1.parseFeeMethod)(openSeaData.feeMethod),
        side: OrderSide.Sell,
        saleKind: (0, opensea_helper_1.parseSaleKind)(openSeaData.saleKind),
        howToCall: (0, opensea_helper_1.parseHowToCall)(openSeaData.howToCall),
        quantity: opensea_helper_2.OpenseaHelper.makeBigNumber(openSeaData.quantity),
        makerReferrerFee: opensea_helper_2.OpenseaHelper.makeBigNumber(openSeaData.makerReferrerFee),
        waitingForBestCounterOrder: openSeaData.waitingForBestCounterOrder,
        metadata: (0, opensea_helper_1.parseMetadata)(openSeaData.metadata),
        exchange: openSeaData.exchange,
        maker: openSeaData.maker,
        taker: openSeaData.taker,
        makerRelayerFee: opensea_helper_2.OpenseaHelper.makeBigNumber(openSeaData.makerRelayerFee),
        takerRelayerFee: opensea_helper_2.OpenseaHelper.makeBigNumber(openSeaData.takerRelayerFee),
        makerProtocolFee: opensea_helper_2.OpenseaHelper.makeBigNumber(openSeaData.makerProtocolFee),
        takerProtocolFee: opensea_helper_2.OpenseaHelper.makeBigNumber(openSeaData.takerProtocolFee),
        feeRecipient: openSeaData.feeRecipient,
        target: openSeaData.target,
        calldata: openSeaData.calldata,
        replacementPattern: openSeaData.replacementPattern,
        staticTarget: openSeaData.staticTarget,
        staticExtradata: openSeaData.staticExtradata,
        paymentToken: openSeaData.paymentToken,
        basePrice: opensea_helper_2.OpenseaHelper.makeBigNumber(openSeaData.basePrice),
        extra: opensea_helper_2.OpenseaHelper.makeBigNumber(openSeaData.extra),
        listingTime: opensea_helper_2.OpenseaHelper.makeBigNumber(openSeaData.listingTime),
        expirationTime: opensea_helper_2.OpenseaHelper.makeBigNumber(openSeaData.expirationTime),
        salt: opensea_helper_2.OpenseaHelper.makeBigNumber(openSeaData.salt),
        hash: openSeaData.orderHash,
        v: openSeaData.v,
        r: openSeaData.r,
        s: openSeaData.s
    };
    const minListingTimestamp = Math.round(Date.now() / 1000);
    const listingTime = minListingTimestamp - 300; // + moment.duration(1,'day').asSeconds()
    const expirationTime = listingTime + moment_1.default.duration(2, 'days').asSeconds(); //getMaxOrderExpirationTimestamp()
    let privateKey = process.env.WALLET_PRIVATE_KEY;
    // let wallet = new Wallet(privateKey) 
    const iface = new ethers_1.ethers.utils.Interface(MerkleValidatorABI);
    /*
    matchERC721UsingCriteria(
          address from,
          address to,
          IERC721 token,
          uint256 tokenId,
          bytes32 root,
          bytes32[] calldata proof*/
    //0xfb16a595000000000000000000000000b11ca87e32075817c82cc471994943a4290f4a140000000000000000000000000000000000000000000000000000000000000000000000000000000000000000388f486dbcbe05029ba7adf784459b580b4270320000000000000000000000000000000000000000000000000000000000000012000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000c00000000000000000000000000000000000000000000000000000000000000000
    let decodedCalldata = iface.decodeFunctionData("matchERC721UsingCriteria", openSeaData.calldata);
    // Prepare encoded data to be used in a function call
    console.log('decodedCalldata', decodedCalldata);
    //we should do this in our contract 
    let buyerDecodedCalldata = Object.assign([], decodedCalldata);
    buyerDecodedCalldata[1] = bnplContractAddress;
    let modifiedBuyCallData = iface.encodeFunctionData("matchERC721UsingCriteria", buyerDecodedCalldata);
    let customBuyReplacementPattern = "0x00000000ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000";
    //we build this ourselves and dont need to sign it 
    let newBuyOrder = {
        feeMethod: (0, opensea_helper_1.parseFeeMethod)(openSeaData.feeMethod),
        side: OrderSide.Buy,
        saleKind: (0, opensea_helper_1.parseSaleKind)(openSeaData.saleKind),
        howToCall: (0, opensea_helper_1.parseHowToCall)(openSeaData.howToCall),
        quantity: opensea_helper_2.OpenseaHelper.makeBigNumber(openSeaData.quantity),
        makerReferrerFee: opensea_helper_2.OpenseaHelper.makeBigNumber(openSeaData.makerReferrerFee),
        waitingForBestCounterOrder: openSeaData.waitingForBestCounterOrder,
        metadata: (0, opensea_helper_1.parseMetadata)(openSeaData.metadata),
        exchange: openSeaData.exchange,
        maker: bnplContractAddress,
        taker: openSeaData.maker,
        makerRelayerFee: opensea_helper_2.OpenseaHelper.makeBigNumber(openSeaData.takerRelayerFee),
        takerRelayerFee: opensea_helper_2.OpenseaHelper.makeBigNumber(openSeaData.makerRelayerFee),
        makerProtocolFee: opensea_helper_2.OpenseaHelper.makeBigNumber(0),
        takerProtocolFee: opensea_helper_2.OpenseaHelper.makeBigNumber(0),
        feeRecipient: ethers_1.ethers.constants.AddressZero,
        target: openSeaData.target,
        calldata: modifiedBuyCallData,
        replacementPattern: customBuyReplacementPattern,
        staticTarget: openSeaData.staticTarget,
        staticExtradata: openSeaData.staticExtradata,
        paymentToken: openSeaData.paymentToken,
        basePrice: opensea_helper_2.OpenseaHelper.makeBigNumber(openSeaData.basePrice),
        extra: opensea_helper_2.OpenseaHelper.makeBigNumber(openSeaData.extra),
        listingTime: opensea_helper_2.OpenseaHelper.makeBigNumber(openSeaData.listingTime),
        expirationTime: opensea_helper_2.OpenseaHelper.makeBigNumber(expirationTime),
        salt: opensea_helper_2.OpenseaHelper.generatePseudoRandomSalt()
    };
    let buyOrderWithSignature = Object.assign(newBuyOrder, {
        hash: "",
        v: 0,
        r: constants_1.NULL_BLOCK_HASH,
        s: constants_1.NULL_BLOCK_HASH
    });
    let atomicMatchInputs = opensea_helper_2.OpenseaHelper.buildWyvernAtomicMatchParamsFromOrders(buyOrderWithSignature, sellOrderWithSignature);
    let outputData = {
        bidSubmitArgs,
        lenderAddress,
        atomicMatchInputs,
        valueWei: inputData.tellerInputs.downPayment,
        buyOrder: newBuyOrder,
        sellOrder: sellOrderWithSignature
    };
    return outputData;
}
exports.buildExecuteParams = buildExecuteParams;
//# sourceMappingURL=bnpl-helper.js.map