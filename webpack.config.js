const path = require('path');

module.exports = {
    context: __dirname,
    entry: path.resolve(__dirname, 'src/scripts/blueprint.js'),
    output: {
        library: 'BP3DJS',
        libraryTarget: 'umd',
        umdNamedDefine: true,
        path: path.resolve(__dirname, 'build/js'),
        filename: 'bp3djs.js',
        publicPath: '/build'
    },
    module: {
        rules: [{
                test: /(\\.jsx|\\.js)$/,
                loader: 'babel',
                exclude: /(node_modules|bower_components)/
            },
            {
                test: /(\\.jsx|\\.js)$/,
                loader: "eslint-loader",
                exclude: /node_modules/
            }
        ]
    },
    devServer: {
        contentBase: './build',
        port: 7700,
    }
}