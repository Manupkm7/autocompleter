import { Suggester } from './Suggester';
interface CatastroSuggestion {
    title: string;
    subTitle: string;
    type: string;
    category: string;
    suggesterName: string;
    data: CatastroData;
}
interface CatastroData {
    codigo: string;
    descripcion: string;
    tipo: string;
    smp?: string;
    coordenadas?: Coordenadas;
}
interface Coordenadas {
    x: number;
    y: number;
    srid: number;
}
interface CatastroOptions {
    debug: boolean;
    serverTimeout: number;
    maxRetries: number;
    maxSuggestions: number;
    afterAbort?: (suggesterName: string) => void;
    afterRetry?: (suggesterName: string) => void;
    afterServerRequest?: (suggesterName: string) => void;
    afterServerResponse?: (suggesterName: string) => void;
    onReady?: () => void;
}
export declare class SuggesterCatastro extends Suggester {
    private lastRequest;
    constructor(name: string, options?: Partial<CatastroOptions>);
    private getCatastroData;
    getSuggestions(text: string, callback: (suggestions: CatastroSuggestion[], text: string, suggesterName: string) => void): Promise<void>;
    abort(): void;
    ready(): boolean;
    setOptions(options: Partial<CatastroOptions>): void;
}
export {};
