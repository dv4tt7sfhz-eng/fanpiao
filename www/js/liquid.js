// 液态玻璃：底部标签栏边缘的「折射」。
// 思路参考 rdev/liquid-glass-react（MIT）和 shuding/liquid-glass：
// 用画布算出一张「位移图」——越靠近玻璃边缘，取样点越往里偏，看起来就像背后的内容被玻璃边弯折了；
// 再用 SVG 的 feDisplacementMap 当滤镜，叠在毛玻璃层上。
// 只有 Chrome 内核（安卓）能显示这种折射；iPhone 的 Safari 内核不支持，会自动只用普通毛玻璃。

const NS = "http://www.w3.org/2000/svg";
let host = null;

// 这个效果没法用特性检测判断，只能看是不是 Chrome 内核（iPhone 上的所有浏览器都是 Safari 内核）
export function canRefract() {
  try {
    if (matchMedia("(prefers-reduced-transparency: reduce)").matches) return false;
    const ua = navigator.userAgent;
    if (/iPhone|iPad|iPod|CriOS|FxiOS|Firefox/.test(ua)) return false;
    return !!(navigator.userAgentData || /Chrome\/\d+/.test(ua));
  } catch (e) { return false; }
}

const smooth = (a, b, t) => { t = Math.max(0, Math.min(1, (t - a) / (b - a))); return t * t * (3 - 2 * t); };

// 圆角矩形的位移图。band：边缘弯折的宽度（像素）
function mapURL(w, h, r, band) {
  const cv = document.createElement("canvas"); cv.width = w; cv.height = h;
  const g = cv.getContext("2d"), img = g.createImageData(w, h), d = img.data;
  const hw = w / 2, hh = h / 2;
  r = Math.min(r, hw, hh);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const px = x + 0.5 - hw, py = y + 0.5 - hh;
    // 到圆角矩形边的距离（里面是负数）和往外的方向
    const qx = Math.abs(px) - (hw - r), qy = Math.abs(py) - (hh - r);
    const ox = Math.max(qx, 0), oy = Math.max(qy, 0), ol = Math.hypot(ox, oy);
    const dist = Math.min(Math.max(qx, qy), 0) + ol - r;
    let nx, ny;
    if (ol > 0) { nx = (ox / ol) * Math.sign(px); ny = (oy / ol) * Math.sign(py); }
    else if (qx > qy) { nx = Math.sign(px); ny = 0; } else { nx = 0; ny = Math.sign(py); }
    const t = smooth(band, 0, -dist); // 边上是 1，往里 band 像素变成 0
    const k = t * t;
    const i = (y * w + x) * 4;
    d[i] = 128 - nx * k * 127; // 红：横向偏移（往里取样）
    d[i + 1] = 128 - ny * k * 127; // 绿：纵向偏移
    d[i + 2] = 128; d[i + 3] = 255;
  }
  g.putImageData(img, 0, 0);
  return cv.toDataURL();
}

function ensureHost() {
  if (host) return host;
  host = document.createElementNS(NS, "svg");
  host.setAttribute("aria-hidden", "true");
  host.style.cssText = "position:absolute;width:0;height:0;overflow:hidden";
  document.body.appendChild(host);
  return host;
}

// 给一个元素装上折射。el 里要有一个 .lgwarp 子元素（毛玻璃层）
// sel：要装滤镜的子元素；backdrop：true 时装在「背后的内容」上（泡泡像放大镜一样弯折后面的东西）
export function liquidify(el, { id = "lg" + Math.random().toString(36).slice(2, 7), radius = 32, band = 20, scale = 36, sel = ".lgwarp", backdrop = false, cls = "lg-on" } = {}) {
  if (!el || !canRefract()) return () => {};
  const warp = el.querySelector(sel);
  if (!warp) return () => {};
  const svg = ensureHost();
  const f = document.createElementNS(NS, "filter");
  f.setAttribute("id", id); f.setAttribute("x", "0"); f.setAttribute("y", "0");
  f.setAttribute("filterUnits", "userSpaceOnUse"); f.setAttribute("primitiveUnits", "userSpaceOnUse");
  f.setAttribute("color-interpolation-filters", "sRGB");
  const im = document.createElementNS(NS, "feImage");
  im.setAttribute("result", "map"); im.setAttribute("preserveAspectRatio", "none");
  const dm = document.createElementNS(NS, "feDisplacementMap");
  dm.setAttribute("in", "SourceGraphic"); dm.setAttribute("in2", "map");
  dm.setAttribute("xChannelSelector", "R"); dm.setAttribute("yChannelSelector", "G");
  dm.setAttribute("scale", String(scale));
  f.append(im, dm); svg.appendChild(f);
  let last = "";
  const size = () => {
    const w = Math.round(warp.offsetWidth), h = Math.round(warp.offsetHeight);
    if (!w || !h || last === w + "x" + h) return;
    last = w + "x" + h;
    for (const n of [f, im]) { n.setAttribute("width", String(w)); n.setAttribute("height", String(h)); }
    im.setAttribute("x", "0"); im.setAttribute("y", "0");
    im.setAttribute("href", mapURL(w, h, radius, band));
    if (backdrop) warp.style.setProperty("--lens", `url(#${id})`);
    else warp.style.filter = `url(#${id})`;
    el.classList.add(cls);
  };
  size();
  const ro = "ResizeObserver" in window ? new ResizeObserver(size) : null;
  if (ro) ro.observe(warp);
  return () => { if (ro) ro.disconnect(); f.remove(); warp.style.filter = ""; warp.style.removeProperty("--lens"); el.classList.remove(cls); };
}
