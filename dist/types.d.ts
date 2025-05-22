import { NormalizerOptions, Direccion } from 'gcba-normalizador-typescript';
export interface SuggesterOptions extends NormalizerOptions {
    inputPause: number;
    maxSuggestions: number;
    serverTimeout: number;
    minTextLength: number;
    maxRetries: number;
    showError?: boolean;
    callejero?: any;
    debug?: boolean;
    onReady?: () => void;
    afterServerRequest?: (suggesterName: string) => void;
    afterServerResponse?: (suggesterName: string) => void;
    afterAbort?: (suggesterName: string) => void;
}
export interface SuggesterConfig {
    name: string;
    options: Partial<SuggesterOptions>;
    class: new (name: string, options: SuggesterOptions) => Suggester;
}
export interface AutocompleterOptions {
    inputPause: number;
    maxSuggestions: number;
    serverTimeout: number;
    minTextLength: number;
    maxRetries: number;
    flushTimeout: number;
    suggesters: SuggesterConfig[];
    debug: boolean;
    texts: {
        nothingFound: string;
    };
    onReady?: () => void;
    afterServerRequest?: () => void;
    afterServerResponse?: () => void;
}
export interface AutocompleterCallbacks {
    onSuggestions?: (suggestions: Suggestion[], appendResults: boolean) => void;
    onCompleteSuggestions?: (suggestions: Suggestion[], appendResults: boolean) => void;
    onUpdate?: (state: GlobalState) => void;
    onError?: (error: string) => void;
    onMessage?: (message: {
        message: string;
        suggester: string;
    }) => void;
    onBufferResults?: (suggestions: Suggestion[]) => void;
}
export interface Suggestion {
    suggesterName: string;
    data: Direccion;
}
export interface GlobalState {
    currentText: string;
    suggesters: Array<{
        name: string;
        status: SuggesterStatus;
    }>;
    suggestions: Suggestion[];
    pendingRequests: number;
    waitingSuggesters: number;
}
export declare enum SuggesterStatus {
    DONE = "DONE",
    PENDING = "PENDING",
    INPUT_WAIT = "INPUT_WAIT"
}
export interface Suggester {
    name: string;
    status: SuggesterStatus;
    options: SuggesterOptions;
    inputTimer?: ReturnType<typeof setTimeout>;
    ready(): boolean;
    getSuggestions(text: string, callback: (results: Suggestion[], inputStr: string, suggesterName: string) => void, maxSuggestions: number): void;
    setOptions(options: Partial<SuggesterOptions>): void;
}
