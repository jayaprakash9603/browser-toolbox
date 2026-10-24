'use strict';

const webpack = require('webpack');
const base = require('./webpack.config.js');

const config = {...base};

config.entry = {...config.entry};
delete config.entry.background;
config.entry.main = './src/browserToolbox/main.js';
config.entry.hookSettingsInjector = './src/browserToolbox/hookSettingsInjector.js';

config.output = {
  ...config.output,
  publicPath: '/react-devtools/build/',
};

const defineIndex = config.plugins.findIndex(
  p => p && p.constructor && p.constructor.name === 'DefinePlugin',
);
if (defineIndex >= 0) {
  const prev = config.plugins[defineIndex];
  const defs = {...prev.definitions};
  defs['process.env.LOGGING_URL'] = null;
  config.plugins[defineIndex] = new webpack.DefinePlugin(defs);
}

module.exports = config;
