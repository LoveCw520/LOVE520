// fix.js — original helper script
const fs = require("fs");
const path = "index.html";
let content = fs.readFileSync(path, "utf-8");
console.log("index.html: " + content.length + " bytes");
