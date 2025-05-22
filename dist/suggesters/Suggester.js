"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Suggester = exports.GeoCodingTypeError = exports.MethodNotImplemented = void 0;
const types_1 = require("../types");
const defaults = {
    afterAbort: (_suggesterName) => { },
    afterRetry: (_suggesterName) => { },
    afterServerRequest: (_suggesterName) => { },
    afterServerResponse: (_suggesterName) => { },
    ignorarTextoSobrante: false,
    debug: false,
    serverTimeout: 15000,
    maxRetries: 5,
    maxSuggestions: 10,
    searchOptions: undefined,
    inputPause: 200,
    minTextLength: 3
};
const suggestionsPromises = new Map();
class MethodNotImplemented extends Error {
    constructor() {
        super('Suggester: Method Not Implemented.');
        this.name = 'MethodNotImplemented';
    }
}
exports.MethodNotImplemented = MethodNotImplemented;
class GeoCodingTypeError extends Error {
    constructor() {
        super('Suggester: Wrong object type for geocoding.');
        this.name = 'GeoCodingTypeError';
    }
}
exports.GeoCodingTypeError = GeoCodingTypeError;
class Suggester {
    constructor(name, options = {}) {
        this.name = name;
        this.options = { ...defaults, ...options };
        this.status = types_1.SuggesterStatus.DONE;
        this.inputTimer = undefined;
        this.suggestionsPromises = suggestionsPromises;
    }
    /**
     * Retorna un array de promises del suggestion recibido como parámetro
     * @param suggestion uno de los objetos retornado por getSuggestions
     */
    static getSuggestionPromises(suggestion) {
        return suggestionsPromises.get(suggestion) || [];
    }
    /**
     * Agrega una promesa a las sugerencias
     * @param suggestion La sugerencia a la que se le agrega la promesa
     * @param promise La promesa a agregar
     */
    addSuggestionPromise(suggestion, promise) {
        var _a;
        if (!this.suggestionsPromises.has(suggestion)) {
            this.suggestionsPromises.set(suggestion, [promise]);
        }
        else {
            (_a = this.suggestionsPromises.get(suggestion)) === null || _a === void 0 ? void 0 : _a.push(promise);
        }
    }
    /**
     * Actualiza la configuración del componente a partir de un objeto con overrides para las
     * opciones disponibles
     * @param options Objeto conteniendo overrides para las opciones disponibles
     */
    setOptions(options) {
        this.options = { ...this.options, ...options };
    }
    /**
     * Devuelve las opciones actualmente vigentes para el componente.
     * @returns Objeto conteniendo las opciones actualmente vigentes para el componente.
     */
    getOptions() {
        return this.options;
    }
}
exports.Suggester = Suggester;
