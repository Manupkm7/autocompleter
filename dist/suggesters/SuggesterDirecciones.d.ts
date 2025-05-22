import { Suggester } from './Suggester';
import { NormalizerOptions, Normalizador } from 'gcba-normalizador-typescript';
interface DireccionSuggestion {
    title: string;
    subTitle: string;
    type: string;
    category: string;
    suggesterName: string;
    data: DireccionData;
}
interface DireccionData {
    nombre: string;
    descripcion: string;
    tipo: string;
    codigo?: string;
    altura?: string;
    calle?: {
        codigo: string;
    };
    coordenadas?: Coordenadas;
    smp?: string;
}
interface Coordenadas {
    x: number;
    y: number;
    srid: number;
}
interface DireccionOptions {
    debug: boolean;
    serverTimeout: number;
    maxRetries: number;
    maxSuggestions: number;
    acceptSN: boolean;
    callesEnMinusculas: boolean;
    ignorarTextoSobrante: boolean;
    normalizadorDirecciones?: new (options: NormalizerOptions) => Normalizador;
    afterAbort?: () => void;
    afterRetry?: () => void;
    afterServerRequest?: () => void;
    afterServerResponse?: () => void;
    onReady?: () => void;
}
export declare class SuggesterDirecciones extends Suggester {
    private normalizadorDirecciones;
    private lastRequest;
    constructor(name: string, options?: Partial<DireccionOptions>);
    private getLatLng2;
    private getLatLng3;
    getSuggestions(text: string, callback: (suggestions: DireccionSuggestion[], text: string, suggesterName: string) => void, maxSuggestions?: number): Promise<void>;
    abort(): void;
    ready(): boolean;
    setOptions(options: Partial<DireccionOptions>): void;
}
export {};
