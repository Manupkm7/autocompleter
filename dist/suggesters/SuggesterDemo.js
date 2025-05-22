"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SuggesterDemo = void 0;
const Suggester_1 = require("./Suggester");
const defaults = {
    debug: false,
    serverTimeout: 5000,
    maxRetries: 5,
    maxSuggestions: 10,
};
// Datos de ejemplo para demostración
const DEMO_DATA = [
    {
        id: '1',
        nombre: 'Plaza de Mayo',
        descripcion: 'Plaza histórica de Buenos Aires',
        tipo: 'PLAZA',
        coordenadas: {
            x: -58.381592,
            y: -34.603722,
            srid: 4326,
        },
    },
    {
        id: '2',
        nombre: 'Obelisco',
        descripcion: 'Monumento histórico de Buenos Aires',
        tipo: 'MONUMENTO',
        coordenadas: {
            x: -58.381592,
            y: -34.603722,
            srid: 4326,
        },
    },
    {
        id: '3',
        nombre: 'Teatro Colón',
        descripcion: 'Teatro de ópera de Buenos Aires',
        tipo: 'TEATRO',
        coordenadas: {
            x: -58.383333,
            y: -34.601111,
            srid: 4326,
        },
    },
];
class SuggesterDemo extends Suggester_1.Suggester {
    constructor(name, options = {}) {
        const mergedOptions = {
            ...defaults,
            ...options,
        };
        super(name, mergedOptions);
        this.lastRequest = null;
    }
    async getSuggestions(text, callback, maxSuggestions) {
        if (this.options.debug) {
            console.debug(`SuggesterDemo.getSuggestions('${text}')`);
        }
        try {
            // Cancelar petición anterior si existe
            this.abort();
            // Crear nuevo AbortController para esta petición
            this.lastRequest = new AbortController();
            // Simular una pequeña demora para demostrar el comportamiento asíncrono
            await new Promise((resolve) => setTimeout(resolve, 500));
            // Filtrar los datos de ejemplo basados en el texto de búsqueda
            const filteredData = DEMO_DATA.filter((item) => item.nombre.toLowerCase().includes(text.toLowerCase()) ||
                item.descripcion.toLowerCase().includes(text.toLowerCase())).slice(0, maxSuggestions !== null && maxSuggestions !== void 0 ? maxSuggestions : this.options.maxSuggestions);
            const suggestions = filteredData.map((d) => ({
                title: d.nombre,
                subTitle: d.descripcion,
                type: d.tipo,
                category: d.tipo,
                suggesterName: this.name,
                data: d,
            }));
            // Simular una respuesta asíncrona
            setTimeout(() => {
                callback(suggestions, text, this.name);
            }, 100);
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
exports.SuggesterDemo = SuggesterDemo;
