import { Suggester } from './Suggester';
interface LugarSuggestion {
    title: string;
    subTitle: string;
    type: string;
    idEpok: string;
    suggesterName: string;
    data: LugarData;
}
interface LugarData {
    id: string;
    nombre: string;
    clase: string;
    coordenadas?: Coordenadas;
    [key: string]: any;
}
interface Coordenadas {
    x: number;
    y: number;
    srid: number;
}
interface SearchOptions {
    start: number;
    limit: number;
    tipoBusqueda: string;
    categoria?: string;
    clase?: string;
    bbox: boolean;
    extent?: string;
    returnRawData: boolean;
    totalFull?: boolean;
}
interface LugarOptions {
    debug: boolean;
    serverTimeout: number;
    maxRetries: number;
    maxSuggestions: number;
    server: string;
    searchOptions: SearchOptions;
    afterAbort?: () => void;
    afterRetry?: () => void;
    afterServerRequest?: () => void;
    afterServerResponse?: () => void;
    onReady?: () => void;
}
export declare class SuggesterLugares extends Suggester {
    private lastRequest;
    constructor(name: string, options?: Partial<LugarOptions>);
    private getLatLng2;
    getSuggestions(text: string, callback: (suggestions: LugarSuggestion[], text: string, suggesterName: string) => void): Promise<void>;
    abort(): void;
    ready(): boolean;
    setOptions(options: Partial<LugarOptions>): void;
}
export {};
