"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SuggesterDireccionesAMBA = void 0;
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
const Suggester_1 = require("./Suggester");
const gcba_normalizador_typescript_1 = require("gcba-normalizador-typescript");
const config_1 = require("../config");
const defaults = {
    debug: false,
    serverTimeout: 30000,
    maxRetries: 1,
    maxSuggestions: 10,
    searchOptions: {
        acceptSN: true,
        callesEnMinusculas: false,
        ignorarTextoSobrante: true,
    },
};
class SuggesterDireccionesAMBA extends Suggester_1.Suggester {
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
        this.normalizadorAMBA = options.normalizadorAMBA || gcba_normalizador_typescript_1.NormalizadorAMBA.init({});
        this.lastRequest = null;
    }
    async getLatLng2(lugar) {
        var _a, _b, _c;
        try {
            const response = await fetch(`${config_1.usig_webservice_url}/normalizar/?direccion=${encodeURIComponent(lugar.nombre)}, ${encodeURIComponent(lugar.descripcion.split(',', 2)[0])}&geocodificar=true&srid=4326`, {
                signal: (_a = this.lastRequest) === null || _a === void 0 ? void 0 : _a.signal,
                headers: {
                    Accept: 'application/json',
                },
            });
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const json = await response.json();
            if ((_c = (_b = json.direccionesNormalizadas) === null || _b === void 0 ? void 0 : _b[0]) === null || _c === void 0 ? void 0 : _c.coordenadas) {
                const coords = json.direccionesNormalizadas[0].coordenadas;
                return {
                    x: parseFloat(coords.x),
                    y: parseFloat(coords.y),
                    srid: coords.srid,
                };
            }
            return undefined;
        }
        catch (error) {
            if (error instanceof Error && error.name === 'AbortError') {
                console.error('Request was aborted');
            }
            else {
                console.error('Error fetching coordinates:', error);
            }
            return undefined;
        }
    }
    async getSuggestions(text, callback, maxSuggestions) {
        const maxSug = maxSuggestions !== null && maxSuggestions !== void 0 ? maxSuggestions : this.options.maxSuggestions;
        try {
            // Cancelar petición anterior si existe
            this.abort();
            // Crear nuevo AbortController para esta petición
            this.lastRequest = new AbortController();
            const results = await new Promise((resolve, reject) => {
                this.normalizadorAMBA.buscar(text, (results) => resolve(results), (error) => reject(error), maxSug);
            });
            const suggestions = await Promise.all(results.map(async (d) => {
                const suggestion = {
                    title: d.nombre,
                    subTitle: d.descripcion,
                    type: d.tipo,
                    category: d.tipo,
                    suggesterName: this.name,
                    data: d,
                };
                if (d.tipo === 'DIRECCION') {
                    const coordenadas = await this.getLatLng2(d);
                    if (coordenadas) {
                        suggestion.data.coordenadas = coordenadas;
                    }
                }
                return suggestion;
            }));
            callback(suggestions, text, this.name);
        }
        catch (error) {
            console.error('Error getting suggestions:', error);
            callback([], text, this.name);
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
exports.SuggesterDireccionesAMBA = SuggesterDireccionesAMBA;
