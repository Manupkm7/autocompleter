interface SuggesterOptions {
    ignorarTextoSobrante: any;
    searchOptions: any;
    afterAbort: () => unknown;
    debug: boolean;
    serverTimeout: number;
    maxRetries: number;
    maxSuggestions: number;
}
interface Suggestion {
    [key: string]: any;
}
type SuggestionCallback = (suggestions: Suggestion[]) => void;
export declare class MethodNotImplemented extends Error {
    constructor();
}
export declare class GeoCodingTypeError extends Error {
    constructor();
}
export declare abstract class Suggester {
    protected name: string;
    protected options: SuggesterOptions;
    protected status: 'done' | 'pending' | 'error';
    protected inputTimer: NodeJS.Timeout | null;
    protected suggestionsPromises: Map<Suggestion, Promise<any>[]>;
    constructor(name: string, options?: Partial<SuggesterOptions>);
    /**
     * Retorna un array de promises del suggestion recibido como parámetro
     * @param suggestion uno de los objetos retornado por getSuggestions
     */
    static getSuggestionPromises(suggestion: Suggestion): Promise<any>[];
    /**
     * Agrega una promesa a las sugerencias
     * @param suggestion La sugerencia a la que se le agrega la promesa
     * @param promise La promesa a agregar
     */
    addSuggestionPromise(suggestion: Suggestion, promise: Promise<any>): void;
    /**
     * Dado un string, realiza una búsqueda de sugerencias y llama al callback con las
     * opciones encontradas.
     * En algunos casos los objetos retornados tienen data incompleta que serán cargadas con posterioridad
     * Si se desea esperar por esta carga puede hacer un Promise.all del array retornado por getSuggestionPromises
     * @param text Texto de input
     * @param callback Función que es llamada con la lista de sugerencias
     * @param maxSuggestions (opcional) Máximo número de sugerencias a devolver
     */
    abstract getSuggestions(text: string, callback: SuggestionCallback, maxSuggestions?: number): void;
    /**
     * Permite abortar la última consulta realizada
     */
    abstract abort(): void;
    /**
     * Actualiza la configuración del componente a partir de un objeto con overrides para las
     * opciones disponibles
     * @param options Objeto conteniendo overrides para las opciones disponibles
     */
    setOptions(options: Partial<SuggesterOptions>): void;
    /**
     * Devuelve las opciones actualmente vigentes para el componente.
     * @returns Objeto conteniendo las opciones actualmente vigentes para el componente.
     */
    getOptions(): SuggesterOptions;
    /**
     * Indica si el componente está listo para realizar sugerencias
     * @returns Verdadero si el componente se encuentra listo para responder sugerencias
     */
    abstract ready(): boolean;
}
export {};
