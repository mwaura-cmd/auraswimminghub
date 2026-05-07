const HOSTNAME = "0.0.0.0";

process.env.HOSTNAME = HOSTNAME;
process.env.PORT = process.env.PORT || "10000";

require("./.next/standalone/server.js");
