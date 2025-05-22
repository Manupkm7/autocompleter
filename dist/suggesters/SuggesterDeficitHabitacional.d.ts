import { Suggester } from './Suggester';
interface DeficitSuggestion {
    title: string;
    subTitle: string;
    type: string;
    category: string;
    suggesterName: string;
    data: DeficitData;
}
interface DeficitData {
    codigo: string;
    descripcion: string;
    tipo: string;
    coordenadas?: Coordenadas;
    deficit?: {
        total: number;
        cuantitativo: number;
        cualitativo: number;
    };
}
interface Coordenadas {
    x: number;
    y: number;
    srid: number;
}
interface DeficitOptions {
    debug: boolean;
    serverTimeout: number;
    maxRetries: number;
    maxSuggestions: number;
    afterAbort?: () => void;
    afterRetry?: () => void;
    afterServerRequest?: () => void;
    afterServerResponse?: () => void;
    onReady?: () => void;
}
export declare class SuggesterDeficitHabitacional extends Suggester {
    private lastRequest;
    constructor(name: string, options?: Partial<DeficitOptions>);
    private getDeficitData;
    getSuggestions(text: string, callback: (suggestions: DeficitSuggestion[], text: string, suggesterName: string) => void): Promise<void>;
    abort(): void;
    ready(): boolean;
    setOptions(options: Partial<DeficitOptions>): void;
}
export {};
