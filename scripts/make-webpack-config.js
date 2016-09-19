/* eslint-disable no-console */

const path = require('path');
const webpack = require('webpack');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const merge = require('webpack-merge');
const prettyjson = require('prettyjson');

const sourceDir = path.resolve(__dirname, '../src');
const codeMirrorPath = getPackagePath('codemirror');

/**
 * Return npm package path.
 * In npm2 works only with packages required directly by this package.
 *
 * @param {string} packageName Package name.
 * @return {string}
 */
function getPackagePath(packageName) {
	// We resolve package.json because otherwise path.resolve returns main module path
	return path.dirname(require.resolve(packageName + '/package.json'));
}

function validateWebpackConfig(webpackConfig) {
	webpackConfig.module.loaders.forEach(loader => {
		if (!loader.include && !loader.exclude) {
			throw Error('Styleguidist: "include" option is missing for ' + loader.test + ' Webpack loader.');
		}
	});
}

module.exports = function(config, env) {
	process.env.NODE_ENV = process.env.BABEL_ENV = env;

	let webpackConfig = {
		output: {
			path: config.styleguideDir,
			filename: 'build/bundle.js',
		},
		resolve: {
			extensions: ['', '.js', '.jsx'],
			// Webpack 1
			root: sourceDir,
			moduleDirectories: [
				path.resolve(__dirname, '../node_modules'),
				'node_modules',
			],
			// Webpack 2
			modules: [
				sourceDir,
				path.resolve(__dirname, '../node_modules'),
				'node_modules',
			],
			alias: {
				codemirror: codeMirrorPath,
			},
		},
		resolveLoader: {
			// Webpack 1
			modulesDirectories: [
				path.resolve(__dirname, '../loaders'),
				path.resolve(__dirname, '../node_modules'),
				'node_modules',
			],
			// Webpack 2
			modules: [
				path.resolve(__dirname, '../loaders'),
				path.resolve(__dirname, '../node_modules'),
				'node_modules',
			],
			moduleExtensions: ['-loader', '.loader'],
		},
		plugins: [
			new HtmlWebpackPlugin({
				title: config.title,
				template: config.template,
				inject: true,
			}),
			new webpack.DefinePlugin({
				'process.env': {
					NODE_ENV: JSON.stringify(env),
				},
			}),
		],
		module: {
			loaders: [
				{
					// TODO: remove this when entities module is fixed (https://github.com/fb55/entities/pull/26)
					test: /node_modules[/\\]entities[/\\].*\.json$/,
					include: /node_modules/,
					loader: 'json',
				},
				{
					test: /\.css$/,
					include: [
						codeMirrorPath,
						getPackagePath('highlight.js'),
					],
					loader: 'style!css',
				},
				{
					test: /\.css$/,
					include: sourceDir,
					loader: 'style!css?modules&importLoaders=1&localIdentName=ReactStyleguidist-[name]__[local]',
				},
			],
			noParse: [
				/babel-standalone/,
			],
		},
	};

	const entryScript = path.resolve(sourceDir, 'index');

	if (env === 'production') {
		webpackConfig = merge(webpackConfig, {
			entry: [
				entryScript,
			],
			devtool: false,
			debug: false,
			cache: false,
			plugins: [
				new webpack.optimize.OccurrenceOrderPlugin(),
				new webpack.optimize.DedupePlugin(),
				new webpack.optimize.UglifyJsPlugin({
					compress: {
						warnings: false,
					},
					output: {
						comments: false,
					},
					mangle: false,
				}),
			],
			module: {
				loaders: [
					{
						test: /\.jsx?$/,
						include: sourceDir,
						loader: 'babel',
						query: {
							babelrc: false,
							presets: ['es2015', 'react', 'stage-0'],
						},
					},
				],
			},
		});
	}
	else {
		webpackConfig = merge(webpackConfig, {
			entry: [
				'webpack-hot-middleware/client',
				entryScript,
			],
			debug: true,
			cache: true,
			devtool: 'eval',
			stats: {
				colors: true,
				reasons: true,
			},

			plugins: [
				new webpack.HotModuleReplacementPlugin(),
				new webpack.NoErrorsPlugin(),
			],
			module: {
				loaders: [
					{
						test: /\.jsx?$/,
						include: sourceDir,
						loader: 'babel',
						query: {
							babelrc: false,
							presets: ['es2015', 'react', 'stage-0', 'react-hmre'],
						},
					},
				],
			},
		});
	}

	if (config.updateWebpackConfig) {
		webpackConfig = config.updateWebpackConfig(webpackConfig, env);
		validateWebpackConfig(webpackConfig);
	}

	if (config.verbose) {
		console.log();
		console.log('Using Webpack config:');
		console.log(prettyjson.render(webpackConfig));
		console.log();
	}

	return webpackConfig;
};
