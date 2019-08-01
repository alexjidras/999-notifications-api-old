require('dotenv').config();
require("@babel/register")({
	presets: [
	  "@babel/preset-env"
      ],
	  plugins: [
		"@babel/transform-runtime",
		"@babel/plugin-proposal-class-properties"
	]
});
require( "./lib/app" )