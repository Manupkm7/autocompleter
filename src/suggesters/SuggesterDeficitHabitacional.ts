import { Suggester } from './Suggester';
import { deficit_habitacional_webservice_url } from '../config';

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
  afterAbort?: (suggesterName: string) => void;
  afterRetry?: (suggesterName: string) => void;
  afterServerRequest?: (suggesterName: string) => void;
  afterServerResponse?: (suggesterName: string) => void;
  onReady?: () => void;
}

interface DeficitResponse {
  coordenadas?: {
    x: string;
    y: string;
    srid: number;
  };
  deficit?: {
    total: number;
    cuantitativo: number;
    cualitativo: number;
  };
}

const defaults: DeficitOptions = {
  debug: false,
  serverTimeout: 5000,
  maxRetries: 5,
  maxSuggestions: 10,
};

export class SuggesterDeficitHabitacional extends Suggester {
  private lastRequest: AbortController | null;

  constructor(name: string, options: Partial<DeficitOptions> = {}) {
    const mergedOptions = {
      ...defaults,
      ...options,
    };

    super(name, mergedOptions);
    this.lastRequest = null;
  }

  private async getDeficitData(codigo: string): Promise<DeficitResponse | undefined> {
    try {
      const response = await fetch(
        `${deficit_habitacional_webservice_url}/deficit/?codigo=${encodeURIComponent(codigo)}&geocodificar=true&srid=4326`,
        {
          signal: this.lastRequest?.signal,
          headers: {
            Accept: 'application/json',
          },
        },
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return (await response.json()) as DeficitResponse;
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        console.debug('Request was aborted');
      } else {
        console.error('Error fetching deficit data:', error);
      }
      return undefined;
    }
  }

  async getSuggestions(
    text: string,
    callback: (suggestions: DeficitSuggestion[], text: string, suggesterName: string) => void  ): Promise<void> {
    if (this.options.debug) {
      console.debug(`SuggesterDeficitHabitacional.getSuggestions('${text}')`);
    }

    try {
      // Cancelar petición anterior si existe
      this.abort();

      // Crear nuevo AbortController para esta petición
      this.lastRequest = new AbortController();

      // Simular búsqueda de déficit (esto debería ser reemplazado por la implementación real)
      const resultados: DeficitData[] = [
        {
          codigo: text,
          descripcion: 'Área de Déficit Habitacional',
          tipo: 'DEFICIT',
        },
      ];

      const suggestions = await Promise.all(
        resultados.map(async (d) => {
          const suggestion: DeficitSuggestion = {
            title: d.codigo,
            subTitle: d.descripcion,
            type: d.tipo,
            category: d.tipo,
            suggesterName: this.name,
            data: d,
          };

          const deficitData = await this.getDeficitData(d.codigo);
          if (deficitData) {
            if (deficitData.coordenadas) {
              suggestion.data.coordenadas = {
                x: parseFloat(deficitData.coordenadas.x),
                y: parseFloat(deficitData.coordenadas.y),
                srid: deficitData.coordenadas.srid,
              };
            }
            if (deficitData.deficit) {
              suggestion.data.deficit = deficitData.deficit;
            }
          }

          return suggestion;
        }),
      );

      callback(suggestions, text, this.name);
    } catch (error) {
      if (error instanceof Error && 'id' in error && error.id === 0) {
        callback([], text, this.name);
      } else {
        callback([error as DeficitSuggestion], text, this.name);
      }
    } finally {
      this.lastRequest = null;
    }
  }

  abort(): void {
    if (this.lastRequest) {
      this.lastRequest.abort();
      this.lastRequest = null;
      this.options.afterAbort?.(this.name);
    }
  }

  ready(): boolean {
    return true;
  }

  setOptions(options: Partial<DeficitOptions>): void {
    const mergedOptions = {
      ...this.options,
      ...options,
    };
    super.setOptions(mergedOptions);
  }
}
