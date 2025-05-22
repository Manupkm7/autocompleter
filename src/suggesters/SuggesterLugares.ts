/* eslint-disable @typescript-eslint/no-base-to-string */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/ban-ts-comment */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { Suggester } from './Suggester';
import { places_webservice_url } from '../config';
import URI from 'urijs';

interface LugarSuggestion {
  title: string;
  subTitle: string;
  type: string;
  idEpok: string;
  suggesterName: string;
  data: LugarData;
}

interface LugarData {
  id: string;
  nombre: string;
  clase: string;
  coordenadas?: Coordenadas;
  [key: string]: any; // Para otros campos que pueda tener el lugar
}

interface Coordenadas {
  x: number;
  y: number;
  srid: number;
}

interface SearchOptions {
  start: number;
  limit: number;
  tipoBusqueda: string;
  categoria?: string;
  clase?: string;
  bbox: boolean;
  extent?: string;
  returnRawData: boolean;
  totalFull?: boolean;
}

interface LugarOptions {
  debug: boolean;
  serverTimeout: number;
  maxRetries: number;
  maxSuggestions: number;
  server: string;
  searchOptions: SearchOptions;
  afterAbort?: (suggesterName: string) => void;
  afterRetry?: (suggesterName: string) => void;
  afterServerRequest?: (suggesterName: string) => void;
  afterServerResponse?: (suggesterName: string) => void;
  onReady?: () => void;
}

interface LugarResponse {
  instancias: Array<{
    id: string;
    nombre: string;
    clase: string;
    [key: string]: any;
  }>;
}

interface UbicacionResponse {
  ubicacion?: {
    centroide: string;
  };
}

const defaults: LugarOptions = {
  debug: false,
  serverTimeout: 30000,
  maxRetries: 1,
  maxSuggestions: 10,
  server: 'https://epok.buenosaires.gob.ar/buscar/',
  searchOptions: {
    start: 0,
    limit: 20,
    tipoBusqueda: 'ranking',
    categoria: undefined,
    clase: undefined,
    bbox: false,
    extent: undefined,
    returnRawData: false,
  },
};

export class SuggesterLugares extends Suggester {
  private lastRequest: AbortController | undefined;

  constructor(name: string, options: Partial<LugarOptions> = {}) {
    const mergedOptions = {
      ...defaults,
      ...options,
      searchOptions: {
        ...defaults.searchOptions,
        ...(options.searchOptions || {}),
      },
    };

    super(name, mergedOptions);
    this.lastRequest = undefined;
  }

  private async getLatLng2(lugar: LugarData): Promise<Coordenadas | undefined> {
    try {
      const response = await fetch(
        `${places_webservice_url}/?&id=${encodeURIComponent(lugar.id)}&geocodificar=true&srid=4326`,
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

      const json = (await response.json()) as UbicacionResponse;

      if (json.ubicacion?.centroide) {
        const [x, y] = json.ubicacion.centroide
          .replace('(', '')
          .replace(')', '')
          .split(' ')
          .map(parseFloat);

        return {
          x,
          y,
          srid: 4326,
        };
      }
      return undefined;
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        console.error('Request was aborted');
      } else {
        console.error('Error fetching location:', error);
      }
      return undefined;
    }
  }

  async getSuggestions(
    text: string,
    callback: (suggestions: LugarSuggestion[], text: string, suggesterName: string) => void,
  ): Promise<void> {
    if (this.options.debug) {
      console.debug(`SuggesterLugares.getSuggestions('${text}')`);
    }

    try {
      // Cancelar petición anterior si existe
      this.abort();

      // Crear nuevo AbortController para esta petición
      this.lastRequest = new AbortController();

      const searchParams = {
        start: this.options.searchOptions.start,
        limit: this.options.searchOptions.limit,
        texto: text,
        tipo: this.options.searchOptions.tipoBusqueda,
        totalFull: this.options.searchOptions.totalFull,
      };
      // @ts-ignore
      const url = URI(this.options.server).search(searchParams).toString();
      // @ts-ignore @typescript-eslint/no-unsafe-argument
      const response = await fetch(url, {
        signal: this.lastRequest.signal,
        headers: {
          Accept: 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const json = (await response.json()) as LugarResponse;

      const suggestions = await Promise.all(
        json.instancias.map(async (d) => {
          const suggestion: LugarSuggestion = {
            title: d.nombre,
            subTitle: d.clase,
            type: 'LUGAR',
            idEpok: d.id,
            suggesterName: this.name,
            data: d,
          };

          const coordenadas = await this.getLatLng2(d);
          if (coordenadas) {
            suggestion.data.coordenadas = coordenadas;
          }

          return suggestion;
        }),
      );

      callback(suggestions, text, this.name);
    } catch (error) {
      if (error instanceof Error && 'id' in error && error.id === 0) {
        callback([], text, this.name);
      } else {
        callback([error as LugarSuggestion], text, this.name);
      }
    } finally {
      this.lastRequest = undefined;
    }
  }

  abort(): void {
    if (this.lastRequest) {
      this.lastRequest.abort();
      this.lastRequest = undefined;
      this.options.afterAbort?.(this.name);
    }
  }

  ready(): boolean {
    return true;
  }

  setOptions(options: Partial<LugarOptions>): void {
    const mergedOptions = {
      ...this.options,
      ...options,
      searchOptions: {
        ...(this.options as unknown as LugarOptions).searchOptions,
        ...(options.searchOptions || {}),
      },
    };
    super.setOptions(mergedOptions);
  }
}
