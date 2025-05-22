/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
import { Suggester } from './Suggester';
import { NormalizerOptions, Normalizador, Direccion } from 'gcba-normalizador-typescript';
import { usig_webservice_url, catastro_webservice_url } from '../config';

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
  afterAbort?: (suggesterName: string) => void;
  afterRetry?: (suggesterName: string) => void;
  afterServerRequest?: (suggesterName: string) => void;
  afterServerResponse?: (suggesterName: string) => void;
  onReady?: () => void;
}

interface NormalizadorResponse {
  direccionesNormalizadas?: Array<{
    coordenadas?: {
      x: string;
      y: string;
      srid: number;
    };
  }>;
}

interface CatastroResponse {
  smp?: string;
}

const defaults: DireccionOptions = {
  debug: false,
  serverTimeout: 5000,
  maxRetries: 5,
  maxSuggestions: 10,
  acceptSN: true,
  callesEnMinusculas: true,
  ignorarTextoSobrante: false
};

const convertToDireccionSuggestion = (d: Direccion): DireccionSuggestion => ({
  title: d.nombre,
  subTitle: 'CABA',
  type: d.tipo,
  category: d.tipo,
  suggesterName: 'Direcciones',
  data: {
    ...d,
    coordenadas: d.coordenadas
      ? {
          x: parseFloat(d.coordenadas.x),
          y: parseFloat(d.coordenadas.y),
          srid: d.coordenadas.srid
        }
      : undefined
  }
});

export class SuggesterDirecciones extends Suggester {
  private normalizadorDirecciones: Normalizador;
  private lastRequest: AbortController | null;

  constructor(name: string, options: Partial<DireccionOptions> = {}) {
    const mergedOptions = {
      ...defaults,
      ...options
    };

    super(name, mergedOptions);

    if (!options.normalizadorDirecciones && !Normalizador.inicializado()) {
      Normalizador.init(mergedOptions);
    }
    this.normalizadorDirecciones = options.normalizadorDirecciones
      ? new options.normalizadorDirecciones(mergedOptions)
      : new Normalizador(mergedOptions);
    this.lastRequest = null;
  }

  private async getLatLng2(lugar: DireccionData): Promise<Coordenadas | undefined> {
    try {
      const response = await fetch(
        `${usig_webservice_url}/normalizar/?direccion=${encodeURIComponent(
          lugar.nombre
        )},${encodeURIComponent(lugar.descripcion)}&geocodificar=true&srid=4326`,
        {
          signal: this.lastRequest?.signal,
          headers: {
            Accept: 'application/json'
          }
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const json = (await response.json()) as NormalizadorResponse;

      if (json.direccionesNormalizadas?.[0]?.coordenadas) {
        const coords = json.direccionesNormalizadas[0].coordenadas;
        return {
          x: parseFloat(coords.x),
          y: parseFloat(coords.y),
          srid: coords.srid
        };
      }
      return undefined;
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        console.debug('Request was aborted');
      } else {
        console.error('Error fetching coordinates:', error);
      }
      return undefined;
    }
  }

  private async getLatLng3(lugar: DireccionData): Promise<string | undefined> {
    try {
      const codigo = lugar.codigo || lugar.calle?.codigo;
      if (!codigo || !lugar.altura) {
        return undefined;
      }

      const response = await fetch(
        `${catastro_webservice_url}/parcela/?codigo_calle=${encodeURIComponent(
          codigo
        )}&altura=${encodeURIComponent(lugar.altura)}&geocodificar=true&srid=4326`,
        {
          signal: this.lastRequest?.signal,
          headers: {
            Accept: 'application/json'
          }
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const json = (await response.json()) as CatastroResponse;
      return json.smp;
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
    callback: (suggestions: DireccionSuggestion[], text: string, suggesterName: string) => void,
    maxSuggestions?: number
  ): Promise<void> {
    if (this.options.debug) {
      console.log(`SuggesterDirecciones.getSuggestions('${text}')`);
    }

    const maxSug = maxSuggestions ?? this.options.maxSuggestions;

    try {
      // Cancelar petición anterior si existe
      this.abort();

      // Crear nuevo AbortController para esta petición
      this.lastRequest = new AbortController();

      const dirs = this.normalizadorDirecciones.normalizar(text, maxSug);

      const suggestions = await Promise.all(
        dirs.map(async (d: any) => {
          const suggestion = convertToDireccionSuggestion(d);
          const [coordenadas, smp] = await Promise.all([
            this.getLatLng2(suggestion.data),
            this.getLatLng3(suggestion.data)
          ]);
          if (coordenadas) {
            suggestion.data.coordenadas = coordenadas;
          }
          if (smp) {
            suggestion.data.smp = smp;
          }
          return suggestion;
        })
      );

      callback(suggestions, text, this.name);
    } catch (error) {
      if (this.options.ignorarTextoSobrante) {
        try {
          const opciones = this.normalizadorDirecciones.buscarDireccion(text);
          if (opciones !== false) {
            const dirs = [opciones.match].map(convertToDireccionSuggestion);
            callback(dirs, text, this.name);
          } else {
            if (error instanceof Error && 'id' in error && error.id === 0) {
              callback([], text, this.name);
            } else {
              callback([error as DireccionSuggestion], text, this.name);
            }
          }
        } catch (innerError) {
          callback([innerError as DireccionSuggestion], text, this.name);
        }
      } else {
        if (error instanceof Error && 'id' in error && error.id === 0) {
          callback([], text, this.name);
        } else {
          callback([error as DireccionSuggestion], text, this.name);
        }
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
    return Boolean(this.normalizadorDirecciones && Normalizador.inicializado());
  }

  setOptions(options: Partial<DireccionOptions>): void {
    const mergedOptions = {
      ...this.options,
      ...options
    };
    super.setOptions(mergedOptions);
  }
}
