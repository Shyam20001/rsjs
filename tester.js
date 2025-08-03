const util = require('node:util')
const { useBrahma, startServer } = require('./reinforcements/brahma');
let dump = (obj) => util.inspect(obj, true, null, true)

useBrahma((req) => {

    // lets check and debub 
    // console.log(dump(req))
    if (req.path === "/hi") {
        return {
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ message: "Hello from /hi!" })
        };
    }

    if (req.path === "/bye") {
        return {
            headers: { "Content-Type": "text/html" },
            body: `<h1>Goodbye!</h1>`
        };
    }


    return {
        status: 404,
        body: "Route not found"
    };
});

startServer("0.0.0.0", 10000).then(() => {
    console.log("🌀 Brahma-JS server running at http://localhost:3000");
});
