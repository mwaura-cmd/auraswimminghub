import fs from "node:fs/promises";

async function loadEnvFromDotLocal() {
  const envText = await fs.readFile(new URL("../.env.local", import.meta.url), "utf8");

  for (const line of envText.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }

    const equalsIndex = trimmed.indexOf("=");
    if (equalsIndex === -1) {
      continue;
    }

    const key = trimmed.slice(0, equalsIndex).trim();
    let value = trimmed.slice(equalsIndex + 1).trim();

    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }

    if (!process.env[key]) {
      process.env[key] = value;
    }
  }
}

async function run() {
  await loadEnvFromDotLocal();

  const secretKey = process.env.PAYSTACK_SECRET_KEY;
  if (!secretKey) {
    throw new Error("Missing PAYSTACK_SECRET_KEY in environment");
  }

  const response = await fetch("https://api.paystack.co/transaction?perPage=30&page=1", {
    headers: {
      Authorization: `Bearer ${secretKey}`,
    },
  });

  const payload = await response.json();

  if (!response.ok || !payload.status) {
    throw new Error(payload.message ?? "Failed to fetch transactions from Paystack");
  }

  const transactions = Array.isArray(payload.data) ? payload.data : [];
  const successTransactions = transactions.filter((item) => item.status === "success");

  console.log(`Total fetched: ${transactions.length}`);
  console.log(`Successful transactions: ${successTransactions.length}`);

  for (const item of successTransactions.slice(0, 12)) {
    const bookingId = item?.metadata?.bookingId ?? "(no bookingId)";
    const amountKes = typeof item.amount === "number" ? item.amount / 100 : "?";
    const paidAt = item.paid_at ?? item.created_at ?? "(unknown time)";
    const email = item?.customer?.email ?? "(no email)";
    console.log(`${item.reference} | bookingId=${bookingId} | amountKes=${amountKes} | email=${email} | paidAt=${paidAt}`);
  }
}

run().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
