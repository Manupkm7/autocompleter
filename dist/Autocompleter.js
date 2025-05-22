"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Autocompleter = void 0;
/* eslint-disable @typescript-eslint/ban-ts-comment */
/* eslint-disable @typescript-eslint/no-var-requires */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
const config_1 = require("./config");
const types_1 = require("./types");
const defaultOptions = {
    inputPause: 200,
    maxSuggestions: 10,
    serverTimeout: 30000,
    minTextLength: 3,
    maxRetries: 1,
    flushTimeout: 0,
    suggesters: [
        {
            name: 'Direcciones',
            options: { inputPause: 300, minTextLength: 3 },
            class: require('./suggesters/SuggesterDirecciones').default,
        },
        {
            name: 'Lugares',
            options: { inputPause: 500, minTextLength: 3 },
            class: require('./suggesters/SuggesterLugares').default,
        },
        {
            name: 'DireccionesAMBA',
            options: { inputPause: 500, minTextLength: 3 },
            class: require('./suggesters/SuggesterDireccionesAMBA').default,
        },
        {
            name: 'DeficitHabitacional',
            options: { inputPause: 500, minTextLength: 3 },
            class: require('./suggesters/SuggesterDeficitHabitacional').default,
        },
        {
            name: 'Catastro',
            options: { inputPause: 500, minTextLength: 3 },
            class: require('./suggesters/SuggesterCatastro').default,
        },
    ],
    debug: false,
    texts: {
        nothingFound: 'No se hallaron resultados coincidentes con su búsqueda.',
    },
};
const emptyCallback = () => {
    console.debug('Callback not implemented');
};
class Autocompleter {
    constructor(callbacks, options) {
        this.suggesters = [];
        this.registeredSuggesters = [];
        this.suggestions = [];
        this.suggestersByName = {};
        this.pendingRequests = {};
        this.currentText = '';
        this.numPendingRequests = 0;
        this.appendResults = false;
        this.bufferedResults = [];
        this.flushTimer = null;
        this.appendBufferedResults = false;
        this.options = { ...defaultOptions, ...options };
        this.initializeCallbacks(callbacks);
        this.initializeState();
        this.initializeRegisteredSuggesters();
    }
    initializeCallbacks(callbacks) {
        this.onSuggestions = (callbacks === null || callbacks === void 0 ? void 0 : callbacks.onSuggestions) || emptyCallback;
        this.onCompleteSuggestions = (callbacks === null || callbacks === void 0 ? void 0 : callbacks.onCompleteSuggestions) || emptyCallback;
        this.onUpdate = (callbacks === null || callbacks === void 0 ? void 0 : callbacks.onUpdate) || emptyCallback;
        this.onError = (callbacks === null || callbacks === void 0 ? void 0 : callbacks.onError) || emptyCallback;
        this.onMessage = (callbacks === null || callbacks === void 0 ? void 0 : callbacks.onMessage) || emptyCallback;
        this.onBufferResults = (callbacks === null || callbacks === void 0 ? void 0 : callbacks.onBufferResults) || emptyCallback;
    }
    initializeState() {
        this.globalState = {
            currentText: this.currentText,
            suggesters: [],
            suggestions: [],
            pendingRequests: 0,
            waitingSuggesters: 0,
        };
    }
    initializeRegisteredSuggesters() {
        this.options.suggesters.forEach((suggester) => {
            this.registeredSuggesters.push(suggester);
        });
    }
    setCallbacks(callbacks) {
        this.initializeCallbacks(callbacks);
    }
    getSuggesters() {
        return this.suggesters;
    }
    addSuggester(suggester, options = {}) {
        const name = typeof suggester === 'string' ? suggester : suggester.name;
        if (this.suggestersByName[name]) {
            if (this.options.debug) {
                console.debug('Se intentó agregar dos suggesters con el mismo nombre.');
            }
            return false;
        }
        try {
            const sgObj = this.createSuggester(suggester, options);
            this.suggestersByName[name] = sgObj;
            this.pendingRequests[name] = 0;
            this.suggesters.push(sgObj);
            return true;
        }
        catch (error) {
            if (this.options.debug) {
                console.debug(`ERROR: Suggester: ${name} creation failed.`);
            }
            return false;
        }
    }
    createSuggester(suggester, options = {}) {
        if (typeof suggester === 'string') {
            const suggesterConfig = this.registeredSuggesters.find((s) => s.name === suggester);
            if (!suggesterConfig) {
                throw new Error('Suggester no encontrado');
            }
            const mergedOptions = {
                ...this.options,
                ...options,
                onReady: this.options.onReady,
                debug: this.options.debug,
                maxRetries: this.options.maxRetries,
                afterServerRequest: this.handleServerRequest.bind(this),
                afterServerResponse: this.handleServerResponse.bind(this),
                afterAbort: this.handleAbort.bind(this),
            };
            return new suggesterConfig.class(suggester, mergedOptions);
        }
        suggester.setOptions({
            debug: this.options.debug,
            maxRetries: this.options.maxRetries,
            afterServerRequest: this.handleServerRequest.bind(this),
            afterServerResponse: this.handleServerResponse.bind(this),
            afterAbort: this.handleAbort.bind(this),
        });
        return suggester;
    }
    removeSuggester(suggester) {
        const name = typeof suggester === 'string' ? suggester : suggester.name;
        this.suggesters = this.suggesters.filter((s) => s.name !== name);
        delete this.suggestersByName[name];
    }
    async updateCoordenadas(suggestion) {
        if (suggestion.suggesterName === 'Direcciones') {
            return this.fetchCoordenadas(`${suggestion.data.nombre},${suggestion.data.descripcion}`);
        }
        else if (suggestion.suggesterName === 'DireccionesAMBA') {
            return this.fetchCoordenadas(`${suggestion.data.nombre}, ${suggestion.data.descripcion.split(',', 2)[0]}`);
        }
        return null;
    }
    async fetchCoordenadas(direccion) {
        var _a, _b;
        try {
            const response = await fetch(`${config_1.usig_webservice_url}/normalizar/?direccion=${direccion}&geocodificar=true&srid=4326`);
            const data = await response.json();
            if ((_b = (_a = data.direccionesNormalizadas) === null || _a === void 0 ? void 0 : _a[0]) === null || _b === void 0 ? void 0 : _b.coordenadas) {
                return data.direccionesNormalizadas[0].coordenadas;
            }
            return null;
        }
        catch (error) {
            if (this.options.debug) {
                console.error('Error fetching coordenadas:', error);
            }
            return null;
        }
    }
    updateSuggestions(newValue) {
        this.currentText = newValue;
        this.suggestions = [];
        this.abortPendingRequests();
        this.appendResults = false;
        this.suggesters.forEach((suggester) => {
            if (newValue.length >= suggester.options.minTextLength) {
                suggester.status = types_1.SuggesterStatus.INPUT_WAIT;
                suggester.inputTimer = setTimeout(() => this.suggest(suggester, newValue), suggester.options.inputPause);
            }
        });
        this.onUpdate(this.getGlobalState());
    }
    abortPendingRequests() {
        this.suggesters.forEach((suggester) => {
            if (suggester.inputTimer) {
                if (this.options.debug) {
                    console.debug(`Aborting suggester ${suggester.name}`);
                }
                clearTimeout(suggester.inputTimer);
                suggester.status = types_1.SuggesterStatus.DONE;
            }
        });
    }
    suggest(suggester, text) {
        this.handleServerRequest(suggester.name);
        if (this.options.debug) {
            console.debug(`Starting suggestions fetch. Suggesters ready?: ${this.isInitialized()}`);
        }
        suggester.getSuggestions(text, (results, inputStr, suggesterName) => this.handleSuggestions(results, inputStr, suggesterName), suggester.options.maxSuggestions);
    }
    handleSuggestions(results, inputStr, suggesterName) {
        var _a;
        if (this.currentText !== inputStr) {
            return; // Respuesta a destiempo
        }
        if ('getError' in results) {
            // @ts-ignore
            this.onError(((_a = results.getError) === null || _a === void 0 ? void 0 : _a.call(results)) || results.message);
            return;
        }
        if (results.length === 0) {
            this.onMessage({
                message: 'No results found',
                suggester: suggesterName,
            });
            return;
        }
        if (Array.isArray(results)) {
            this.suggestions = this.suggestions.concat(results).slice(0, this.options.maxSuggestions);
            if (this.options.flushTimeout > 0) {
                this.bufferResults(results, this.appendResults);
            }
            else {
                this.onSuggestions(this.suggestions, this.appendResults);
            }
            this.appendResults = true;
        }
        this.handleServerResponse(suggesterName);
        this.checkForCompleteSuggestions();
    }
    checkForCompleteSuggestions() {
        if (this.suggesters.every((s) => s.status === types_1.SuggesterStatus.DONE)) {
            this.onCompleteSuggestions(this.suggestions, this.appendResults);
        }
    }
    handleAbort(suggesterName) {
        if (this.pendingRequests[suggesterName] > 0) {
            this.pendingRequests[suggesterName]--;
            this.numPendingRequests--;
        }
        this.logDebug(`ServerResponse ${suggesterName}`);
    }
    handleServerRequest(suggesterName) {
        var _a, _b;
        this.pendingRequests[suggesterName]++;
        this.numPendingRequests++;
        const suggester = this.suggesters.find((s) => s.name === suggesterName);
        if (suggester) {
            suggester.status = types_1.SuggesterStatus.PENDING;
        }
        this.logDebug(`ServerResponse ${suggesterName}`);
        (_b = (_a = this.options).afterServerRequest) === null || _b === void 0 ? void 0 : _b.call(_a);
        this.onUpdate(this.getGlobalState());
    }
    handleServerResponse(suggesterName) {
        const suggester = this.suggesters.find((s) => s.name === suggesterName);
        if (!suggester) {
            return;
        }
        if (this.pendingRequests[suggesterName] > 0) {
            this.pendingRequests[suggesterName]--;
            this.numPendingRequests--;
            if (this.pendingRequests[suggesterName] === 0) {
                suggester.status = types_1.SuggesterStatus.DONE;
            }
        }
        this.logDebug(`ServerResponse ${suggesterName}`);
        if (this.options.afterServerResponse && this.numPendingRequests === 0) {
            this.options.afterServerResponse();
        }
        this.onUpdate(this.getGlobalState());
    }
    logDebug(action) {
        if (this.options.debug) {
            console.debug(`usig.AutoCompleter.${action}. Num Pending Requests: ${this.numPendingRequests}`);
            console.debug(this.pendingRequests);
        }
    }
    bufferResults(results, appendResults) {
        if (!appendResults) {
            if (this.options.debug) {
                console.debug('Resetting buffered results...');
            }
            this.bufferedResults = [];
            this.appendBufferedResults = false;
        }
        if (this.options.debug) {
            console.debug('Appending to buffered results...');
        }
        this.bufferedResults.push(...results);
        if (!this.flushTimer) {
            if (this.options.debug) {
                console.debug('Setting flush timer...');
            }
            this.appendBufferedResults = appendResults;
            this.suggestions = this.bufferedResults;
            this.flushTimer = setTimeout(() => this.handleBufferCallback(), this.options.flushTimeout);
        }
    }
    handleBufferCallback() {
        if (this.bufferedResults.length > 0) {
            this.onBufferResults(this.suggestions);
            this.bufferedResults = [];
            this.flushTimer = null;
        }
    }
    getGlobalState() {
        return {
            currentText: this.currentText,
            suggesters: this.suggesters.map((s) => ({
                name: s.name,
                status: s.status,
            })),
            suggestions: this.suggestions,
            pendingRequests: this.numPendingRequests,
            waitingSuggesters: this.suggesters.filter((s) => s.status === types_1.SuggesterStatus.INPUT_WAIT)
                .length,
        };
    }
    isInitialized() {
        return this.suggesters.every((s) => s.ready());
    }
}
exports.Autocompleter = Autocompleter;
exports.default = Autocompleter;
