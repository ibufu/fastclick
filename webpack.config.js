const path = require('path')
const webpack = require('webpack')

module.exports = {
  mode: 'production',
  entry: {
    'fastclick': './lib/fastclick.ts',
  },
  module: {
    rules: [{
      test: /\.tsx?$/,
      use: 'ts-loader',
      exclude: /node_modules/
    }]
  },
  resolve: {
    extensions: [ '.tsx', '.ts', '.js' ]
  },
  output: {
    filename: '[name].js',
    library: 'FastClick',
    libraryTarget: 'umd',
    libraryExport: 'default',
    path: path.resolve(__dirname, 'dist')
  },
  optimization: {
    minimize: true,
  },
}