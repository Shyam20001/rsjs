const { startServer, registerJsCallback } = require('./reinforcements/index');

// Your JS async handler that Rust will call with (path, body)
// Must return response string
function handleRequest(path, body) {
    // console.log(`Request came for path: ${body[1]} with body: ${body}`);

    // Example: Just echo back some JSON

    if (body[0] == "/hi") {
        //  console.log(body[1], "data for /hi")
        return JSON.stringify({
            name: "poda punda",
            body: body[3]
        });
    }

    if (body[0] == "/bye") {
        console.log(body, "data for /bye")
        return JSON.stringify({
            name: "poda sunni"
        });
    }
    return JSON.stringify({
        // receivedBody: body,
        // reply: "Hello from JS!",
        invalid: "404 - Not Found"
    });
}

// Register the callback with Rust addon
registerJsCallback(handleRequest);

// Start the server; optionally specify host and port
const PORT = process.env.PORT || 4000
const HOST = process.env.HOST || "0.0.0.0"
startServer(HOST, +PORT).then(() => {
    console.log("Rust HTTP server started");
}).catch(console.error);
