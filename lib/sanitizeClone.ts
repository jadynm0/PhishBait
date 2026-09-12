import * as cheerio from "cheerio";

/** Import content as inert markup; original scripts, CSS and network targets are not trusted. */
export function sanitizeClone(html: string): string {
  const $ = cheerio.load(html);
  $("script, style, link, meta, base, iframe, frame, frameset, object, embed, svg, math, video, audio, source, template, noscript").remove();
  const tags = new Set("html head body main section article header footer nav div span p h1 h2 h3 h4 h5 h6 strong em b i small br hr ul ol li dl dt dd table thead tbody tr th td form label input textarea select option optgroup button fieldset legend details summary a img".split(" "));
  const attrs = new Set("class id name type placeholder required minlength maxlength min max step pattern rows cols autocomplete inputmode checked selected disabled readonly multiple for value role aria-label aria-describedby aria-expanded alt width height colspan rowspan data-phishbait-submit".split(" "));
  $("*").each((_, el) => {
    if (!("tagName" in el) || !("attribs" in el)) return;
    if (!tags.has(el.tagName)) { $(el).remove(); return; }
    for (const attr of Object.keys(el.attribs)) {
      if (!attrs.has(attr)) $(el).removeAttr(attr);
    }
    // Imported classes may contain CSS arbitrary values and external URLs.
    const classes = ($(el).attr("class") || "").split(/\s+/).filter(c => /^[a-zA-Z0-9_:/.-]+$/.test(c));
    $(el).attr("class", classes.join(" "));
    if (el.tagName === "input" && ["password", "file", "image", "hidden"].includes($(el).attr("type") || "")) $(el).remove();
    if (["input", "textarea"].includes(el.tagName)) {
      $(el).removeAttr("value");
      if (el.tagName === "textarea") $(el).text("");
    }
    if (el.tagName === "form") $(el).attr("action", "#").attr("method", "post");
  });
  return $("body").html() || "";
}
