declare module '@usig-gcba/normalizador' {
  export interface NormalizadorOptions {
    debug?: boolean;
    serverTimeout?: number;
    maxRetries?: number;
    maxSuggestions?: number;
    acceptSN?: boolean;
    callesEnMinusculas?: boolean;
    ignorarTextoSobrante?: boolean;
  }

  export interface DireccionNormalizada {
    nombre: string;
    descripcion: string;
    tipo: string;
    codigo?: string;
    altura?: string;
    calle?: {
      codigo: string;
      nombre: string;
    };
    coordenadas?: {
      x: string;
      y: string;
      srid: number;
    };
  }

  export interface BusquedaResultado {
    match: DireccionNormalizada;
    score: number;
  }

  export class Normalizador {
    constructor(options?: NormalizadorOptions);
    normalizar(texto: string, maxSugerencias?: number): DireccionNormalizada[];
    buscarDireccion(texto: string): BusquedaResultado | false;
    static inicializado(): boolean;
    static init(options: NormalizadorOptions): void;
  }

  export class NormalizadorAMBA extends Normalizador {
    static init(options: NormalizadorOptions): void;
    buscar(
      texto: string,
      onSuccess: (results: DireccionNormalizada[]) => void,
      onError: (error: Error) => void,
      maxSugerencias?: number
    ): void;
  }
} 