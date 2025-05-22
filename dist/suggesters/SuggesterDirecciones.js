"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SuggesterDirecciones = void 0;
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
const Suggester_1 = require("./Suggester");
const normalizador_1 = require("@usig-gcba/normalizador");
const config_1 = require("../config");
const defaults = {
    debug: false,
    serverTimeout: 5000,
    maxRetries: 5,
    maxSuggestions: 10,
    acceptSN: true,
    callesEnMinusculas: true,
    ignorarTextoSobrante: false,
};
const convertToDireccionSuggestion = (d) => ({
    title: d.nombre,
    subTitle: 'CABA',
    type: d.tipo,
    category: d.tipo,
    suggesterName: 'Direcciones',
    data: {
        ...d,
        coordenadas: d.coordenadas
            ? {
                x: parseFloat(d.coordenadas.x),
                y: parseFloat(d.coordenadas.y),
                srid: d.coordenadas.srid,
            }
            : undefined,
    },
});
class SuggesterDirecciones extends Suggester_1.Suggester {
    constructor(name, options = {}) {
        const mergedOptions = {
            ...defaults,
            ...options,
        };
        super(name, mergedOptions);
        if (!options.normalizadorDirecciones && !normalizador_1.Normalizador.inicializado()) {
            normalizador_1.Normalizador.init(mergedOptions);
        }
        this.normalizadorDirecciones = options.normalizadorDirecciones
            ? new options.normalizadorDirecciones(mergedOptions)
            : new normalizador_1.Normalizador(mergedOptions);
        this.lastRequest = null;
    }
    async getLatLng2(lugar) {
        var _a, _b, _c;
        try {
            const response = await fetch(`${config_1.usig_webservice_url}/normalizar/?direccion=${encodeURIComponent(lugar.nombre)},${encodeURIComponent(lugar.descripcion)}&geocodificar=true&srid=4326`, {
                signal: (_a = this.lastRequest) === null || _a === void 0 ? void 0 : _a.signal,
                headers: {
                    Accept: 'application/json',
                },
            });
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const json = (await response.json());
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
                console.debug('Request was aborted');
            }
            else {
                console.error('Error fetching coordinates:', error);
            }
            return undefined;
        }
    }
    async getLatLng3(lugar) {
        var _a, _b;
        try {
            const codigo = lugar.codigo || ((_a = lugar.calle) === null || _a === void 0 ? void 0 : _a.codigo);
            if (!codigo || !lugar.altura) {
                return undefined;
            }
            const response = await fetch(`${config_1.catastro_webservice_url}/parcela/?codigo_calle=${encodeURIComponent(codigo)}&altura=${encodeURIComponent(lugar.altura)}&geocodificar=true&srid=4326`, {
                signal: (_b = this.lastRequest) === null || _b === void 0 ? void 0 : _b.signal,
                headers: {
                    Accept: 'application/json',
                },
            });
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const json = (await response.json());
            return json.smp;
        }
        catch (error) {
            if (error instanceof Error && error.name === 'AbortError') {
                console.log('Request was aborted');
            }
            else {
                console.error('Error fetching catastro data:', error);
            }
            return undefined;
        }
    }
    async getSuggestions(text, callback, maxSuggestions) {
        if (this.options.debug) {
            console.log(`SuggesterDirecciones.getSuggestions('${text}')`);
        }
        const maxSug = maxSuggestions !== null && maxSuggestions !== void 0 ? maxSuggestions : this.options.maxSuggestions;
        try {
            // Cancelar petición anterior si existe
            this.abort();
            // Crear nuevo AbortController para esta petición
            this.lastRequest = new AbortController();
            const dirs = this.normalizadorDirecciones.normalizar(text, maxSug);
            const suggestions = await Promise.all(dirs.map(async (d) => {
                const suggestion = convertToDireccionSuggestion(d);
                const [coordenadas, smp] = await Promise.all([
                    this.getLatLng2(suggestion.data),
                    this.getLatLng3(suggestion.data),
                ]);
                if (coordenadas) {
                    suggestion.data.coordenadas = coordenadas;
                }
                if (smp) {
                    suggestion.data.smp = smp;
                }
                return suggestion;
            }));
            callback(suggestions, text, this.name);
        }
        catch (error) {
            if (this.options.ignorarTextoSobrante) {
                try {
                    const opciones = this.normalizadorDirecciones.buscarDireccion(text);
                    if (opciones !== false) {
                        const dirs = [opciones.match].map(convertToDireccionSuggestion);
                        callback(dirs, text, this.name);
                    }
                    else {
                        if (error instanceof Error && 'id' in error && error.id === 0) {
                            callback([], text, this.name);
                        }
                        else {
                            callback([error], text, this.name);
                        }
                    }
                }
                catch (innerError) {
                    callback([innerError], text, this.name);
                }
            }
            else {
                if (error instanceof Error && 'id' in error && error.id === 0) {
                    callback([], text, this.name);
                }
                else {
                    callback([error], text, this.name);
                }
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
        return Boolean(this.normalizadorDirecciones && normalizador_1.Normalizador.inicializado());
    }
    setOptions(options) {
        const mergedOptions = {
            ...this.options,
            ...options,
        };
        super.setOptions(mergedOptions);
    }
}
exports.SuggesterDirecciones = SuggesterDirecciones;
