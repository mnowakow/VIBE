const path = require('path');
const webpack = require('webpack');

const nodeEnv = process.env.NODE_ENV || 'development';
const isDev = (nodeEnv !== 'production');

const config = {
  mode: nodeEnv,
  entry: {
    dist: "./src/scripts/js/entry.js",
  },
  output: {
    filename: 'vibe-editor.js',
    path: path.resolve(__dirname, './dist'),
    library: 'VibeEditor',
    libraryTarget: 'umd'
  },
  module: {
    rules: [
      {
        test: /\.(woff|woff2|eot|ttf|otf)$/,
        loader: "file-loader"
      },
      {
        test: /\.js/,
        loader: 'babel-loader'
      },
      {
        test: /\.css$/,
        use: ['style-loader', 'css-loader'],
      },
      {
        test: /\.svg$/,
        use: [{
          loader: 'url-loader',
          options: {
            limit: false,
          },
        }
        ],
      }
    ]
  },
  stats: {
    colors: true
  }
};

module.exports = config;
