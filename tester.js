// const util = require('node:util')
// const { useBrahma, startServer } = require('./reinforcements/brahma');
// const { parseFile } = require('./reinforcements');
// const fs = require('node:fs/promises')
// let dump = (obj) => util.inspect(obj, true, null, true)

// useBrahma((req) => {

//     // lets check and debub 
//     // console.log(dump(req))
//     if (req.path === "/hi") {
//         let summa = parseFile('./ReadMe.md')
//         let summa2 = fs.readFile('./ReadMe.md', 'utf8')
//         return {
//             headers: { "Content-Type": "application/json", "test":"demo" },
//             status: 300,
//             body: JSON.stringify({ message: "Hello from /hi!", summa2 })
//         };
//     }

//     if (req.path === "/bye") {
//         return {
//             headers: { "Content-Type": "text/html" },
//             status: 201,
//             body: `<h1>Goodbye!</h1>`
//         };
//     }


//     return {
//         status: 404,
//         body: "Route not found"
//     };
// });

// startServer("0.0.0.0", 10000).then(() => {
//     console.log("🌀 Brahma-JS server running at http://localhost:3000");
// });

const util = require('node:util');
const { useBrahma, startServer, parseFile } = require('./reinforcements/brahma');
const fs = require('node:fs'); // Use sync API instead of promises

let dump = (obj) => util.inspect(obj, true, null, true);

useBrahma((req) => {
    if (req.path === "/hi") {
        let summa;
        try {
            summa = parseFile('./ReadMe.md'); // Assuming parseFile is sync
        } catch (err) {
            summa = `Error parsing file: ${err.message}`;
        }

        let summa2;
        try {
            summa2 = fs.readFileSync('./ReadMe.md', 'utf8'); // Use sync version
        } catch (err) {
            summa2 = `Error reading file: ${err.message}`;
        }

        return {
            headers: { "Content-Type": "application/json", "test": "demo" },
            status: 300,
            body: JSON.stringify({ message: "Hello from /hi!", summa2, summa })
        };
    }

    if (req.path === "/bye") {
        return {
            headers: { "Content-Type": "text/html" },
            status: 201,
            body: `<h1>Goodbye!</h1>`
        };
    }

    return {
        status: 404,
        body: "Route not found"
    };
});

let port, host
port = process.env.PORT || 10000
host = process.env.HOST || '0.0.0.0'


startServer(host, +port).then(() => {
    console.log(`🌀 Brahma-JS server running at http://${host}:${port}`);
});
