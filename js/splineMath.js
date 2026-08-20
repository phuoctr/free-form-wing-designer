// ============================================================================
// Spline Mathematics, Coordinate Transforms, Tangents & Geometry
// ============================================================================

// --- Coordinate Transforms ---
        function worldToScreen(wx, wy) {
            const cx = canvas.width / (2 * (window.devicePixelRatio || 1));
            const cy = canvas.height / (2 * (window.devicePixelRatio || 1));
            const sx = cx + (wx - view.pan.x) * view.zoom;
            const sy = cy - (wy - view.pan.y) * view.zoom; // Invert Y
            return { x: sx, y: sy };
        }

        function screenToWorld(sx, sy) {
            const cx = canvas.width / (2 * (window.devicePixelRatio || 1));
            const cy = canvas.height / (2 * (window.devicePixelRatio || 1));
            const wx = (sx - cx) / view.zoom + view.pan.x;
            const wy = -(sy - cy) / view.zoom + view.pan.y;
            return { x: wx, y: wy };
        }

        // --- Spline Mathematics (Cubic Hermite with Tangents) ---
        function evaluateHermite(p0, t0, p1, t1, t) {
            const t2 = t * t;
            const t3 = t2 * t;
            const h00 = 2 * t3 - 3 * t2 + 1;
            const h10 = t3 - 2 * t2 + t;
            const h01 = -2 * t3 + 3 * t2;
            const h11 = t3 - t2;

            return {
                x: h00 * p0.x + h10 * t0.x + h01 * p1.x + h11 * t1.x,
                y: h00 * p0.y + h10 * t0.y + h01 * p1.y + h11 * t1.y
            };
        }

        function sampleCurve(points, startTan, endTan, samples = 60) {
            const n = points.length;
            if (n < 2) return points;

            const tangentsOut = new Array(n);
            const tangentsIn = new Array(n);

            for (let i = 0; i < n; i++) {
                const pt = points[i];
                if (pt.mode === 'sharp') {
                    tangentsOut[i] = null;
                    tangentsIn[i] = null;
                } else if (i === 0) {
                    tangentsOut[i] = pt.tanOut || startTan || { x: points[1].x - points[0].x, y: points[1].y - points[0].y };
                    tangentsIn[i] = null;
                } else if (i === n - 1) {
                    tangentsIn[i] = pt.tanIn || endTan || { x: points[n - 1].x - points[n - 2].x, y: points[n - 1].y - points[n - 2].y };
                    tangentsOut[i] = null;
                } else {
                    const natOut = {
                        x: 0.5 * (points[i + 1].x - points[i - 1].x),
                        y: 0.5 * (points[i + 1].y - points[i - 1].y)
                    };
                    const natIn = { x: -natOut.x, y: -natOut.y };

                    if (pt.mode === 'broken') {
                        tangentsOut[i] = pt.tanOut || natOut;
                        tangentsIn[i] = pt.tanIn || natIn;
                    } else {
                        // Smooth (linked / aligned dual tangents)
                        const tOut = pt.tanOut || pt.tan || natOut;
                        tangentsOut[i] = tOut;
                        tangentsIn[i] = pt.tanIn || { x: -tOut.x, y: -tOut.y };
                    }
                }
            }

            const result = [];
            const segments = n - 1;
            const samplesPerSeg = Math.max(2, Math.floor(samples / segments));

            for (let seg = 0; seg < segments; seg++) {
                const p0 = points[seg];
                const p1 = points[seg + 1];
                const isBothSharp = (p0.mode === 'sharp' && p1.mode === 'sharp');

                if (isBothSharp) {
                    // Pure straight line segment between sharp corners!
                    const count = (seg === segments - 1) ? samplesPerSeg : samplesPerSeg - 1;
                    for (let s = 0; s <= count; s++) {
                        const t = s / count;
                        result.push({
                            x: p0.x + (p1.x - p0.x) * t,
                            y: p0.y + (p1.y - p0.y) * t
                        });
                    }
                } else {
                    const chordTan = { x: p1.x - p0.x, y: p1.y - p0.y };
                    const t0 = p0.mode === 'sharp' ? chordTan : (tangentsOut[seg] || chordTan);
                    const t1 = p1.mode === 'sharp' ? chordTan : (tangentsIn[seg + 1] ? { x: -tangentsIn[seg + 1].x, y: -tangentsIn[seg + 1].y } : chordTan);

                    const count = (seg === segments - 1) ? samplesPerSeg : samplesPerSeg - 1;
                    for (let s = 0; s <= count; s++) {
                        const t = s / count;
                        result.push(evaluateHermite(p0, t0, p1, t1, t));
                    }
                }
            }
            return result;
        }

        function sampleYAtX(sortedPts, targetX) {
            if (!sortedPts || sortedPts.length === 0) return { x: targetX, y: 0 };
            if (sortedPts.length === 1) return sortedPts[0];
            if (targetX <= sortedPts[0].x) return sortedPts[0];
            if (targetX >= sortedPts[sortedPts.length - 1].x) return sortedPts[sortedPts.length - 1];

            for (let i = 0; i < sortedPts.length - 1; i++) {
                const p0 = sortedPts[i];
                const p1 = sortedPts[i + 1];
                if (targetX >= p0.x && targetX <= p1.x) {
                    const dx = p1.x - p0.x;
                    const t = dx > 1e-6 ? (targetX - p0.x) / dx : 0;
                    return { x: targetX, y: p0.y + (p1.y - p0.y) * t };
                }
            }
            return sortedPts[sortedPts.length - 1];
        }

        // --- Animation Curve Evaluation ---
        function evaluateAnimationCurve(t) {
            const keys = wing.ribCurveKeys;
            if (!keys || keys.length === 0) return t;
            if (keys.length === 1) return keys[0].value;

            t = Math.max(0, Math.min(1, t));
            if (t <= keys[0].time) return keys[0].value;
            if (t >= keys[keys.length - 1].time) return keys[keys.length - 1].value;

            for (let i = 0; i < keys.length - 1; i++) {
                const k0 = keys[i];
                const k1 = keys[i + 1];
                if (t >= k0.time && t <= k1.time) {
                    const dt = k1.time - k0.time;
                    const localT = dt > 1e-5 ? (t - k0.time) / dt : 0;
                    const smoothT = localT * localT * (3 - 2 * localT);
                    return k0.value + (k1.value - k0.value) * smoothT;
                }
            }
            return t;
        }

        // --- Curvature-Based Rib Distribution Engine ---
        function evaluateCurvatureDistribution(leCurve, teCurve, count, sensitivity = 2.5) {
            const span = wing.tipLE.x;
            const steps = 120;
            const teRootToTip = [...teCurve].reverse();

            const weights = new Array(steps);
            let totalWeight = 0;

            for (let i = 0; i < steps; i++) {
                const x0 = (i / steps) * span;
                const x1 = ((i + 1) / steps) * span;
                const xm = (x0 + x1) * 0.5;

                const leP0 = sampleYAtX(leCurve, Math.max(0, xm - 0.02));
                const leP1 = sampleYAtX(leCurve, Math.min(span, xm + 0.02));
                const teP0 = sampleYAtX(teRootToTip, Math.max(0, xm - 0.02));
                const teP1 = sampleYAtX(teRootToTip, Math.min(span, xm + 0.02));

                const leSlope = (leP1.y - leP0.y) / Math.max(0.001, leP1.x - leP0.x);
                const teSlope = (teP1.y - teP0.y) / Math.max(0.001, teP1.x - teP0.x);

                const w = 1.0 + sensitivity * (Math.abs(leSlope) + Math.abs(teSlope));
                weights[i] = w;
                totalWeight += w;
            }

            const cdf = new Array(steps + 1);
            cdf[0] = 0;
            let run = 0;
            for (let i = 0; i < steps; i++) {
                run += weights[i];
                cdf[i + 1] = run / totalWeight;
            }

            const distStations = [];
            for (let i = 0; i < count; i++) {
                const targetFrac = i / (count - 1);
                let idx = 0;
                while (idx < steps && cdf[idx + 1] < targetFrac) idx++;
                const f0 = cdf[idx];
                const f1 = cdf[Math.min(steps, idx + 1)];
                const df = f1 - f0;
                const local = df > 1e-6 ? (targetFrac - f0) / df : 0;
                distStations.push((idx + local) / steps);
            }
            return distStations;
        }

        // --- Control Surface Geometry, Overlap Validation & Snapping Engine ---
        function evaluateControlSurfacePolygon(cs, leCurve, teCurve) {
            const x0 = Math.max(0, Math.min(cs.xMin !== undefined ? cs.xMin : (cs.box ? cs.box.xMin : 0), cs.xMax !== undefined ? cs.xMax : (cs.box ? cs.box.xMax : 1)));
            const x1 = Math.min(wing.tipLE.x, Math.max(cs.xMin !== undefined ? cs.xMin : (cs.box ? cs.box.xMin : 0), cs.xMax !== undefined ? cs.xMax : (cs.box ? cs.box.xMax : 1)));

            // Proper fallback resolution for yIn, yOut, yBot
            let yIn = cs.yIn;
            let yOut = cs.yOut;
            let yBot = cs.yBot;

            if (yIn === undefined) {
                if (cs.yMax !== undefined) yIn = cs.yMax;
                else if (cs.box && cs.box.yMax !== undefined) yIn = cs.box.yMax;
                else yIn = 0;
            }
            if (yOut === undefined) {
                if (cs.yMax !== undefined) yOut = cs.yMax;
                else if (cs.box && cs.box.yMax !== undefined) yOut = cs.box.yMax;
                else yOut = 0;
            }
            if (yBot === undefined) {
                if (cs.yMin !== undefined) yBot = cs.yMin;
                else if (cs.box && cs.box.yMin !== undefined) yBot = cs.box.yMin;
                else yBot = -10;
            }

            if (x1 - x0 < 0.02) return null;

            const teRootToTip = [...teCurve].reverse();
            const topPts = [];
            const botPts = [];
            const steps = Math.max(8, Math.floor((x1 - x0) * 40));

            for (let i = 0; i <= steps; i++) {
                const t = i / steps;
                const x = x0 + t * (x1 - x0);
                const lePt = sampleYAtX(leCurve, x);
                const tePt = sampleYAtX(teRootToTip, x);

                const hingeY = yIn + t * (yOut - yIn);

                // Control surface box touching or crossing the Leading Edge is deemed invalid
                if (hingeY >= lePt.y - 0.005) {
                    return null;
                }

                // Outside wing trailing edge
                if (hingeY <= tePt.y + 0.005) {
                    return null;
                }

                const boundedTop = hingeY;
                const boundedBot = Math.max(yBot, tePt.y);

                if (boundedTop <= boundedBot + 0.001) {
                    return null;
                }

                topPts.push({ x: x, y: boundedTop });
                botPts.push({ x: x, y: boundedBot });
            }

            const poly = [...topPts, ...botPts.reverse()];
            return poly;
        }

        function checkControlSurfaceCollision(box, ignoreIndex = -1) {
            const x0 = Math.max(0, Math.min(box.xMin, box.xMax));
            const x1 = Math.min(wing.tipLE.x, Math.max(box.xMin, box.xMax));
            const y0 = Math.min(box.yMin !== undefined ? box.yMin : (box.yBot !== undefined ? box.yBot : -10), box.yMax !== undefined ? box.yMax : 0);
            const y1 = Math.max(box.yMin !== undefined ? box.yMin : (box.yBot !== undefined ? box.yBot : -10), box.yMax !== undefined ? box.yMax : 0);

            if (x1 - x0 < 0.02 || y1 - y0 < 0.01) {
                return { valid: false, reason: "Box too small" };
            }

            // Check if box touches or extends past the Leading Edge (LE)
            const leCurve = view.lastLeCurve || [];
            if (leCurve.length > 0) {
                const steps = 10;
                for (let i = 0; i <= steps; i++) {
                    const x = x0 + (i / steps) * (x1 - x0);
                    const lePt = sampleYAtX(leCurve, x);
                    const hingeY = (box.yIn !== undefined && box.yOut !== undefined)
                        ? box.yIn + (i / steps) * (box.yOut - box.yIn)
                        : y1;
                    if (hingeY >= lePt.y - 0.005) {
                        return { valid: false, reason: "Touches Leading Edge" };
                    }
                }
            }

            // Check overlap with existing control surfaces (allowing touching adjacent edges)
            for (let i = 0; i < wing.controlSurfaces.length; i++) {
                if (i === ignoreIndex) continue;
                const cs = wing.controlSurfaces[i];
                const cx0 = Math.min(cs.xMin !== undefined ? cs.xMin : cs.box.xMin, cs.xMax !== undefined ? cs.xMax : cs.box.xMax);
                const cx1 = Math.max(cs.xMin !== undefined ? cs.xMin : cs.box.xMin, cs.xMax !== undefined ? cs.xMax : cs.box.xMax);
                const cy0 = Math.min(cs.yBot !== undefined ? cs.yBot : (cs.box ? cs.box.yMin : -10), cs.yIn !== undefined ? Math.min(cs.yIn, cs.yOut) : (cs.box ? cs.box.yMin : -10));
                const cy1 = cs.yIn !== undefined ? Math.max(cs.yIn, cs.yOut) : (cs.box ? cs.box.yMax : 0);

                // AABB Intersection check with tolerance
                const overlapX = !(x1 <= cx0 + 0.001 || x0 >= cx1 - 0.001);
                const overlapY = !(y1 <= cy0 + 0.001 || y0 >= cy1 - 0.001);

                if (overlapX && overlapY) {
                    return { valid: false, reason: `Overlaps with ${cs.name}` };
                }
            }

            return { valid: true, reason: "" };
        }

function isSameHandle(h1, h2) {
            if (!h1 || !h2) return false;
            if (typeof h1 === 'string' && typeof h2 === 'string') return h1 === h2;
            if (typeof h1 === 'object' && typeof h2 === 'object') return h1.type === h2.type && h1.index === h2.index;
            return false;
        }
