// Aumentar el timeout para pruebas que puedan tomar más tiempo
jest.setTimeout(10000);

// Limpiar todos los mocks después de cada prueba
afterEach(() => {
  jest.clearAllMocks();
});

// Configuración global de expect
expect.extend({
  toBeWithinRange(received, floor, ceiling) {
    const pass = received >= floor && received <= ceiling;
    if (pass) {
      return {
        message: () =>
          `expected ${received} not to be within range ${floor} - ${ceiling}`,
        pass: true,
      };
    } else {
      return {
        message: () =>
          `expected ${received} to be within range ${floor} - ${ceiling}`,
        pass: false,
      };
    }
  },
});

// Silenciar console.warn y console.error durante las pruebas
global.console = {
  ...console,
  warn: jest.fn(),
  error: jest.fn(),
  log: jest.fn(),
}; 