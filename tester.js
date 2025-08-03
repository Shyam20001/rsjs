const { useBrahma, startServer } = require('./reinforcements/brahma');

useBrahma((req) => {
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

startServer("127.0.0.1", 3000).then(() => {
    console.log("🌀 Brahma-JS server running at http://localhost:3000");
});
