import { Suggester } from './Suggester';
import { catastro_webservice_url } from '../config';

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
  afterAbort?: () => void;
  afterRetry?: () => void;
  afterServerRequest?: () => void;
  afterServerResponse?: () => void;
  onReady?: () => void;
}

interface CatastroResponse {
  smp?: string;
  coordenadas?: {
    x: string;
    y: string;
    srid: number;
  };
}

const defaults: CatastroOptions = {
  debug: false,
  serverTimeout: 5000,
  maxRetries: 5,
  maxSuggestions: 10,
};

export class SuggesterCatastro extends Suggester {
  private lastRequest: AbortController | null;

  constructor(name: string, options: Partial<CatastroOptions> = {}) {
    const mergedOptions = {
      ...defaults,
      ...options,
    };

    super(name, mergedOptions);
    this.lastRequest = null;
  }

  private async getCatastroData(codigo: string): Promise<CatastroResponse | undefined> {
    try {
      const response = await fetch(
        `${catastro_webservice_url}/parcela/?codigo=${encodeURIComponent(codigo)}&geocodificar=true&srid=4326`,
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

      return (await response.json()) as CatastroResponse;
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        console.log('Request was aborted');
      } else {
        console.error('Error fetching catastro data:', error);
      }
      return undefined;
    }
  }

  async getSuggestions(
    text: string,
    callback: (suggestions: CatastroSuggestion[], text: string, suggesterName: string) => void,
  ): Promise<void> {
    if (this.options.debug) {
      console.debug(`SuggesterCatastro.getSuggestions('${text}')`);
    }


    try {
      // Cancelar petición anterior si existe
      this.abort();

      // Crear nuevo AbortController para esta petición
      this.lastRequest = new AbortController();

      // Simular búsqueda de catastro (esto debería ser reemplazado por la implementación real)
      const resultados: CatastroData[] = [
        {
          codigo: text,
          descripcion: 'Parcela Catastral',
          tipo: 'CATASTRO',
        },
      ];

      const suggestions = await Promise.all(
        resultados.map(async (d) => {
          const suggestion: CatastroSuggestion = {
            title: d.codigo,
            subTitle: d.descripcion,
            type: d.tipo,
            category: d.tipo,
            suggesterName: this.name,
            data: d,
          };

          const catastroData = await this.getCatastroData(d.codigo);
          if (catastroData) {
            if (catastroData.smp) {
              suggestion.data.smp = catastroData.smp;
            }
            if (catastroData.coordenadas) {
              suggestion.data.coordenadas = {
                x: parseFloat(catastroData.coordenadas.x),
                y: parseFloat(catastroData.coordenadas.y),
                srid: catastroData.coordenadas.srid,
              };
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
        callback([error as CatastroSuggestion], text, this.name);
      }
    } finally {
      this.lastRequest = null;
    }
  }

  abort(): void {
    if (this.lastRequest) {
      this.lastRequest.abort();
      this.lastRequest = null;
      this.options.afterAbort?.();
    }
  }

  ready(): boolean {
    return true;
  }

  setOptions(options: Partial<CatastroOptions>): void {
    const mergedOptions = {
      ...this.options,
      ...options,
    };
    super.setOptions(mergedOptions);
  }
}
