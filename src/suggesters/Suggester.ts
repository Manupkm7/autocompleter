import { SuggesterStatus } from '../types';

interface SuggesterOptions {
  ignorarTextoSobrante: any;
  searchOptions: any;
  afterAbort: (suggesterName: string) => void;
  afterRetry: (suggesterName: string) => void;
  afterServerRequest: (suggesterName: string) => void;
  afterServerResponse: (suggesterName: string) => void;
  debug: boolean;
  serverTimeout: number;
  maxRetries: number;
  maxSuggestions: number;
  inputPause: number;
  minTextLength: number;
}

interface Suggestion {
  [key: string]: any;
}

type SuggestionCallback = (suggestions: Suggestion[]) => void;

const defaults: SuggesterOptions = {
  afterAbort: (_suggesterName: string) => {},
  afterRetry: (_suggesterName: string) => {},
  afterServerRequest: (_suggesterName: string) => {},
  afterServerResponse: (_suggesterName: string) => {},
  ignorarTextoSobrante: false,
  debug: false,
  serverTimeout: 15000,
  maxRetries: 5,
  maxSuggestions: 10,
  searchOptions: undefined,
  inputPause: 200,
  minTextLength: 3
};

const suggestionsPromises: Map<Suggestion, Promise<any>[]> = new Map();

export class MethodNotImplemented extends Error {
  constructor() {
    super('Suggester: Method Not Implemented.');
    this.name = 'MethodNotImplemented';
  }
}

export class GeoCodingTypeError extends Error {
  constructor() {
    super('Suggester: Wrong object type for geocoding.');
    this.name = 'GeoCodingTypeError';
  }
}

export abstract class Suggester {
  public name: string;
  public options: SuggesterOptions;
  public status: SuggesterStatus;
  public inputTimer: NodeJS.Timeout | undefined;
  public suggestionsPromises: Map<Suggestion, Promise<any>[]>;

  constructor(name: string, options: Partial<SuggesterOptions> = {}) {
    this.name = name;
    this.options = { ...defaults, ...options };
    this.status = SuggesterStatus.DONE;
    this.inputTimer = undefined;
    this.suggestionsPromises = suggestionsPromises;
  }

  /**
   * Retorna un array de promises del suggestion recibido como parámetro
   * @param suggestion uno de los objetos retornado por getSuggestions
   */
  static getSuggestionPromises(suggestion: Suggestion): Promise<any>[] {
    return suggestionsPromises.get(suggestion) || [];
  }

  /**
   * Agrega una promesa a las sugerencias
   * @param suggestion La sugerencia a la que se le agrega la promesa
   * @param promise La promesa a agregar
   */
  addSuggestionPromise(suggestion: Suggestion, promise: Promise<any>): void {
    if (!this.suggestionsPromises.has(suggestion)) {
      this.suggestionsPromises.set(suggestion, [promise]);
    } else {
      this.suggestionsPromises.get(suggestion)?.push(promise);
    }
  }

  /**
   * Dado un string, realiza una búsqueda de sugerencias y llama al callback con las
   * opciones encontradas.
   * En algunos casos los objetos retornados tienen data incompleta que serán cargadas con posterioridad
   * Si se desea esperar por esta carga puede hacer un Promise.all del array retornado por getSuggestionPromises
   * @param text Texto de input
   * @param callback Función que es llamada con la lista de sugerencias
   * @param maxSuggestions (opcional) Máximo número de sugerencias a devolver
   */
  abstract getSuggestions(
    text: string,
    callback: SuggestionCallback,
    maxSuggestions?: number,
  ): void;

  /**
   * Permite abortar la última consulta realizada
   */
  abstract abort(): void;

  /**
   * Actualiza la configuración del componente a partir de un objeto con overrides para las
   * opciones disponibles
   * @param options Objeto conteniendo overrides para las opciones disponibles
   */
  setOptions(options: Partial<SuggesterOptions>): void {
    this.options = { ...this.options, ...options };
  }

  /**
   * Devuelve las opciones actualmente vigentes para el componente.
   * @returns Objeto conteniendo las opciones actualmente vigentes para el componente.
   */
  getOptions(): SuggesterOptions {
    return this.options;
  }

  /**
   * Indica si el componente está listo para realizar sugerencias
   * @returns Verdadero si el componente se encuentra listo para responder sugerencias
   */
  abstract ready(): boolean;
}
