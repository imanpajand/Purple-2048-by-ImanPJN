export default async function handler(req, res) {
  if (req.method === "POST") {
    const event = req.body;

    console.log("📨 Farcaster Event:", event);

    res.status(200).json({ received: true });
  } else {
    res.status(405).json({ message: "Method Not Allowed" });
  }
}

