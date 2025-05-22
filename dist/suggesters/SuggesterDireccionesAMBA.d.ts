import { Suggester } from './Suggester';
interface DireccionSuggestion {
    title: string;
    subTitle: string;
    type: string;
    category: string;
    suggesterName: string;
    data: DireccionData;
    coordenadas?: Coordenadas;
}
interface DireccionData {
    nombre: string;
    descripcion: string;
    tipo: string;
    coordenadas?: Coordenadas;
}
interface Coordenadas {
    x: number;
    y: number;
    srid: number;
}
interface DireccionAMBAOptions {
    debug: boolean;
    serverTimeout: number;
    maxRetries: number;
    maxSuggestions: number;
    normalizadorAMBA?: any;
    searchOptions?: {
        acceptSN?: boolean;
        callesEnMinusculas?: boolean;
        ignorarTextoSobrante?: boolean;
    };
    afterAbort?: () => void;
    afterRetry?: () => void;
    afterServerRequest?: () => void;
    afterServerResponse?: () => void;
    onReady?: () => void;
}
export declare class SuggesterDireccionesAMBA extends Suggester {
    private normalizadorAMBA;
    private lastRequest;
    constructor(name: string, options?: Partial<DireccionAMBAOptions>);
    private getLatLng2;
    getSuggestions(text: string, callback: (suggestions: DireccionSuggestion[], text: string, suggesterName: string) => void, maxSuggestions?: number): Promise<void>;
    abort(): void;
    ready(): boolean;
    setOptions(options: Partial<DireccionAMBAOptions>): void;
}
export {};
