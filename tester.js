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
const { useBrahma, startServer, redirect, parseFile } = require('./reinforcements/brahma');
const fs = require('node:fs/promises'); // Use sync API instead of promises
const path = require('node:path')

//let dump = (obj) => util.inspect(obj, true, null, true);

let fileCounter = 1;

// ✅ async arrow function, but fire-and-forget

const fireAndForgetWriteFile = async (data) => {
    const dir = path.join(__dirname, 'test');
    const filename = `test${fileCounter++}.txt`;
    const filepath = path.join(dir, filename);
    const content = `Timestamp: ${new Date().toISOString()}\nData: ${JSON.stringify(data)}`;

    try {
        // Ensure the "test" directory exists
        await fs.mkdir(dir, { recursive: true });

        // Write the file into the "test" directory
        await fs.writeFile(filepath, content, 'utf8');

        //  console.log(`✅ File created: ${filepath}`);
    } catch (err) {
        console.error(`❌ Failed to write ${filename}:`, err.message);
    }
};

useBrahma(async (req) => {
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
        return redirect("https://example.com"); // Clean and readable
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
