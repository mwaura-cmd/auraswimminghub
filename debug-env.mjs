import fs from "node:fs/promises";

async function debugEnv() {
  try {
    const envText = await fs.readFile(new URL("./.env.local", import.meta.url), "utf8");
    for (const line of envText.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;

      const equalsIndex = trimmed.indexOf("=");
      if (equalsIndex === -1) continue;

      const key = trimmed.slice(0, equalsIndex).trim();
      let value = trimmed.slice(equalsIndex + 1).trim();
      if ((value.startsWith("\"") && value.endsWith("\"")) || (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
      }
      process.env[key] = value;
    }

    const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID ?? process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
    const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
    const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, "\\n");
    const databaseURL = process.env.FIREBASE_ADMIN_DATABASE_URL ?? process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL;

    console.log(`projectId: present=${!!projectId}${projectId ? ", prefix=" + projectId.substring(0, 20) : ""}`);
    console.log(`clientEmail: present=${!!clientEmail}${clientEmail ? ", prefix=" + clientEmail.substring(0, 20) : ""}`);
    console.log(`privateKey: present=${!!privateKey}`);
    console.log(`databaseURL: present=${!!databaseURL}${databaseURL ? ", prefix=" + databaseURL.substring(0, 20) : ""}`);
  } catch (err) {
    console.error("Error reading .env.local:", err.message);
  }
}

debugEnv();
