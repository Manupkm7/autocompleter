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
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SuggesterClass = void 0;
__exportStar(require("./types"), exports);
__exportStar(require("./Autocompleter"), exports);
__exportStar(require("./config"), exports);
__exportStar(require("./constants"), exports);
var suggesters_1 = require("./suggesters");
Object.defineProperty(exports, "SuggesterClass", { enumerable: true, get: function () { return suggesters_1.Suggester; } });
__exportStar(require("./suggesters/SuggesterDemo"), exports);
__exportStar(require("./suggesters/SuggesterCatastro"), exports);
