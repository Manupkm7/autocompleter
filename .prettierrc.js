module.exports = {
    // Configuración básica
    semi: true,
    singleQuote: true,
    trailingComma: 'es5',
    tabWidth: 2,
    useTabs: false,
    printWidth: 100,
  
    // Espaciado y formato
    bracketSpacing: true,
    bracketSameLine: false,
    arrowParens: 'always',
    endOfLine: 'auto',
  
    // JSX
    jsxSingleQuote: false,
    jsxBracketSameLine: false,
  
    // HTML y otros
    htmlWhitespaceSensitivity: 'css',
    embeddedLanguageFormatting: 'auto',
  
    // TypeScript
    quoteProps: 'as-needed',
    proseWrap: 'preserve',
  
    // Ordenamiento
    importOrder: ['^react', '^@/(.*)$', '^[./]'],
    importOrderSeparation: true,
    importOrderSortSpecifiers: true,
  
    // Configuración específica para archivos
    overrides: [
      {
        files: '*.{ts,tsx}',
        options: {
          parser: 'typescript',
        },
      },
      {
        files: '*.{js,jsx}',
        options: {
          parser: 'babel',
        },
      },
      {
        files: '*.json',
        options: {
          parser: 'json',
        },
      },
    ],
  };