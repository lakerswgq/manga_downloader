let fs = require("fs");
let path = require("path");
let request = require("request");
let Agent = require('socks5-http-client/lib/Agent');
let cheerio = require("cheerio");
let async = require("async");
let colors = require('colors/safe');
let mkdirp = require("mkdirp");

let unzipFile = require("./unzip.js");
const ids = require("./ids.js");

const readline = require('readline');
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

let concurrencyCount = 0;
const concurrentLimit = 5;

const downloadPath = "download/";
// socks proxy config
const proxyConfig = {
    agentClass: Agent,
    agentOptions: {
        socksHost: "localhost",
        socksPort: 1080
    }
};

// console color theme config
colors.setTheme({
    silly: 'rainbow',
    input: 'grey',
    verbose: 'cyan',
    prompt: 'grey',
    info: 'green',
    data: 'grey',
    help: 'cyan',
    warn: 'yellow',
    debug: 'blue',
    error: 'red'
});

function getFileUrl(id) {
    const urlTemplate = `http://www.wnacg.org/download-index-aid-${id}.html`;
    console.log("send request to", colors.grey(urlTemplate));
    return new Promise((resolve, reject) => {
        request(
            Object.assign(
                {
                    url: urlTemplate
                },
                proxyConfig
            )
        , function(err, res) {
            if (err) {
                // console.log("error:", err);
                reject(error);
                return;
            }
            let $ = cheerio.load(res.body);
            let fileUrl = $(".down_btn").eq(0).attr("href");
            // console.log(fileUrl)
            resolve(fileUrl);
        });
    })
}

function downloadFile (fileUrl, output) {
    output = output || "download";
	let name = fileUrl.slice(fileUrl.lastIndexOf('/') + 1);
	// console.log("file name:", name);

    mkdirp.sync(output);
    output = path.join(output, name);

	let file = fs.createWriteStream(output);

	return new Promise((resolve, reject) => {
		request(
            Object.assign({
                url: fileUrl
            }, proxyConfig)
        )
        .on("error", (error) => {
        	// console.log("error:",error)
        	reject(error);
        })
        .on("response", (res) => {
        	console.log(colors.yellow("start download:"), name);
        	// console.log("response:", res.headers['content-type'])
        })
        .pipe(file)

        file.on("finish", () => {
        	resolve({
                name, 
                output
            });
        })
        file.on("error", (error) => {
        	console.error(colors.error("fail to download:"), name);
        	reject(error);
        })
	})
}

function downloadBenzi(id, output, callback) {
	concurrencyCount++;
	console.log("now there are", colors.blue(concurrencyCount), "download tasks");

	getFileUrl(id)
	.then(fileUrl => {
		return downloadFile(fileUrl);
	})
	.then(({name: filename, output: filepath}) => {
		console.log(colors.green("download successfully:"), filename);
        // console.log("fileapath:", filepath);
		concurrencyCount--;
		callback(null, filepath);
	})
	.catch(error => {
		console.error(colors.error("got an error:"), error);

		concurrencyCount--;
		callback(null);
	})
}



async.mapLimit(ids, concurrentLimit, function (id, callback) {
	downloadBenzi(id, downloadPath, callback);
}, function (err, result){
	console.log(colors.inverse("all files downloaded!"));


    rl.question(colors.blue('do you unzip these files? (yes/no) '), (answer) => {
    // TODO: Log the answer in a database
    if (answer == "yes"){
        result.forEach((path) => {
            unzipFile(path);
        })
    }
    else {
        console.log("bye");
    }

    rl.close();
});

})

