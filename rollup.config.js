import babel from 'rollup-plugin-babel';
import resolve from 'rollup-plugin-node-resolve';
import eslint from 'rollup-plugin-eslint';
//import uglify from 'rollup-plugin-uglify';
import uglify from 'rollup-plugin-uglify-es';
import replace from 'rollup-plugin-replace';
import postcss from 'rollup-plugin-postcss';
import serve from 'rollup-plugin-serve'
import cssnano from 'cssnano';
import commonjs from 'rollup-plugin-commonjs'

var isProduction = process.env.NODE_ENV === 'production';
var cache;

export default {
  input: 'src/scripts/blueprint.js',
  output:{name: 'BP3DJS',file: (isProduction)?'build/js/bp3djs.min.js': 'build/js/bp3djs.js',format: 'iife',sourceMap: true, },
  cache: cache,
  treeshake: true,
  plugins: [
      // (!isProduction && serve('build')),
      (serve('build')),
      resolve({jsnext: true,main: true,browser: true,}),
      babel({exclude: ['node_modules/**', 'src/styles/**']}),
      eslint({exclude: ['src/styles/**',]}),
      commonjs({
      include: [
        'node_modules/jquery/**',
        'node_modules/es6-enum/**',
        'node_modules/three/**',
        'node_modules/three-gltf-loader/**',
        'node_modules/three-gltf-exporter/**',
        'node_modules/three-reflector2/**',
        'node_modules/@calvinscofield/three-objloader/**',
        'node_modules/bezier-js/**',
        'node_modules/@thi.ng/**',
      ]
    }),
      postcss({extensions: [ '.css' ],plugins: [cssnano()]}),
      replace({exclude: 'node_modules/**',  ENV: JSON.stringify(process.env.NODE_ENV || 'development')}), (isProduction && uglify()),
  ]
};

//~ include: [
        //~ 'node_modules/jquery/**',
        //~ 'node_modules/es6-enum/**',
        //~ 'node_modules/three/**',
        //~ 'node_modules/three-gltf-loader/**',
      //~ ],
