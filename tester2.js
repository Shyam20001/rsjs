

// const { startServer, useBrahma, text, html, json, redirect } = require('./brahma');

// useBrahma((req) => {
//   if (req.path === "/") {
//     return text("Hello from Brahma 🚀");
//   }
//   if (req.path === "/page") {
//     return html("<h1>Hello HTML</h1><p>This is raw HTML served by Brahma</p>");
//   }
//   if (req.path === "/api") {
//     return json({ message: "Hello JSON API" });
//   }
//   if (req.path === "/go") {
//     return redirect("/page");
//   }
//   return { status: 404, body: "Not Found" };
// });

// startServer("0.0.0.0", 2000).then(() => {
//   console.log("🔥 Server running at http://0.0.0.0:2000");
// });


// const { startServer, useBrahma, text, html, json, redirect } = require('./brahma');

// // A helper to sleep
// function sleep(ms) {
//   return new Promise(resolve => setTimeout(resolve, ms));
// }

// useBrahma(async (req) => {
// //  console.log(req)

//   if (req.path === "/submit") {
//     // Log the body
//   //  console.log("Got POST body:", req.body);

//     try {
//       const parsed = JSON.parse(req.body);
//      // await sleep(3000);
//       return json({ ok: true, parsed });
//     } catch {
//       return text("Received: " + req.body);
//     }
//   }
//   if (req.path === "/") {
//     return text("Hello from Brahma 🚀");
//   }

//   if (req.path === "/wait") {
//     // Async sleep 3 seconds before replying
//     await sleep(3000);
//     return text("Hello after 3s async delay ⏳");
//   }

//   if (req.path === "/page") {
//     return html("<h1>Hello HTML</h1><p>This is raw HTML served by Brahma</p>");
//   }

//   if (req.path === "/api") {
//     return json({ message: "Hello JSON API" });
//   }

//   if (req.path === "/go") {
//     return redirect("/page");
//   }

//   return { status: 404, body: "Not Found" };
// });

// startServer("0.0.0.0", 2000).then(() => {
//   console.log("🔥 Server running at http://0.0.0.0:2000");
// });


/// final stable 
const { startServer, useBrahma, getJsResponseTimeout, getMaxBodyBytes, setJsResponseTimeout, setMaxBodyBytes } = require('./brahma');


// set 2 minutes timeout (120 seconds)
setJsResponseTimeout(500);

// set max body to 50 MiB
setMaxBodyBytes(100 * 1024 * 1024); // 52_428_800

console.log('timeout secs:', getJsResponseTimeout()); // prints 120
console.log('max body bytes:', getMaxBodyBytes());   // prints 52428800

// A helper to sleep
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

useBrahma(async (req, res) => {
  if (req.path === "/hi") {
    // console.log(req)
    return { body: "Hello from Brahma 🚀" }; // simple return
  }

  if (req.path === "/html") {
    res.html(`<h1>Hello HTML</h1><p>Served by Brahma id: ${req.reqId}</p>`);
    return; // use helper
  }

  if (req.path === "/json" && req.method === "POST") {
    try {
      const parsed = JSON.parse(req.body);
      // await sleep(3000);
      res.json({ youSent: parsed, req });
    } catch {
      res.text("Invalid JSON", 400);
    }
    return;
  }

  if (req.path === "/go") {
    res.redirect("/html");
    return;
  }

  if (req.path === "/wait") {
    // Async sleep 3 seconds before replying
    await sleep(3000);
    res.json({ msg: 'poolu' }, 201);
    return;
  }

  // Set cookies example
  if (req.path === "/set-cookie") {
    // set a secure httpOnly session cookie and another small cookie
    // replace your res.send(...) object call with this:
    res.send(
      200,
      { "Content-Type": "text/plain" },
      [
        "a=1; Path=/; HttpOnly",
        "b=2; Path=/; Secure; Max-Age=3600"
      ],
      "hello"
    );

    return;
  }

  // NOTE: static files: any request to /static/* will be served by the Rust fast-path directly
  // 

  return { status: 404, body: "Not Found" };
});

startServer("0.0.0.0", 3000)
