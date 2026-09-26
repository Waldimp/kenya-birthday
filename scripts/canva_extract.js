// Se ejecuta dentro del editor de Canva (page.evaluate). Devuelve el layout de
// cada página visible: posición, tamaño, rotación y contenido de cada elemento.
(pageNumbers) => {
  const result = {};
  const probe = (host, x, y) => {
    const m = document.createElement("div");
    m.style.cssText = `position:absolute;left:${x}px;top:${y}px;width:0;height:0;`;
    host.appendChild(m);
    const r = m.getBoundingClientRect();
    m.remove();
    return [r.left, r.top];
  };

  for (const n of pageNumbers) {
    const label = document.querySelector(`[aria-label="Página ${n}, sección 1"]`);
    if (!label) continue;
    const holder = label.parentElement.parentElement;
    const vis = [...holder.children].find((c) => c !== label.parentElement);
    const root = vis?.querySelector("._mXnjA");
    if (!root) continue;
    const pw = parseFloat(root.style.width);
    const ph = parseFloat(root.style.height);
    const [ox, oy] = probe(root, 0, 0);
    const [ax] = probe(root, pw, 0);
    const k = pw / (ax - ox); // pantalla -> unidades de página
    const toPage = ([x, y]) => [(x - ox) * k, (y - oy) * k];

    const leaves = [...root.querySelectorAll(".DF_utQ")].filter(
      (e) => !e.querySelector(".DF_utQ"),
    );
    const elements = leaves.map((el, order) => {
      const w = parseFloat(el.style.width);
      const h = parseFloat(el.style.height);
      const prevPos = el.style.position;
      if (getComputedStyle(el).position === "static") el.style.position = "relative";
      const p0 = toPage(probe(el, 0, 0));
      const p1 = toPage(probe(el, w, 0));
      const p2 = toPage(probe(el, 0, h));
      el.style.position = prevPos;
      const ux = [(p1[0] - p0[0]) / w, (p1[1] - p0[1]) / w];
      const uy = [(p2[0] - p0[0]) / h, (p2[1] - p0[1]) / h];
      const sx = Math.hypot(...ux);
      const sy = Math.hypot(...uy);
      const det = ux[0] * uy[1] - ux[1] * uy[0];
      const rot = (Math.atan2(ux[1], ux[0]) * 180) / Math.PI;
      const cx = p0[0] + (ux[0] * w + uy[0] * h) / 2;
      const cy = p0[1] + (ux[1] * w + uy[1] * h) / 2;

      let opacity = 1;
      for (let e = el; e && e !== root; e = e.parentElement) {
        const o = parseFloat(getComputedStyle(e).opacity);
        if (!Number.isNaN(o)) opacity *= o;
      }

      const out = {
        order,
        id: el.id,
        cx, cy,
        w: w * sx,
        h: h * sy,
        rot,
        sx,
        sy,
        flip: det < 0,
        opacity: +opacity.toFixed(3),
      };

      const img = el.querySelector("img");
      const crop = el.querySelector(".Izwocg");
      const svg = el.querySelector("svg");
      const text = el.querySelector("p");
      if (img) {
        out.type = img.alt && /\.(mov|mp4)$/i.test(img.alt) ? "video" : "image";
        out.alt = img.alt || "";
        out.src = img.src;
        const uri = decodeURIComponent(img.src).match(/ifs:\/\/[MV]\/([\w-]+)/);
        out.uri = uri ? uri[1] : null;
        if (crop) {
          out.crop = {
            w: parseFloat(crop.style.width) * sx,
            h: parseFloat(crop.style.height) * sy,
            transform: crop.style.transform,
          };
        }
        const flipper = [...el.querySelectorAll("*")].find((e) => /scale\(-1|scaleX\(-1|matrix\(-1/.test(e.getAttribute("style") || ""));
        if (flipper) out.innerFlip = flipper.getAttribute("style");
        const filt = [...el.querySelectorAll("*")].map((e) => e.style.filter).filter(Boolean);
        if (filt.length) out.filter = filt;
      } else if (text) {
        out.type = "text";
        const layers = [...el.querySelectorAll("p")].map((p) => {
          const holder = p.closest("[style*='text-stroke']");
          const cs = getComputedStyle(p);
          return {
            text: p.innerText,
            font: p.style.fontFamily,
            size: parseFloat(p.style.getPropertyValue("--H97cbQ")) || parseFloat(cs.fontSize),
            color: p.style.color,
            lineHeight: p.style.lineHeight,
            letterSpacing: p.style.letterSpacing,
            align: cs.textAlign,
            transform: p.style.textTransform,
            stroke: holder ? holder.style.webkitTextStroke || holder.getAttribute("style") : null,
            spans: [...p.querySelectorAll("span")].map((s) => ({ t: s.innerText, color: s.style.color, weight: s.style.fontWeight })),
            shadow: cs.textShadow !== "none" ? cs.textShadow : null,
          };
        });
        out.layers = layers;
        out.html = el.innerHTML.length < 6000 ? el.innerHTML : null;
      } else if (svg) {
        out.type = "svg";
        out.svg = svg.outerHTML;
      } else {
        out.type = "other";
        out.html = el.innerHTML.slice(0, 2000);
      }
      return out;
    });
    result[n] = { width: pw, height: ph, background: root.querySelector(".fbzKiw")?.getAttribute("style") || null, elements };
  }
  return result;
};
