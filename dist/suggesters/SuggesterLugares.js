"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SuggesterLugares = void 0;
/* eslint-disable @typescript-eslint/no-base-to-string */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/ban-ts-comment */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
const Suggester_1 = require("./Suggester");
const config_1 = require("../config");
const urijs_1 = __importDefault(require("urijs"));
const defaults = {
    debug: false,
    serverTimeout: 30000,
    maxRetries: 1,
    maxSuggestions: 10,
    server: 'https://epok.buenosaires.gob.ar/buscar/',
    searchOptions: {
        start: 0,
        limit: 20,
        tipoBusqueda: 'ranking',
        categoria: undefined,
        clase: undefined,
        bbox: false,
        extent: undefined,
        returnRawData: false,
    },
};
class SuggesterLugares extends Suggester_1.Suggester {
    constructor(name, options = {}) {
        const mergedOptions = {
            ...defaults,
            ...options,
            searchOptions: {
                ...defaults.searchOptions,
                ...(options.searchOptions || {}),
            },
        };
        super(name, mergedOptions);
        this.lastRequest = null;
    }
    async getLatLng2(lugar) {
        var _a, _b;
        try {
            const response = await fetch(`${config_1.places_webservice_url}/?&id=${encodeURIComponent(lugar.id)}&geocodificar=true&srid=4326`, {
                signal: (_a = this.lastRequest) === null || _a === void 0 ? void 0 : _a.signal,
                headers: {
                    Accept: 'application/json',
                },
            });
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const json = (await response.json());
            if ((_b = json.ubicacion) === null || _b === void 0 ? void 0 : _b.centroide) {
                const [x, y] = json.ubicacion.centroide
                    .replace('(', '')
                    .replace(')', '')
                    .split(' ')
                    .map(parseFloat);
                return {
                    x,
                    y,
                    srid: 4326,
                };
            }
            return undefined;
        }
        catch (error) {
            if (error instanceof Error && error.name === 'AbortError') {
                console.error('Request was aborted');
            }
            else {
                console.error('Error fetching location:', error);
            }
            return undefined;
        }
    }
    async getSuggestions(text, callback) {
        if (this.options.debug) {
            console.debug(`SuggesterLugares.getSuggestions('${text}')`);
        }
        try {
            // Cancelar petición anterior si existe
            this.abort();
            // Crear nuevo AbortController para esta petición
            this.lastRequest = new AbortController();
            const searchParams = {
                start: this.options.searchOptions.start,
                limit: this.options.searchOptions.limit,
                texto: text,
                tipo: this.options.searchOptions.tipoBusqueda,
                totalFull: this.options.searchOptions.totalFull,
            };
            // @ts-ignore
            const url = (0, urijs_1.default)(this.options.server).search(searchParams).toString();
            // @ts-ignore @typescript-eslint/no-unsafe-argument
            const response = await fetch(url, {
                signal: this.lastRequest.signal,
                headers: {
                    Accept: 'application/json',
                },
            });
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const json = (await response.json());
            const suggestions = await Promise.all(json.instancias.map(async (d) => {
                const suggestion = {
                    title: d.nombre,
                    subTitle: d.clase,
                    type: 'LUGAR',
                    idEpok: d.id,
                    suggesterName: this.name,
                    data: d,
                };
                const coordenadas = await this.getLatLng2(d);
                if (coordenadas) {
                    suggestion.data.coordenadas = coordenadas;
                }
                return suggestion;
            }));
            callback(suggestions, text, this.name);
        }
        catch (error) {
            if (error instanceof Error && 'id' in error && error.id === 0) {
                callback([], text, this.name);
            }
            else {
                callback([error], text, this.name);
            }
        }
        finally {
            this.lastRequest = null;
        }
    }
    abort() {
        var _a, _b;
        if (this.lastRequest) {
            this.lastRequest.abort();
            this.lastRequest = null;
            (_b = (_a = this.options).afterAbort) === null || _b === void 0 ? void 0 : _b.call(_a);
        }
    }
    ready() {
        return true;
    }
    setOptions(options) {
        const mergedOptions = {
            ...this.options,
            ...options,
            searchOptions: {
                ...this.options.searchOptions,
                ...(options.searchOptions || {}),
            },
        };
        super.setOptions(mergedOptions);
    }
}
exports.SuggesterLugares = SuggesterLugares;
