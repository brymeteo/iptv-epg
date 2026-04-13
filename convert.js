const fs = require("fs");
const { DOMParser } = require("xmldom");

function parseDate(v) {
    const r = v.split(" ")[0];
    return `${r.slice(0,4)}-${r.slice(4,6)}-${r.slice(6,8)}T${r.slice(8,10)}:${r.slice(10,12)}:${r.slice(12,14)}.000000Z`;
}

function getText(el, tag) {
    const n = el.getElementsByTagName(tag)[0];
    return n ? n.textContent : "";
}

function getAttr(el, tag, attr) {
    const n = el.getElementsByTagName(tag)[0];
    return n ? n.getAttribute(attr) : "";
}

async function run() {
    const res = await fetch("https://raw.githubusercontent.com/matthuisman/i.mjh.nz/refs/heads/master/SamsungTVPlus/it.xml");
    const xmlText = await res.text();

    const parser = new DOMParser();
    const xml = parser.parseFromString(xmlText, "text/xml");

    const channels = {};
    const channelNodes = xml.getElementsByTagName("channel");

    // CHANNELS
    for (let ch of channelNodes) {
        const id = ch.getAttribute("id");
        const name = getText(ch, "display-name");

        channels[id] = {
            id,
            name,
            epgName: name,
            logo: getAttr(ch, "icon", "src") || "",
            m3uLink: "",
            programs: []
        };
    }

    // PROGRAMMES
    const programmes = xml.getElementsByTagName("programme");

    for (let p of programmes) {
        const cid = p.getAttribute("channel");
        if (!channels[cid]) continue;

        channels[cid].programs.push({
            start: parseDate(p.getAttribute("start")),
            end: parseDate(p.getAttribute("stop")),
            title: getText(p, "title"),
            description: getText(p, "desc") || "",
            category: "Categoria non disponibile",
            poster: getAttr(p, "icon", "src") || "",
            channel: channels[cid].name.toLowerCase().replace(/\s+/g,"-")
        });
    }

    fs.writeFileSync("output.json", JSON.stringify(Object.values(channels), null, 2));
    console.log("JSON generato");
}

run();
