"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SuggesterDeficitHabitacional = void 0;
const Suggester_1 = require("./Suggester");
const config_1 = require("../config");
const defaults = {
    debug: false,
    serverTimeout: 5000,
    maxRetries: 5,
    maxSuggestions: 10,
};
class SuggesterDeficitHabitacional extends Suggester_1.Suggester {
    constructor(name, options = {}) {
        const mergedOptions = {
            ...defaults,
            ...options,
        };
        super(name, mergedOptions);
        this.lastRequest = null;
    }
    async getDeficitData(codigo) {
        var _a;
        try {
            const response = await fetch(`${config_1.deficit_habitacional_webservice_url}/deficit/?codigo=${encodeURIComponent(codigo)}&geocodificar=true&srid=4326`, {
                signal: (_a = this.lastRequest) === null || _a === void 0 ? void 0 : _a.signal,
                headers: {
                    Accept: 'application/json',
                },
            });
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return (await response.json());
        }
        catch (error) {
            if (error instanceof Error && error.name === 'AbortError') {
                console.debug('Request was aborted');
            }
            else {
                console.error('Error fetching deficit data:', error);
            }
            return undefined;
        }
    }
    async getSuggestions(text, callback) {
        if (this.options.debug) {
            console.debug(`SuggesterDeficitHabitacional.getSuggestions('${text}')`);
        }
        try {
            // Cancelar petición anterior si existe
            this.abort();
            // Crear nuevo AbortController para esta petición
            this.lastRequest = new AbortController();
            // Simular búsqueda de déficit (esto debería ser reemplazado por la implementación real)
            const resultados = [
                {
                    codigo: text,
                    descripcion: 'Área de Déficit Habitacional',
                    tipo: 'DEFICIT',
                },
            ];
            const suggestions = await Promise.all(resultados.map(async (d) => {
                const suggestion = {
                    title: d.codigo,
                    subTitle: d.descripcion,
                    type: d.tipo,
                    category: d.tipo,
                    suggesterName: this.name,
                    data: d,
                };
                const deficitData = await this.getDeficitData(d.codigo);
                if (deficitData) {
                    if (deficitData.coordenadas) {
                        suggestion.data.coordenadas = {
                            x: parseFloat(deficitData.coordenadas.x),
                            y: parseFloat(deficitData.coordenadas.y),
                            srid: deficitData.coordenadas.srid,
                        };
                    }
                    if (deficitData.deficit) {
                        suggestion.data.deficit = deficitData.deficit;
                    }
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
        };
        super.setOptions(mergedOptions);
    }
}
exports.SuggesterDeficitHabitacional = SuggesterDeficitHabitacional;
