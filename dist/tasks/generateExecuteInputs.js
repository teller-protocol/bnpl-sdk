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
exports.generateExecuteInputs = void 0;
function generateExecuteInputs() {
    return __awaiter(this, void 0, void 0, function* () {
        let inputData = require('../data/inputOrder.json');
        inputData.lenderAddress = "0xF4dAb24C52b51cB69Ab62cDE672D3c9Df0B39681";
        let outputData = buildExecuteParams(inputData);
        try {
            fs.writeFileSync('data/output.json', JSON.stringify(outputData));
        }
        catch (err) {
            console.error(err);
        }
        console.log('output ', outputData);
        return true;
    });
}
exports.generateExecuteInputs = generateExecuteInputs;
//# sourceMappingURL=generateExecuteInputs.js.map