export enum SuggesterStatus {
  DONE = 'done',
  PENDING = 'pending',
  ERROR = 'error',
  INPUT_WAIT = 'input_wait'
}

export interface SuggesterOptions {
  afterAbort?: (suggesterName: string) => void;
  afterRetry?: (suggesterName: string) => void;
  afterServerRequest?: (suggesterName: string) => void;
  afterServerResponse?: (suggesterName: string) => void;
  inputPause: number;
  minTextLength: number;
} 