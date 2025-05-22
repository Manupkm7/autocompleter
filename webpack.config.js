/* global __dirname, require, module*/

const path = require('path');
const TerserPlugin = require('terser-webpack-plugin');
const { CleanWebpackPlugin } = require('clean-webpack-plugin');
const ForkTsCheckerWebpackPlugin = require('fork-ts-checker-webpack-plugin');

module.exports = (env, argv) => {
  const isProduction = argv.mode === 'production';

  return {
    entry: './src/Autocompleter.ts',
    target: ['web', 'es2020'],
    mode: isProduction ? 'production' : 'development',
    devtool: isProduction ? 'source-map' : 'eval-source-map',
    output: {
      path: path.resolve(__dirname, 'dist'),
      filename: isProduction ? 'Autocompleter.min.js' : 'Autocompleter.js',
      library: {
        name: 'Autocompleter',
        type: 'umd',
        export: 'default',
        umdNamedDefine: true
      },
      globalObject: 'this'
    },
    resolve: {
      extensions: ['.ts', '.tsx', '.js', '.jsx', '.json'],
      alias: {
        '@': path.resolve(__dirname, 'src')
      }
    },
    module: {
      rules: [
        {
          test: /\.(ts|tsx)$/,
          exclude: /node_modules/,
          use: [
            {
              loader: 'ts-loader',
              options: {
                transpileOnly: true,
                configFile: path.resolve(__dirname, 'tsconfig.json')
              }
            }
          ]
        }
      ]
    },
    optimization: {
      minimize: isProduction,
      minimizer: [
        new TerserPlugin({
          terserOptions: {
            format: {
              comments: false
            },
            compress: {
              drop_console: isProduction,
              drop_debugger: isProduction
            }
          },
          extractComments: false
        })
      ]
    },
    plugins: [
      new CleanWebpackPlugin({
        cleanOnceBeforeBuildPatterns: ['dist/**/*']
      }),
      new ForkTsCheckerWebpackPlugin({
        typescript: {
          configFile: path.resolve(__dirname, 'tsconfig.json'),
          memoryLimit: 4096,
          mode: 'write-references'
        }
      })
    ],
    devServer: {
      static: {
        directory: path.join(__dirname, 'demo')
      },
      compress: true,
      port: 9000,
      hot: true,
      open: true,
      client: {
        overlay: {
          errors: true,
          warnings: false
        }
      }
    },
    performance: {
      hints: isProduction ? 'warning' : false,
      maxEntrypointSize: 512000,
      maxAssetSize: 512000
    },
    stats: {
      colors: true,
      modules: true,
      reasons: true,
      errorDetails: true
    }
  };
};
