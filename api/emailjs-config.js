module.exports = (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }

  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  // These are *public* identifiers; safe to return to the browser.
  const publicKey = process.env.EMAILJS_PUBLIC_KEY || "";
  const serviceId = process.env.EMAILJS_SERVICE_ID || "";
  const templateId = process.env.EMAILJS_TEMPLATE_ID || "";

  return res.status(200).json({
    publicKey,
    serviceId,
    templateId,
  });
};

