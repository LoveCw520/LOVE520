const http = require("http");
const fs = require("fs");
const path = require("path");

const dist = path.join(__dirname, "dist");
if (!fs.existsSync(path.join(dist, "index.html"))) {
  console.log("请先运行 npm run build 生成 dist 目录");
  process.exit(1);
}

const types = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript",
  ".css": "text/css",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".ico": "image/x-icon",
  ".woff2": "font/woff2"
};

http
  .createServer((req, res) => {
    let url = req.url.split("?")[0];
    if (url === "/") url = "/index.html";
    const file = path.join(dist, url);
    if (!file.startsWith(dist) || !fs.existsSync(file)) {
      res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
      res.end("Not Found");
      return;
    }
    res.writeHead(200, { "Content-Type": types[path.extname(file)] || "application/octet-stream" });
    fs.createReadStream(file).pipe(res);
  })
  .listen(5777, () => {
    console.log("码瑙 Demo: http://localhost:5777");
  });
