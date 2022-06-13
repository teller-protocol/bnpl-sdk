"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.matchOrder = void 0;
const ethers_1 = require("ethers");
const opensea_helper_1 = require("../lib/opensea-helper");
require('dotenv').config();
let contractsConfig = require('../data/contractsConfig.json')['rinkeby'];
const wyvernConfig = {
    address: contractsConfig.wyvern.address,
    abi: require('../abi/ExchangeCore.json')
};
const bnplConfig = {
    address: contractsConfig.BNPLContract.address,
    abi: require('../abi/BNPLMarket.json')
};
function matchOrder() {
    return __awaiter(this, void 0, void 0, function* () {
        let callData = require('../data/output.json');
        let rpcURI = process.env.RINKEBY_RPC_URL;
        let privateKey = process.env.WALLET_PRIVATE_KEY;
        let rpcProvider = new ethers_1.providers.JsonRpcProvider(rpcURI);
        let bnplContractInstance = new ethers_1.Contract(bnplConfig.address, bnplConfig.abi, rpcProvider);
        let wyvernContractInstance = new ethers_1.Contract(wyvernConfig.address, wyvernConfig.abi, rpcProvider);
        let wallet = new ethers_1.Wallet(privateKey).connect(rpcProvider);
        let value = '100000000000000000'; //callData.valueWei
        console.log('callData.atomicMatchInputs', JSON.stringify(callData.atomicMatchInputs));
        /*
        
        struct AtomicMatchInputs {
            address[14] addrs;
            uint256[18] uints;
            uint8[8] feeMethodsSidesKindsHowToCalls;
            bytes calldataBuy;
            bytes calldataSell;
            bytes replacementPatternBuy;
            bytes replacementPatternSell;
            uint8[2] vs;
            bytes32[5] rssMetadata;
        }
        */
        let lenderAddress = callData.lenderAddress;
        let borrowerAddress = wallet.address;
        //this address needs to approve the forwarder on tellerv2
        lenderAddress = "0xF4dAb24C52b51cB69Ab62cDE672D3c9Df0B39681";
        //Set price to 1 Gwei
        let gasPrice = ethers_1.utils.hexlify(8000000000);
        //Set max gas limit to 4M
        var gasLimit = ethers_1.utils.hexlify(25000000);
        let sellOrderParams = opensea_helper_1.OpenseaHelper.buildWyvernAtomicMatchParamFromOrder(callData.sellOrder);
        let validateSell = yield wyvernContractInstance.validateOrder_(sellOrderParams[0], sellOrderParams[1], sellOrderParams[2], sellOrderParams[3], sellOrderParams[4], sellOrderParams[5], sellOrderParams[6], sellOrderParams[7], sellOrderParams[8], sellOrderParams[9], sellOrderParams[10], sellOrderParams[11]);
        let sellOrderHash = yield wyvernContractInstance.hashOrder_(sellOrderParams[0], sellOrderParams[1], sellOrderParams[2], sellOrderParams[3], sellOrderParams[4], sellOrderParams[5], sellOrderParams[6], sellOrderParams[7], sellOrderParams[8]);
        let sellOrderHashToSign = yield wyvernContractInstance.hashToSign_(sellOrderParams[0], sellOrderParams[1], sellOrderParams[2], sellOrderParams[3], sellOrderParams[4], sellOrderParams[5], sellOrderParams[6], sellOrderParams[7], sellOrderParams[8]);
        //0x90fbbb5556cf59aabad2cecbed8d7f829eeebfc7be93f8b6117c235e769be03b
        ///this should equal order hash right ? 
        let buyOrderParams = opensea_helper_1.OpenseaHelper.buildWyvernAtomicMatchParamFromOrder(callData.buyOrder);
        let validateBuy = yield wyvernContractInstance.validateOrderParameters_(buyOrderParams[0], buyOrderParams[1], buyOrderParams[2], buyOrderParams[3], buyOrderParams[4], buyOrderParams[5], buyOrderParams[6], buyOrderParams[7], buyOrderParams[8]);
        let canMatch = yield wyvernContractInstance.ordersCanMatch_(callData.atomicMatchInputs[0], callData.atomicMatchInputs[1], callData.atomicMatchInputs[2], callData.atomicMatchInputs[3], callData.atomicMatchInputs[4], callData.atomicMatchInputs[5], callData.atomicMatchInputs[6], callData.atomicMatchInputs[7], callData.atomicMatchInputs[8]);
        let matchPrice = yield wyvernContractInstance.calculateMatchPrice_(callData.atomicMatchInputs[0], callData.atomicMatchInputs[1], callData.atomicMatchInputs[2], callData.atomicMatchInputs[3], callData.atomicMatchInputs[4], callData.atomicMatchInputs[5], callData.atomicMatchInputs[6], callData.atomicMatchInputs[7], callData.atomicMatchInputs[8]);
        /*
           let unsignedTx = await wyvernContractInstance
           .populateTransaction
           .atomicMatch_(
             callData.atomicMatchInputs[0],
             callData.atomicMatchInputs[1],
             callData.atomicMatchInputs[2],
             callData.atomicMatchInputs[3],//calldata buy
             callData.atomicMatchInputs[4],//calldata sell
             callData.atomicMatchInputs[5],
             callData.atomicMatchInputs[6],
             callData.atomicMatchInputs[7],
             callData.atomicMatchInputs[8],
             callData.atomicMatchInputs[9],
             callData.atomicMatchInputs[10],
             {value, gasLimit, gasPrice} )
             */
        const atomicMatchInputs = {
            addrs: callData.atomicMatchInputs[0],
            uints: callData.atomicMatchInputs[1],
            feeMethodsSidesKindsHowToCalls: callData.atomicMatchInputs[2],
            calldataBuy: callData.atomicMatchInputs[3],
            calldataSell: callData.atomicMatchInputs[4],
            replacementPatternBuy: callData.atomicMatchInputs[5],
            replacementPatternSell: callData.atomicMatchInputs[6],
            //args 7 and 8 must be null for this to work -- they typically are
            vs: callData.atomicMatchInputs[9],
            rssMetadata: callData.atomicMatchInputs[10],
        };
        // let exchangeAddress = await bnplContractInstance.exchange()
        let unsignedTx = yield bnplContractInstance
            .populateTransaction
            .atomicMatchThrough_(atomicMatchInputs, value, { value, gasLimit, gasPrice });
        let response = yield wallet.sendTransaction(unsignedTx);
        console.log('response', response);
        //erc20 low level call failed (weth approval )->sending weth from lender 
        return true;
    });
}
exports.matchOrder = matchOrder;
//# sourceMappingURL=matchOrder.js.map