module.exports = async (req, res) => {
  // Basic CORS (same-origin on Vercel; this avoids surprises in local testing).
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }

  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const apiKey = process.env.API_NINJAS_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: "Missing API_NINJAS_KEY" });
  }

  const lengthRaw = Array.isArray(req.query?.length) ? req.query.length[0] : req.query?.length;
  const length = Math.min(64, Math.max(10, Number.parseInt(lengthRaw || "16", 10) || 16));

  try {
    const url = new URL("https://api.api-ninjas.com/v1/passwordgenerator");
    url.searchParams.set("length", String(length));

    const apiRes = await fetch(url.toString(), {
      headers: {
        "X-Api-Key": apiKey,
      },
    });

    if (!apiRes.ok) {
      const text = await apiRes.text().catch(() => "");
      return res.status(502).json({
        error: "Password service error",
        status: apiRes.status,
        details: text || undefined,
      });
    }

    const data = await apiRes.json();
    const randomPassword = data?.random_password;

    if (!randomPassword || typeof randomPassword !== "string") {
      return res.status(502).json({ error: "Invalid password response" });
    }

    return res.status(200).json({ password: randomPassword });
  } catch (e) {
    return res.status(500).json({ error: "Failed to generate password" });
  }
};

