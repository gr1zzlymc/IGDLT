import express from "express";
import fetch from "node-fetch";
import path from "path";
import { fileURLToPath } from "url";

const app = express();
const UA = "Mozilla/5.0 Chrome/124 Safari/537.36";
const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Serve static frontend
const frontPath = path.join(__dirname, "..", "Frontend");
app.use(express.static(frontPath));

app.get("/", (req, res) => {
  res.sendFile(path.join(frontPath, "index.html"));
});

app.get("/api/ig", async (req, res) => {
  const link = req.query.link?.trim();
  if (!/^https?:\/\/(www\.)?instagram\.com\/p\//.test(link))
    return res.status(400).json({ error: "bad url" });

  try {
    const jsonUrl = link.replace(/\/$/, "") + "/?__a=1&__d=dis";
    const data = await fetch(jsonUrl, { headers: { "User-Agent": UA } }).then(r => r.json());
    const media = data?.graphql?.shortcode_media;
    if (!media) throw new Error("structure changed");

    const images = media.edge_sidecar_to_children
      ? media.edge_sidecar_to_children.edges.map(e => e.node.display_url)
      : [media.display_url];

    res.set("Cache-Control", "public, max-age=604800");
    return res.json({ images });
  } catch (err) {
    console.error(err);
    return res.status(502).json({ error: "scrape failed" });
  }
});

app.listen(process.env.PORT || 3000, () =>
  console.log("IG proxy running on", process.env.PORT || 3000)
);
