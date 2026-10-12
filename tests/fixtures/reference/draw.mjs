// Reference for tests/render/draw-shapes.test.mjs (review R2, MAJOR 2): section 10.6's drawShapes, the one path from
// a shape list to a Phaser Graphics, for the controls only. Each shape is one style call then one draw call, in list
// order, offset by (dx, dy); `points` are plain { x, y } objects made from the pairs of `p`.
function pointsOf(p, dx, dy) {
  const out = [];
  for (let i = 0; i + 1 < p.length; i += 2) out.push({ x: p[i] + dx, y: p[i + 1] + dy });
  return out;
}

export function drawShapes(g, shapes, dx = 0, dy = 0) {
  for (const s of shapes) {
    switch (s.k) {
      case 'rect':
        g.fillStyle(s.c, s.a);
        g.fillRect(s.x + dx, s.y + dy, s.w, s.h);
        break;
      case 'tri':
        g.fillStyle(s.c, s.a);
        g.fillTriangle(s.p[0] + dx, s.p[1] + dy, s.p[2] + dx, s.p[3] + dy, s.p[4] + dx, s.p[5] + dy);
        break;
      case 'poly':
        g.fillStyle(s.c, s.a);
        g.fillPoints(pointsOf(s.p, dx, dy), true);
        break;
      case 'ellipse':
        g.fillStyle(s.c, s.a);
        g.fillEllipse(s.x + dx, s.y + dy, 2 * s.rx, 2 * s.ry);
        break;
      case 'ring':
        g.lineStyle(s.lw, s.c, s.a);
        g.strokeCircle(s.x + dx, s.y + dy, s.r);
        break;
      case 'frame':
        g.lineStyle(s.lw, s.c, s.a);
        g.strokeRect(s.x + dx, s.y + dy, s.w, s.h);
        break;
      case 'line':
        g.lineStyle(s.lw, s.c, s.a);
        g.strokePoints(pointsOf(s.p, dx, dy), false);
        break;
      case 'outline':
        g.lineStyle(s.lw, s.c, s.a);
        g.strokePoints(pointsOf(s.p, dx, dy), true);
        break;
    }
  }
}
