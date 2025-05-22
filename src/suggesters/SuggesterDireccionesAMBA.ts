/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { Suggester } from './Suggester';
import { NormalizadorAMBA } from 'gcba-normalizador-typescript';
import { usig_webservice_url } from '../config';

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
  normalizadorAMBA?: any; // Tipo específico del normalizador
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

const defaults: DireccionAMBAOptions = {
  debug: false,
  serverTimeout: 30000,
  maxRetries: 1,
  maxSuggestions: 10,
  searchOptions: {
    acceptSN: true,
    callesEnMinusculas: false,
    ignorarTextoSobrante: true,
  },
};

export class SuggesterDireccionesAMBA extends Suggester {
  private normalizadorAMBA: any; // Tipo específico del normalizador
  private lastRequest: AbortController | null;

  constructor(name: string, options: Partial<DireccionAMBAOptions> = {}) {
    const mergedOptions = {
      ...defaults,
      ...options,
      searchOptions: {
        ...defaults.searchOptions,
        ...(options.searchOptions || {}),
      },
    };

    super(name, mergedOptions);

    this.normalizadorAMBA = options.normalizadorAMBA || NormalizadorAMBA.init({});
    this.lastRequest = null;
  }

  private async getLatLng2(lugar: DireccionData): Promise<Coordenadas | undefined> {
    try {
      const response = await fetch(
        `${usig_webservice_url}/normalizar/?direccion=${encodeURIComponent(lugar.nombre)}, ${encodeURIComponent(lugar.descripcion.split(',', 2)[0])}&geocodificar=true&srid=4326`,
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

      const json = await response.json();

      if (json.direccionesNormalizadas?.[0]?.coordenadas) {
        const coords = json.direccionesNormalizadas[0].coordenadas;
        return {
          x: parseFloat(coords.x),
          y: parseFloat(coords.y),
          srid: coords.srid,
        };
      }
      return undefined;
    } catch (error: unknown) {
      if (error instanceof Error && error.name === 'AbortError') {
        console.error('Request was aborted');
      } else {
        console.error('Error fetching coordinates:', error);
      }
      return undefined;
    }
  }

  async getSuggestions(
    text: string,
    callback: (suggestions: DireccionSuggestion[], text: string, suggesterName: string) => void,
    maxSuggestions?: number,
  ): Promise<void> {
    const maxSug = maxSuggestions ?? this.options.maxSuggestions;

    try {
      // Cancelar petición anterior si existe
      this.abort();

      // Crear nuevo AbortController para esta petición
      this.lastRequest = new AbortController();

      const results = await new Promise<any[]>((resolve, reject) => {
        this.normalizadorAMBA.buscar(
          text,
          (results: any[]) => resolve(results),
          (error: Error) => reject(error),
          maxSug,
        );
      });

      const suggestions = await Promise.all(
        results.map(async (d) => {
          const suggestion: DireccionSuggestion = {
            title: d.nombre,
            subTitle: d.descripcion,
            type: d.tipo,
            category: d.tipo,
            suggesterName: this.name,
            data: d,
          };

          if (d.tipo === 'DIRECCION') {
            const coordenadas = await this.getLatLng2(d);
            if (coordenadas) {
              suggestion.data.coordenadas = coordenadas;
            }
          }

          return suggestion;
        }),
      );

      callback(suggestions, text, this.name);
    } catch (error) {
      console.error('Error getting suggestions:', error);
      callback([], text, this.name);
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

  setOptions(options: Partial<DireccionAMBAOptions>): void {
    const mergedOptions = {
      ...this.options,
      ...options,
      searchOptions: {
        ...(this.options as DireccionAMBAOptions).searchOptions,
        ...(options.searchOptions || {}),
      },
    };
    super.setOptions(mergedOptions);
  }
}
