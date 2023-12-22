/* global require, __dirname, module */
const webpack = require( 'webpack' ); // to access built-in plugins
const path = require( 'path' );
const { CleanWebpackPlugin } = require( 'clean-webpack-plugin' );
const MiniCssExtractPlugin = require( 'mini-css-extract-plugin' );
const CssMinimizerPlugin = require( 'css-minimizer-webpack-plugin' );

module.exports = {
	mode: 'none', //development | production
	watch: false,
	entry: {
		admin: [
			'./src/admin/index.js',
			'./src/admin/sass/accessibility-checker-admin.scss',
		],
		editorApp: [
			'./src/editorApp/index.js',
		],
		frontendHighlighterApp: [
			'./src/frontendHighlighterApp/index.js',
			'./src/frontendHighlighterApp/sass/app.scss',
		],
		pageScanner: [
			'./src/pageScanner/index.js',
		],
	},

	output: {
		filename: '[name].bundle.js',
		path: path.resolve( __dirname, 'build' ),
	},

	module: {
		rules: [
			{
				test: /\.(js|jsx)$/,
				exclude: /node_modules/,
				use: [ 'babel-loader' ],
			},
			{
				test: /\.(s(a|c)ss)$/,
				use: [
					MiniCssExtractPlugin.loader,
					'css-loader',
					'sass-loader',
				],
			},
			// loader for images and icons (required if css references image files)
			{
				test: /\.(svg|png|jpg|gif)$/,
				type: 'asset/resource',
				generator: {
					filename: './img/[name][ext]',
				},
			},
		],
	},
	plugins: [
		new webpack.ProgressPlugin(),
		new CleanWebpackPlugin(),
		new MiniCssExtractPlugin( {
			filename: './css/[name].css',
		} ),
		new CssMinimizerPlugin(),
	],
};
