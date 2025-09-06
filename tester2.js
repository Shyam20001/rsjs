

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
const { startServer, useBrahma } = require('./brahma');

// A helper to sleep
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

useBrahma(async (req, res) => {
  if (req.path === "/") {
    return { body: "Hello from Brahma 🚀" }; // simple return
  }

  if (req.path === "/html") {
    res.html(`<h1>Hello HTML</h1><p>Served by Brahma id: ${req.reqId}</p>`);
    return; // use helper
  }

  if (req.path === "/json" && req.method === "POST") {
    try {
      const parsed = req.body
     // await sleep(3000);
      res.send( parsed );
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
    res.json({msg: 'poolu'}, 201);
    return;
  }

  return { status: 404, body: "Not Found" };
});

startServer("0.0.0.0", 2000).then(() => {
  console.log("🔥 Server running at http://0.0.0.0:2000");
});



