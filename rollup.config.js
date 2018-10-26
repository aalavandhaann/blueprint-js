// Rollup plugins
import babel from 'rollup-plugin-babel';
import eslint from 'rollup-plugin-eslint';
import resolve from 'rollup-plugin-node-resolve';
import commonjs from 'rollup-plugin-commonjs';
import replace from 'rollup-plugin-replace';
import uglify from 'rollup-plugin-uglify';
import postcss from 'rollup-plugin-postcss';

// PostCSS plugins
import simplevars from 'postcss-simple-vars';
import nested from 'postcss-nested';
import cssnext from 'postcss-cssnext';
import cssnano from 'cssnano';

import serve from 'rollup-plugin-serve';
//The tutorial has some attributes for below export default in depreciation. Use the output attribute for file out and sourceMap
export default {
  input: 'src/scripts/blueprint.js',
  plugins: [
    postcss({
      plugins: [
        simplevars(),
        nested(),
        cssnext({ warnForDuplicates: false, }),
        cssnano()        
      ],
      extensions: [ '.css' ],
    }),
    resolve({
      jsnext: true,
      main: true,
      browser: true,
    }),
    commonjs(),
    eslint({
      exclude: [
        'src/styles/**',
      ]
    }),
    babel({
      exclude: 'node_modules/**',
    }),
    replace({
      exclude: 'node_modules/**',
      ENV: JSON.stringify(process.env.NODE_ENV || 'development'),
    }),
    (process.env.NODE_ENV === 'production' && uglify()),
  ],
  output:
	  {
		  name: 'BP3DJS',
		  file: 'build/js/bp3djs.min.js',
		  format: 'iife',
//		  sourceMap: 'inline',
	  }
};

//Use command "NODE_ENV=production rollup -c" to produce the minified and uglified version of the code
//Otherwise just use "rollup -c" to produce the library for development environment
