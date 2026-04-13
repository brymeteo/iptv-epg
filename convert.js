const fs = require("fs");
const https = require("https");

function fetchXML(url) {
  return new Promise((resolve, reject) => {
    https.get(url, res => {
      let data = "";
      res.on("data", c => data += c);
      res.on("end", () => resolve(data));
    }).on("error", reject);
  });
}

function getAttr(block, attr) {
  const m = block.match(new RegExp(`${attr}="([^"]+)"`));
  return m ? m[1] : "";
}

function getTag(block, tag) {
  const m = block.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`));
  return m ? m[1] : "";
}

function parseDate(v) {
  if (!v) return "";
  const r = v.split(" ")[0];
  return `${r.slice(0, 4)}-${r.slice(4, 6)}-${r.slice(6, 8)}T${r.slice(8, 10)}:${r.slice(10, 12)}:${r.slice(12, 14)}.000000Z`;
}

(async () => {
  try {
    console.log("📥 Download XML...");

    const xml = await fetchXML(
      "https://raw.githubusercontent.com/matthuisman/i.mjh.nz/refs/heads/master/SamsungTVPlus/it.xml"
    );

    console.log("✅ XML size:", xml.length);

    // -------------------------
    // CHANNELS
    // -------------------------
    const channelBlocks = xml.match(/<channel[^>]*>[\s\S]*?<\/channel>/g) || [];
    const channels = {};

    for (const ch of channelBlocks) {
      const id = getAttr(ch, "id");
      const name =
        ch.match(/<display-name[^>]*>(.*?)<\/display-name>/)?.[1] || "";

      if (!id) continue;

      channels[id] = {
        id,
        name,
        epgName: name,
        logo: ch.match(/<icon[^>]*src="([^"]+)"/)?.[1] || "",
        m3uLink: "",
        programs: []
      };
    }

    console.log(`📺 Channels parsed: ${Object.keys(channels).length}`);

    // -------------------------
    // PROGRAMMES
    // -------------------------
    const progBlocks = xml.match(/<programme[^>]*>[\s\S]*?<\/programme>/g) || [];

    for (const p of progBlocks) {
      const cid = getAttr(p, "channel");
      if (!channels[cid]) continue;

      channels[cid].programs.push({
        start: parseDate(getAttr(p, "start")),
        end: parseDate(getAttr(p, "stop")),
        title: getTag(p, "title"),
        description: getTag(p, "desc") || "",
        category: "Categoria non disponibile",
        poster: p.match(/<icon[^>]*src="([^"]+)"/)?.[1] || "",
        channel: channels[cid].name.toLowerCase().replace(/\s+/g, "-")
      });
    }

    console.log(`📡 Programmes parsed: ${progBlocks.length}`);

    // -------------------------
    // OUTPUT
    // -------------------------
    fs.writeFileSync(
      "output.json",
      JSON.stringify(Object.values(channels), null, 2)
    );

    console.log("🎉 OK - JSON generated");
  } catch (err) {
    console.error("❌ FATAL ERROR:", err);
    process.exit(1);
  }
})();
