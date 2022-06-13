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
const callExecute_1 = require("./callExecute");
const generateExecuteInputs_1 = require("./generateExecuteInputs");
const matchOrder_1 = require("./matchOrder");
const taskMap = {
    generateExecuteInputs: generateExecuteInputs_1.generateExecuteInputs,
    callExecute: callExecute_1.callExecute,
    matchOrder: matchOrder_1.matchOrder
};
function init() {
    return __awaiter(this, void 0, void 0, function* () {
        const args = process.argv.slice(2);
        yield runTask(args);
    });
}
function runTask(args) {
    return __awaiter(this, void 0, void 0, function* () {
        const taskName = args[0];
        const taskMethod = taskMap[taskName];
        if (typeof taskMethod == 'undefined')
            throw new Error('unknown task');
        yield taskMethod();
        console.log(`Task '${taskName}' complete.`);
    });
}
// eslint-disable-next-line @typescript-eslint/no-floating-promises
init();
//# sourceMappingURL=index.js.map