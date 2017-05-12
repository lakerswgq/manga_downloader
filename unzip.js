// let zlib = require("zlib");
let path = require("path");
let fs = require("fs");
let mkdirp = require("mkdirp");
let unzip = require("unzip");
let colors = require('colors');

function unzipFile (filepath, output) {
	output = output || 
		path.resolve(__dirname, "unzip/");
	let filename = path.basename(filepath, ".zip");
	output = path.join(output, filename);

	mkdirp.sync(output);

	// console.log("filename:", filename);
	// console.log("output:", output);

	let readStream = fs.createReadStream(filepath);
	// let writeStream = fs.createWriteStream(output);

	console.log("start to unzip file:".green, filename);

	readStream
		.pipe(unzip.Extract({ path: output }))
		.on("close", () => {
			console.log("unzip successfully:".blue, filename);
		});
	// .pipe(writeStream);
}


module.exports = unzipFile;
// unzipFile("test.zip")
