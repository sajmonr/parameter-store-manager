// Entry for `npm run start-main-dev`. Requiring the Babel-compiled main process
// from a CommonJS file keeps newer Electron from loading it as an ES module,
// which would skip @babel/register.
require('@babel/register');
require('../../app/main.dev');
