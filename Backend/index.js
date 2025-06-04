import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import { pipeline } from "node:stream/promises";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileP = promisify(execFile);

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
    const { stdout } = await execFileP("python3", [
      path.join(__dirname, "ig_fetch.py"),
      link,
    ], { timeout: 20000 });
    const parsed = JSON.parse(stdout.trim());
    if (Array.isArray(parsed) && parsed.length) {
      res.set("Cache-Control", "public, max-age=604800");
      return res.json({ images: parsed });
    }
    throw new Error("python fetch failed");
  } catch (err) {
    console.error("Python fetch failed, falling back to direct scrape", err);
    try {
      const jsonUrl = link.replace(/\/$/, "") + "/?__a=1&__d=dis";
      const data = await fetch(jsonUrl, { headers: { "User-Agent": UA } }).then(r => r.json());
      const media = data?.graphql?.shortcode_media || data?.items?.[0];
      if (!media) throw new Error("structure changed");

      let images = [];
      if (media.edge_sidecar_to_children) {
        images = media.edge_sidecar_to_children.edges.map(e =>
          e.node.display_url ||
          e.node.display_resources?.[0]?.src ||
          e.node.image_versions2?.candidates?.[0]?.url
        );
      } else if (media.carousel_media) {
        images = media.carousel_media.map(m =>
          m.image_versions2?.candidates?.[0]?.url ||
          m.display_resources?.[0]?.src
        );
      } else {
        images = [media.display_url || media.image_versions2?.candidates?.[0]?.url];
      }
      images = images.filter(Boolean);
      if (!images.length) throw new Error("no images");
      res.set("Cache-Control", "public, max-age=604800");
      return res.json({ images });
    } catch (err2) {
      console.error(err2);
      return res.status(502).json({ error: "scrape failed" });
    }
  }
});

app.get("/api/img", async (req, res) => {
  const url = req.query.url;
  if (!/^https?:\/\//.test(url))
    return res.status(400).json({ error: "bad url" });

  try {
    const r = await fetch(url, { headers: { "User-Agent": UA } });
    if (!r.ok) throw new Error("fetch failed");
    res.set("Content-Type", r.headers.get("content-type") || "application/octet-stream");
    res.set("Cache-Control", "public, max-age=604800");
    await pipeline(r.body, res);
  } catch (err) {
    console.error(err);
    return res.status(502).json({ error: "img fetch failed" });
  }
});

app.listen(process.env.PORT || 3000, () =>
  console.log("IG proxy running on", process.env.PORT || 3000)
);
