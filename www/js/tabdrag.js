// 底部标签栏的「透明泡泡」：学 Apple Music。
// 平时：选中的那格是一块安静的胶囊。
// 手指一按：胶囊鼓成一个比标签栏还大的透明泡泡，跟着手指左右滑；
// 滑过哪一格，哪一格的图标就变色；松手时泡泡缩回胶囊，停在最近的那一格，并切换过去。
// 跟手的位置直接改元素的 transform（不经过重新渲染），才跟得上手指。

export function attachTabDrag(el, { count, onPick, tick = () => {} }) {
  const thumb = el.querySelector(".thumb");
  const bubble = el.querySelector(".bubble");
  if (!thumb || !bubble) return () => {};
  const btns = () => el.querySelectorAll("button");
  let id = null, rect = null, w = 0, last = -1, lx = 0, lt = 0, rest = 0, moved = false, sx = 0;

  // 手指的横坐标 → 泡泡左边的位置（夹在第一格和最后一格之间）
  const pos = (cx) => Math.max(0, Math.min((count - 1) * w, cx - rect.left - 5 - w / 2));
  const near = (x) => Math.max(0, Math.min(count - 1, Math.round(x / w)));
  const hot = (n) => {
    if (n === last) return;
    if (last !== -1 && moved) tick();
    last = n;
    btns().forEach((b, i) => b.classList.toggle("hot", i === n));
  };
  const place = (x) => { thumb.style.transform = `translateX(${x}px)`; hot(near(x)); };

  const down = (e) => {
    if (id !== null || (e.pointerType === "mouse" && e.button !== 0)) return;
    id = e.pointerId; moved = false; last = -1; sx = lx = e.clientX; lt = e.timeStamp;
    rect = el.getBoundingClientRect(); w = (rect.width - 10) / count;
    try { el.setPointerCapture(id); } catch (err) {}
    el.classList.add("press");
    place(pos(e.clientX));
  };
  const move = (e) => {
    if (e.pointerId !== id) return;
    if (!moved && Math.abs(e.clientX - sx) > 4) { moved = true; el.classList.add("drag"); }
    place(pos(e.clientX));
    // 滑得越快，泡泡越往滑的方向拉长（像水滴），停下来就弹回圆润
    const dt = Math.max(8, e.timeStamp - lt), v = (e.clientX - lx) / dt;
    lx = e.clientX; lt = e.timeStamp;
    const s = 1 + Math.min(0.2, Math.abs(v) * 0.1);
    bubble.style.transform = `scale(${(1.16 * s).toFixed(3)},${(1.42 / s).toFixed(3)})`;
    clearTimeout(rest); rest = setTimeout(() => { bubble.style.transform = ""; }, 90);
  };
  const up = (e) => {
    if (e.pointerId !== id) return;
    id = null; clearTimeout(rest);
    const n = near(pos(e.clientX));
    el.classList.remove("press", "drag");
    btns().forEach((b) => b.classList.remove("hot"));
    bubble.style.transform = "";
    if (e.type === "pointerup") { thumb.style.transform = `translateX(${n * 100}%)`; onPick(n); }
    else thumb.style.transform = `translateX(${(+el.dataset.idx || 0) * 100}%)`; // 被系统打断：回到原来那格
  };
  el.addEventListener("pointerdown", down);
  el.addEventListener("pointermove", move);
  el.addEventListener("pointerup", up);
  el.addEventListener("pointercancel", up);
  return () => {
    el.removeEventListener("pointerdown", down); el.removeEventListener("pointermove", move);
    el.removeEventListener("pointerup", up); el.removeEventListener("pointercancel", up);
  };
}
