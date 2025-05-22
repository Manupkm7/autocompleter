/* eslint-disable @typescript-eslint/ban-ts-comment */
/* eslint-disable @typescript-eslint/no-var-requires */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
import { usig_webservice_url } from './config';
import {
  AutocompleterOptions,
  AutocompleterCallbacks,
  Suggester,
  SuggesterConfig,
  SuggesterStatus,
  Suggestion,
  GlobalState,
  SuggesterOptions,
} from './types';

const defaultOptions: AutocompleterOptions = {
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

const emptyCallback = (): void => {
  console.debug('Callback not implemented');
};

export class Autocompleter {
  private options: AutocompleterOptions;
  private suggesters: Suggester[] = [];
  private registeredSuggesters: SuggesterConfig[] = [];
  private suggestions: Suggestion[] = [];
  private suggestersByName: Record<string, Suggester> = {};
  private pendingRequests: Record<string, number> = {};
  private currentText: string = '';
  private numPendingRequests: number = 0;
  private appendResults: boolean = false;
  private bufferedResults: Suggestion[] = [];
  private flushTimer: NodeJS.Timeout | null = null;
  private appendBufferedResults: boolean = false;
  private globalState!: GlobalState;

  // Callbacks
  private onSuggestions!: (suggestions: Suggestion[], appendResults: boolean) => void;
  private onCompleteSuggestions!: (suggestions: Suggestion[], appendResults: boolean) => void;
  private onUpdate!: (state: GlobalState) => void;
  private onError!: (error: string) => void;
  private onMessage!: (message: { message: string; suggester: string }) => void;
  private onBufferResults!: (suggestions: Suggestion[]) => void;

  constructor(callbacks?: AutocompleterCallbacks, options?: Partial<AutocompleterOptions>) {
    this.options = { ...defaultOptions, ...options };
    this.initializeCallbacks(callbacks);
    this.initializeState();
    this.initializeRegisteredSuggesters();
  }

  private initializeCallbacks(callbacks?: AutocompleterCallbacks): void {
    this.onSuggestions = callbacks?.onSuggestions || emptyCallback;
    this.onCompleteSuggestions = callbacks?.onCompleteSuggestions || emptyCallback;
    this.onUpdate = callbacks?.onUpdate || emptyCallback;
    this.onError = callbacks?.onError || emptyCallback;
    this.onMessage = callbacks?.onMessage || emptyCallback;
    this.onBufferResults = callbacks?.onBufferResults || emptyCallback;
  }

  private initializeState(): void {
    this.globalState = {
      currentText: this.currentText,
      suggesters: [],
      suggestions: [],
      pendingRequests: 0,
      waitingSuggesters: 0,
    };
  }

  private initializeRegisteredSuggesters(): void {
    this.options.suggesters.forEach((suggester) => {
      this.registeredSuggesters.push(suggester);
    });
  }

  public setCallbacks(callbacks: AutocompleterCallbacks): void {
    this.initializeCallbacks(callbacks);
  }

  public getSuggesters(): Suggester[] {
    return this.suggesters;
  }

  public addSuggester(
    suggester: string | Suggester,
    options: Partial<SuggesterOptions> = {},
  ): boolean {
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
    } catch (error) {
      if (this.options.debug) {
        console.debug(`ERROR: Suggester: ${name} creation failed.`);
      }
      return false;
    }
  }

  private createSuggester(
    suggester: string | Suggester,
    options: Partial<SuggesterOptions> = {},
  ): Suggester {
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

  public removeSuggester(suggester: string | Suggester): void {
    const name = typeof suggester === 'string' ? suggester : suggester.name;
    this.suggesters = this.suggesters.filter((s) => s.name !== name);
    delete this.suggestersByName[name];
  }

  public async updateCoordenadas(suggestion: Suggestion): Promise<any> {
    if (suggestion.suggesterName === 'Direcciones') {
      return this.fetchCoordenadas(`${suggestion.data.nombre},${suggestion.data.descripcion}`);
    } else if (suggestion.suggesterName === 'DireccionesAMBA') {
      return this.fetchCoordenadas(
        `${suggestion.data.nombre}, ${suggestion.data.descripcion.split(',', 2)[0]}`,
      );
    }
    return null;
  }

  private async fetchCoordenadas(direccion: string): Promise<any> {
    try {
      const response = await fetch(
        `${usig_webservice_url}/normalizar/?direccion=${direccion}&geocodificar=true&srid=4326`,
      );
      const data = await response.json();

      if (data.direccionesNormalizadas?.[0]?.coordenadas) {
        return data.direccionesNormalizadas[0].coordenadas;
      }
      return null;
    } catch (error) {
      if (this.options.debug) {
        console.error('Error fetching coordenadas:', error);
      }
      return null;
    }
  }

  public updateSuggestions(newValue: string): void {
    this.currentText = newValue;
    this.suggestions = [];
    this.abortPendingRequests();
    this.appendResults = false;

    this.suggesters.forEach((suggester) => {
      if (newValue.length >= suggester.options.minTextLength) {
        suggester.status = SuggesterStatus.INPUT_WAIT;
        suggester.inputTimer = setTimeout(
          () => this.suggest(suggester, newValue),
          suggester.options.inputPause,
        );
      }
    });

    this.onUpdate(this.getGlobalState());
  }

  private abortPendingRequests(): void {
    this.suggesters.forEach((suggester) => {
      if (suggester.inputTimer) {
        if (this.options.debug) {
          console.debug(`Aborting suggester ${suggester.name}`);
        }
        clearTimeout(suggester.inputTimer);
        suggester.status = SuggesterStatus.DONE;
      }
    });
  }

  private suggest(suggester: Suggester, text: string): void {
    this.handleServerRequest(suggester.name);

    if (this.options.debug) {
      console.debug(`Starting suggestions fetch. Suggesters ready?: ${this.isInitialized()}`);
    }

    suggester.getSuggestions(
      text,
      (results, inputStr, suggesterName) =>
        this.handleSuggestions(results, inputStr, suggesterName),
      suggester.options.maxSuggestions,
    );
  }

  private handleSuggestions(results: Suggestion[], inputStr: string, suggesterName: string): void {
    if (this.currentText !== inputStr) {
      return; // Respuesta a destiempo
    }

    if ('getError' in results) {
      // @ts-ignore
      this.onError(results.getError?.() || results.message);
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
      } else {
        this.onSuggestions(this.suggestions, this.appendResults);
      }
      this.appendResults = true;
    }

    this.handleServerResponse(suggesterName);
    this.checkForCompleteSuggestions();
  }

  private checkForCompleteSuggestions(): void {
    if (this.suggesters.every((s) => s.status === SuggesterStatus.DONE)) {
      this.onCompleteSuggestions(this.suggestions, this.appendResults);
    }
  }

  private handleAbort(suggesterName: string): void {
    if (this.pendingRequests[suggesterName] > 0) {
      this.pendingRequests[suggesterName]--;
      this.numPendingRequests--;
    }
    this.logDebug(`ServerResponse ${suggesterName}`);
  }

  private handleServerRequest(suggesterName: string): void {
    this.pendingRequests[suggesterName]++;
    this.numPendingRequests++;
    const suggester = this.suggesters.find((s) => s.name === suggesterName);
    if (suggester) {
      suggester.status = SuggesterStatus.PENDING;
    }

    this.logDebug(`ServerResponse ${suggesterName}`);
    this.options.afterServerRequest?.();
    this.onUpdate(this.getGlobalState());
  }

  private handleServerResponse(suggesterName: string): void {
    const suggester = this.suggesters.find((s) => s.name === suggesterName);
    if (!suggester) {
      return;
    }

    if (this.pendingRequests[suggesterName] > 0) {
      this.pendingRequests[suggesterName]--;
      this.numPendingRequests--;
      if (this.pendingRequests[suggesterName] === 0) {
        suggester.status = SuggesterStatus.DONE;
      }
    }

    this.logDebug(`ServerResponse ${suggesterName}`);

    if (this.options.afterServerResponse && this.numPendingRequests === 0) {
      this.options.afterServerResponse();
    }

    this.onUpdate(this.getGlobalState());
  }

  private logDebug(action: string): void {
    if (this.options.debug) {
      console.debug(
        `usig.AutoCompleter.${action}. Num Pending Requests: ${this.numPendingRequests}`,
      );
      console.debug(this.pendingRequests);
    }
  }

  public bufferResults(results: Suggestion[], appendResults: boolean): void {
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

  private handleBufferCallback(): void {
    if (this.bufferedResults.length > 0) {
      this.onBufferResults(this.suggestions);
      this.bufferedResults = [];
      this.flushTimer = null;
    }
  }

  public getGlobalState(): GlobalState {
    return {
      currentText: this.currentText,
      suggesters: this.suggesters.map((s) => ({
        name: s.name,
        status: s.status,
      })),
      suggestions: this.suggestions,
      pendingRequests: this.numPendingRequests,
      waitingSuggesters: this.suggesters.filter((s) => s.status === SuggesterStatus.INPUT_WAIT)
        .length,
    };
  }

  public isInitialized(): boolean {
    return this.suggesters.every((s) => s.ready());
  }
}

export default Autocompleter;
