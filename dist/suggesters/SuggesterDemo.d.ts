import { Suggester } from './Suggester';
interface DemoSuggestion {
    title: string;
    subTitle: string;
    type: string;
    category: string;
    suggesterName: string;
    data: DemoData;
}
interface DemoData {
    id: string;
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
interface DemoOptions {
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
export declare class SuggesterDemo extends Suggester {
    private lastRequest;
    constructor(name: string, options?: Partial<DemoOptions>);
    getSuggestions(text: string, callback: (suggestions: DemoSuggestion[], text: string, suggesterName: string) => void, maxSuggestions?: number): Promise<void>;
    abort(): void;
    ready(): boolean;
    setOptions(options: Partial<DemoOptions>): void;
}
export {};
