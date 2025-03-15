const path = require('path');

module.exports = {
  entry: './src/app.ts',
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: 'ts-loader',
        exclude: /node_modules/,
      },
    ],
  },
  resolve: {
    extensions: ['.tsx', '.ts', '.js'],
  },
  output: {
    filename: 'bundle.js',
    path: path.resolve(__dirname, 'dist'),
  },
  devServer: {
    static: [
      {
        directory: path.join(__dirname, './'),
        publicPath: '/'
      },
      {
        directory: path.join(__dirname, './public'),
        publicPath: '/'
      }
    ],
    compress: true,
    port: 9000,
    devMiddleware: {
      publicPath: '/dist/'
    }
  }
};