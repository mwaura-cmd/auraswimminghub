const fs = require("fs");
const path = require("path");

const projectRoot = process.cwd();
const standaloneDir = path.join(projectRoot, ".next", "standalone");
const staticSrc = path.join(projectRoot, ".next", "static");
const staticDest = path.join(standaloneDir, ".next", "static");
const publicSrc = path.join(projectRoot, "public");
const publicDest = path.join(standaloneDir, "public");

function copyDir(src, dest) {
  if (!fs.existsSync(src)) {
    return;
  }

  fs.mkdirSync(dest, { recursive: true });
  fs.cpSync(src, dest, { recursive: true });
}

copyDir(staticSrc, staticDest);
copyDir(publicSrc, publicDest);
