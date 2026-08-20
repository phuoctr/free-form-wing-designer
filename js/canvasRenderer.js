// ============================================================================
// 2D Canvas Viewport Renderer (Wing, Ribs, Control Surfaces, Handles)
// ============================================================================

// --- Render Loop ---
        function render() {
            const dpr = window.devicePixelRatio || 1;
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
            const w = canvas.width / dpr;
            const h = canvas.height / dpr;

            // Clear background
            ctx.fillStyle = '#14161b';
            ctx.fillRect(0, 0, w, h);

            // 1. Grid Lines
            drawGrid(w, h);

            // 2. Reference Coordinate Axes
            drawAxes(w, h);

            // Build full curves
            wing.rootLE.x = 0;
            wing.rootTE.x = 0;

            const isSimple = wing.designMode === 'simple';
            const tipTE = getTipTE();

            let leCurve, teCurve;
            if (isSimple) {
                // Simplified 4-point straight trapezoid
                leCurve = [ { x: 0, y: wing.rootLE.y }, { x: wing.tipLE.x, y: wing.tipLE.y } ];
                teCurve = [ { x: tipTE.x, y: tipTE.y }, { x: 0, y: wing.rootTE.y } ];
            } else {
                wing.leKnots.sort((a, b) => a.x - b.x);
                wing.teKnots.sort((a, b) => a.x - b.x);

                const rawLE = [wing.rootLE, ...wing.leKnots, wing.tipLE];
                const rawTE = [tipTE, ...[...wing.teKnots].reverse(), wing.rootTE];

                const startLETan = wing.useTangents ? wing.rootLeTan : null;
                const endLETan = wing.useTangents ? { x: -wing.tipLeTan.x, y: -wing.tipLeTan.y } : null;
                leCurve = sampleCurve(rawLE, startLETan, endLETan, 60);

                const startTETan = wing.useTangents ? wing.tipTeTan : null;
                const endTETan = wing.useTangents ? { x: -wing.rootTeTan.x, y: -wing.rootTeTan.y } : null;
                teCurve = sampleCurve(rawTE, startTETan, endTETan, 60);
            }

            view.lastLeCurve = leCurve;
            view.lastTeCurve = teCurve;
            const fullPoly = [...leCurve, ...teCurve];

            // 3. Draw Mirrored Opposite Wing
            if (wing.showMirrored) {
                drawMirroredWing(fullPoly, leCurve, teCurve);
            }

            // 4. Draw Main Wing Skin & Outlines
            drawWingSkin(fullPoly, leCurve, teCurve, tipTE);

            // 5. Draw Control Surfaces
            drawControlSurfaces(leCurve, teCurve);

            // 6. Draw Internal Ribs
            if (wing.showRibs) {
                drawRibs(leCurve, teCurve);
            }

            // 7. Calculate & Draw MAC (Mean Aerodynamic Chord)
            const macData = calculateMAC(leCurve, teCurve);
            if (wing.showMAC) {
                drawMAC(macData);
            }

            // 8. Tangent indicator lines (Spline Mode only)
            if (wing.useTangents && !isSimple) {
                drawTangentArms(tipTE);
            }

            // 9. Interactive Handles (4 Corner handles in Simple mode, full handles in Spline mode)
            drawHandles(tipTE);

            // 10. Draw Active Creation Box (if dragging)
            if (view.drawBox) {
                drawCreationBox(leCurve, teCurve);
            }

            // Update Metrics HUD
            updateMetrics(fullPoly, macData);
        }

        function drawGrid(w, h) {
            const minW = screenToWorld(0, h);
            const maxW = screenToWorld(w, 0);

            const stepMinor = wing.gridSnapStep || 0.05;
            const stepMajor = 0.20;

            ctx.lineWidth = 1;

            const startX = Math.floor(minW.x / stepMinor) * stepMinor;
            const endX = Math.ceil(maxW.x / stepMinor) * stepMinor;
            const startY = Math.floor(minW.y / stepMinor) * stepMinor;
            const endY = Math.ceil(maxW.y / stepMinor) * stepMinor;

            for (let x = startX; x <= endX; x += stepMinor) {
                const isMajor = Math.abs(x % stepMajor) < 0.001 || Math.abs(Math.abs(x % stepMajor) - stepMajor) < 0.001;
                ctx.strokeStyle = isMajor ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.03)';
                const p1 = worldToScreen(x, minW.y);
                const p2 = worldToScreen(x, maxW.y);
                ctx.beginPath();
                ctx.moveTo(p1.x, p1.y);
                ctx.lineTo(p2.x, p2.y);
                ctx.stroke();
            }

            for (let y = startY; y <= endY; y += stepMinor) {
                const isMajor = Math.abs(y % stepMajor) < 0.001 || Math.abs(Math.abs(y % stepMajor) - stepMajor) < 0.001;
                ctx.strokeStyle = isMajor ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.03)';
                const p1 = worldToScreen(minW.x, y);
                const p2 = worldToScreen(maxW.x, y);
                ctx.beginPath();
                ctx.moveTo(p1.x, p1.y);
                ctx.lineTo(p2.x, p2.y);
                ctx.stroke();
            }
        }

        function drawAxes(w, h) {
            const origin = worldToScreen(0, 0);

            // Spanwise X-Axis (Red)
            ctx.strokeStyle = 'rgba(239, 68, 68, 0.7)';
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.moveTo(0, origin.y);
            ctx.lineTo(w, origin.y);
            ctx.stroke();

            // Centerline Y-Axis (Green)
            ctx.strokeStyle = 'rgba(74, 222, 128, 0.8)';
            ctx.lineWidth = 2.0;
            ctx.beginPath();
            ctx.moveTo(origin.x, 0);
            ctx.lineTo(origin.x, h);
            ctx.stroke();
        }

        function drawWingSkin(poly, leCurve, teCurve, tipTE) {
            if (poly.length < 3) return;

            // Filled skin
            ctx.fillStyle = 'rgba(56, 189, 248, 0.14)';
            ctx.beginPath();
            const p0 = worldToScreen(poly[0].x, poly[0].y);
            ctx.moveTo(p0.x, p0.y);
            for (let i = 1; i < poly.length; i++) {
                const p = worldToScreen(poly[i].x, poly[i].y);
                ctx.lineTo(p.x, p.y);
            }
            ctx.closePath();
            ctx.fill();

            // Leading Edge (Cyan)
            ctx.strokeStyle = '#38bdf8';
            ctx.lineWidth = 2.5;
            ctx.beginPath();
            const le0 = worldToScreen(leCurve[0].x, leCurve[0].y);
            ctx.moveTo(le0.x, le0.y);
            for (let i = 1; i < leCurve.length; i++) {
                const p = worldToScreen(leCurve[i].x, leCurve[i].y);
                ctx.lineTo(p.x, p.y);
            }
            ctx.stroke();

            // Trailing Edge (Orange)
            ctx.strokeStyle = '#fb923c';
            ctx.lineWidth = 2.5;
            ctx.beginPath();
            const te0 = worldToScreen(teCurve[0].x, teCurve[0].y);
            ctx.moveTo(te0.x, te0.y);
            for (let i = 1; i < teCurve.length; i++) {
                const p = worldToScreen(teCurve[i].x, teCurve[i].y);
                ctx.lineTo(p.x, p.y);
            }
            ctx.stroke();

            // Root line
            ctx.strokeStyle = '#4ade80';
            ctx.lineWidth = 2.5;
            const rLE = worldToScreen(wing.rootLE.x, wing.rootLE.y);
            const rTE = worldToScreen(wing.rootTE.x, wing.rootTE.y);
            ctx.beginPath();
            ctx.moveTo(rLE.x, rLE.y);
            ctx.lineTo(rTE.x, rTE.y);
            ctx.stroke();

            // Tip line
            ctx.strokeStyle = 'rgba(255,255,255,0.7)';
            ctx.lineWidth = 2.0;
            const tLE = worldToScreen(wing.tipLE.x, wing.tipLE.y);
            const tTE = worldToScreen(tipTE.x, tipTE.y);
            ctx.beginPath();
            ctx.moveTo(tLE.x, tLE.y);
            ctx.lineTo(tTE.x, tTE.y);
            ctx.stroke();
        }

        function drawMirroredWing(poly, leCurve, teCurve) {
            ctx.fillStyle = 'rgba(56, 189, 248, 0.05)';
            ctx.beginPath();
            const p0 = worldToScreen(-poly[0].x, poly[0].y);
            ctx.moveTo(p0.x, p0.y);
            for (let i = 1; i < poly.length; i++) {
                const p = worldToScreen(-poly[i].x, poly[i].y);
                ctx.lineTo(p.x, p.y);
            }
            ctx.closePath();
            ctx.fill();

            // Mirrored Outlines
            ctx.strokeStyle = 'rgba(56, 189, 248, 0.35)';
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            const le0 = worldToScreen(-leCurve[0].x, leCurve[0].y);
            ctx.moveTo(le0.x, le0.y);
            for (let i = 1; i < leCurve.length; i++) {
                const p = worldToScreen(-leCurve[i].x, leCurve[i].y);
                ctx.lineTo(p.x, p.y);
            }
            ctx.stroke();

            ctx.strokeStyle = 'rgba(251, 146, 60, 0.35)';
            ctx.beginPath();
            const te0 = worldToScreen(-teCurve[0].x, teCurve[0].y);
            ctx.moveTo(te0.x, te0.y);
            for (let i = 1; i < teCurve.length; i++) {
                const p = worldToScreen(-teCurve[i].x, teCurve[i].y);
                ctx.lineTo(p.x, p.y);
            }
            ctx.stroke();
        }

        function drawControlSurfaces(leCurve, teCurve) {
            const teRootToTip = [...teCurve].reverse();

            wing.controlSurfaces.forEach((cs, idx) => {
                if (cs.xMin === undefined) cs.xMin = cs.box ? cs.box.xMin : 0.2;
                if (cs.xMax === undefined) cs.xMax = cs.box ? cs.box.xMax : 0.8;
                if (cs.yIn === undefined) cs.yIn = cs.box ? Math.max(cs.box.yMin, cs.box.yMax) : -0.3;
                if (cs.yOut === undefined) cs.yOut = cs.box ? Math.max(cs.box.yMin, cs.box.yMax) : -0.3;
                if (cs.yBot === undefined) cs.yBot = cs.box ? Math.min(cs.box.yMin, cs.box.yMax) : -10;

                const poly = evaluateControlSurfacePolygon(cs, leCurve, teCurve);
                if (!poly || poly.length < 3) return;

                const isHover = view.hoverCSIndex === idx;
                const isSelected = view.selectedCSIndex === idx;

                // Filled surface
                ctx.fillStyle = isSelected 
                    ? 'rgba(192, 132, 252, 0.55)' 
                    : (isHover ? 'rgba(192, 132, 252, 0.42)' : 'rgba(192, 132, 252, 0.28)');
                ctx.beginPath();
                const p0 = worldToScreen(poly[0].x, poly[0].y);
                ctx.moveTo(p0.x, p0.y);
                for (let i = 1; i < poly.length; i++) {
                    const p = worldToScreen(poly[i].x, poly[i].y);
                    ctx.lineTo(p.x, p.y);
                }
                ctx.closePath();
                ctx.fill();

                // Surface Outline
                ctx.strokeStyle = isSelected ? '#facc15' : (isHover ? '#fff' : '#c084fc');
                ctx.lineWidth = isSelected ? 2.5 : 1.5;
                ctx.stroke();

                // Draw Hinge line (top boundary of control surface)
                const sHingeIn = worldToScreen(cs.xMin, cs.yIn);
                const sHingeOut = worldToScreen(cs.xMax, cs.yOut);
                ctx.strokeStyle = isSelected ? '#facc15' : 'rgba(250, 204, 21, 0.8)';
                ctx.lineWidth = isSelected ? 2.5 : 1.8;
                ctx.setLineDash([4, 3]);
                ctx.beginPath();
                ctx.moveTo(sHingeIn.x, sHingeIn.y);
                ctx.lineTo(sHingeOut.x, sHingeOut.y);
                ctx.stroke();
                ctx.setLineDash([]);

                // Label
                const midX = (cs.xMin + cs.xMax) * 0.5;
                const midY = (cs.yIn + cs.yOut) * 0.5;
                const sm = worldToScreen(midX, midY);
                ctx.font = '10px sans-serif';
                ctx.textAlign = 'center';
                ctx.fillStyle = '#fff';
                ctx.fillText(cs.name, sm.x, sm.y + 14);

                // If Selected or Hovered: Draw the 4 interactive control point handles!
                if (isSelected || isHover) {
                    const teIn = sampleYAtX(teRootToTip, cs.xMin);
                    const teOut = sampleYAtX(teRootToTip, cs.xMax);
                    const midLeftY = (cs.yIn + teIn.y) * 0.5;
                    const midRightY = (cs.yOut + teOut.y) * 0.5;

                    // 1. Inboard Hinge Point (Y-adjustable)
                    drawDiamondHandle({ x: cs.xMin, y: cs.yIn }, '#c084fc', `In Hinge Y`, { type: 'cs_hinge_in', index: idx }, 7);

                    // 2. Outboard Hinge Point (Y-adjustable)
                    drawDiamondHandle({ x: cs.xMax, y: cs.yOut }, '#c084fc', `Out Hinge Y`, { type: 'cs_hinge_out', index: idx }, 7);

                    // 3. Inboard Edge (Left Span X-adjustable)
                    drawSquareHandle({ x: cs.xMin, y: midLeftY }, '#38bdf8', `Left Edge X`, { type: 'cs_edge_left', index: idx }, 9);

                    // 4. Outboard Edge (Right Span X-adjustable)
                    drawSquareHandle({ x: cs.xMax, y: midRightY }, '#38bdf8', `Right Edge X`, { type: 'cs_edge_right', index: idx }, 9);
                }

                // Mirrored Control Surface
                if (wing.showMirrored) {
                    ctx.fillStyle = 'rgba(192, 132, 252, 0.18)';
                    ctx.beginPath();
                    const mp0 = worldToScreen(-poly[0].x, poly[0].y);
                    ctx.moveTo(mp0.x, mp0.y);
                    for (let i = 1; i < poly.length; i++) {
                        const p = worldToScreen(-poly[i].x, poly[i].y);
                        ctx.lineTo(p.x, p.y);
                    }
                    ctx.closePath();
                    ctx.fill();

                    ctx.strokeStyle = 'rgba(192, 132, 252, 0.4)';
                    ctx.lineWidth = 1.0;
                    ctx.stroke();
                }
            });
        }

        function drawCreationBox(leCurve, teCurve) {
            const b = view.drawBox;
            const x0 = Math.min(b.start.x, b.current.x);
            const x1 = Math.max(b.start.x, b.current.x);
            const y0 = Math.min(b.start.y, b.current.y);
            const y1 = Math.max(b.start.y, b.current.y);

            const testBox = { 
                xMin: x0, 
                xMax: x1, 
                yMin: y0, 
                yMax: y1,
                yIn: y1,
                yOut: y1,
                yBot: y0,
                box: { xMin: x0, xMax: x1, yMin: y0, yMax: y1 }
            };
            const collision = checkControlSurfaceCollision(testBox);
            const poly = evaluateControlSurfacePolygon(testBox, leCurve, teCurve);
            b.isValid = collision.valid && (poly !== null);
            b.error = !collision.valid ? collision.reason : (!poly ? "Outside wing trailing edge" : "");

            // Screen box
            const s0 = worldToScreen(x0, y1);
            const s1 = worldToScreen(x1, y0);
            const bw = s1.x - s0.x;
            const bh = s1.y - s0.y;

            if (b.isValid && poly) {
                // Draw Valid Overlapped Wing Region (Green/Cyan)
                ctx.fillStyle = 'rgba(74, 222, 128, 0.35)';
                ctx.beginPath();
                const p0 = worldToScreen(poly[0].x, poly[0].y);
                ctx.moveTo(p0.x, p0.y);
                for (let i = 1; i < poly.length; i++) {
                    const p = worldToScreen(poly[i].x, poly[i].y);
                    ctx.lineTo(p.x, p.y);
                }
                ctx.closePath();
                ctx.fill();

                // Draw bounding box
                ctx.strokeStyle = '#4ade80';
                ctx.lineWidth = 1.5;
                ctx.setLineDash([4, 4]);
                ctx.strokeRect(s0.x, s0.y, bw, bh);
                ctx.setLineDash([]);

                // Tooltip status
                ctx.font = '11px sans-serif';
                ctx.fillStyle = '#4ade80';
                ctx.textAlign = 'left';
                ctx.fillText(`✓ Ready (${(x1-x0).toFixed(3)}m span)`, s1.x + 8, s1.y);
            } else {
                // Invalid / Overlapping -> Turn Solid Red!
                ctx.fillStyle = 'rgba(239, 68, 68, 0.25)';
                ctx.fillRect(s0.x, s0.y, bw, bh);

                ctx.strokeStyle = '#ef4444';
                ctx.lineWidth = 2.0;
                ctx.setLineDash([4, 4]);
                ctx.strokeRect(s0.x, s0.y, bw, bh);
                ctx.setLineDash([]);

                // Error Tooltip
                ctx.font = '11px sans-serif';
                ctx.fillStyle = '#f87171';
                ctx.textAlign = 'left';
                ctx.fillText(`⛔ ${b.error || "Invalid overlap"}`, s1.x + 8, s1.y);
            }
        }

        function drawRibs(leCurve, teCurve) {
            const teRootToTip = [...teCurve].reverse();
            const span = wing.tipLE.x;
            const n = wing.ribCount;

            ctx.font = '10px sans-serif';
            ctx.textAlign = 'center';

            let fractions = [];
            if (wing.ribMode === 'curvature') {
                fractions = evaluateCurvatureDistribution(leCurve, teCurve, n, wing.curvatureSensitivity);
            } else {
                for (let i = 0; i < n; i++) {
                    const linearT = i / (n - 1);
                    fractions.push(evaluateAnimationCurve(linearT));
                }
            }

            for (let i = 0; i < n; i++) {
                const distT = fractions[i];
                const spanX = distT * span;

                const lePt = sampleYAtX(leCurve, spanX);
                const tePt = sampleYAtX(teRootToTip, spanX);

                const sLE = worldToScreen(lePt.x, lePt.y);
                const sTE = worldToScreen(tePt.x, tePt.y);

                // Dotted rib line
                ctx.strokeStyle = 'rgba(147, 197, 253, 0.65)';
                ctx.lineWidth = 1.5;
                ctx.setLineDash([4, 4]);
                ctx.beginPath();
                ctx.moveTo(sLE.x, sLE.y);
                ctx.lineTo(sTE.x, sTE.y);
                ctx.stroke();
                ctx.setLineDash([]);

                // Small node markers
                ctx.fillStyle = '#93c5fd';
                ctx.beginPath();
                ctx.arc(sLE.x, sLE.y, 2.5, 0, Math.PI * 2);
                ctx.arc(sTE.x, sTE.y, 2.5, 0, Math.PI * 2);
                ctx.fill();

                // Optional label
                if (wing.showRibLabels) {
                    const chord = Math.max(0.001, lePt.y - tePt.y);
                    const midY = (sLE.y + sTE.y) * 0.5;
                    ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
                    ctx.fillText(`R${i + 1}`, sLE.x, midY - 4);
                    ctx.fillStyle = 'rgba(147, 197, 253, 0.7)';
                    ctx.fillText(`${chord.toFixed(3)}m`, sLE.x, midY + 8);
                }

                // Mirrored rib
                if (wing.showMirrored) {
                    const msLE = worldToScreen(-lePt.x, lePt.y);
                    const msTE = worldToScreen(-tePt.x, tePt.y);
                    ctx.strokeStyle = 'rgba(147, 197, 253, 0.25)';
                    ctx.setLineDash([3, 4]);
                    ctx.beginPath();
                    ctx.moveTo(msLE.x, msLE.y);
                    ctx.lineTo(msTE.x, msTE.y);
                    ctx.stroke();
                    ctx.setLineDash([]);
                }
            }
        }

        function drawTangentArms(tipTE) {
            ctx.setLineDash([3, 3]);

            // Root LE Tangent
            if (wing.rootLE.mode !== 'sharp') {
                const rLE = worldToScreen(wing.rootLE.x, wing.rootLE.y);
                const rLETan = worldToScreen(wing.rootLE.x + wing.rootLeTan.x, wing.rootLE.y + wing.rootLeTan.y);
                ctx.strokeStyle = 'rgba(74, 222, 128, 0.7)';
                ctx.beginPath(); ctx.moveTo(rLE.x, rLE.y); ctx.lineTo(rLETan.x, rLETan.y); ctx.stroke();
            }

            // Root TE Tangent
            if (wing.rootTE.mode !== 'sharp') {
                const rTE = worldToScreen(wing.rootTE.x, wing.rootTE.y);
                const rTETan = worldToScreen(wing.rootTE.x + wing.rootTeTan.x, wing.rootTE.y + wing.rootTeTan.y);
                ctx.strokeStyle = 'rgba(74, 222, 128, 0.7)';
                ctx.beginPath(); ctx.moveTo(rTE.x, rTE.y); ctx.lineTo(rTETan.x, rTETan.y); ctx.stroke();
            }

            // Tip LE Tangent
            if (wing.tipLE.mode !== 'sharp') {
                const tLE = worldToScreen(wing.tipLE.x, wing.tipLE.y);
                const tLETan = worldToScreen(wing.tipLE.x + wing.tipLeTan.x, wing.tipLE.y + wing.tipLeTan.y);
                ctx.strokeStyle = 'rgba(56, 189, 248, 0.7)';
                ctx.beginPath(); ctx.moveTo(tLE.x, tLE.y); ctx.lineTo(tLETan.x, tLETan.y); ctx.stroke();
            }

            // Tip TE Tangent
            if (wing.tipTE.mode !== 'sharp') {
                const tTE = worldToScreen(tipTE.x, tipTE.y);
                const tTETan = worldToScreen(tipTE.x + wing.tipTeTan.x, tipTE.y + wing.tipTeTan.y);
                ctx.strokeStyle = 'rgba(251, 146, 60, 0.7)';
                ctx.beginPath(); ctx.moveTo(tTE.x, tTE.y); ctx.lineTo(tTETan.x, tTETan.y); ctx.stroke();
            }

            // Intermediate LE Knots Dual Tangents
            wing.leKnots.forEach((pt, i) => {
                if (pt.mode !== 'sharp') {
                    const sp = worldToScreen(pt.x, pt.y);
                    const tOut = pt.tanOut || pt.tan || { x: 0.15, y: 0 };
                    const tIn = pt.tanIn || { x: -tOut.x, y: -tOut.y };

                    // Outgoing arm (Yellow)
                    const sOut = worldToScreen(pt.x + tOut.x, pt.y + tOut.y);
                    ctx.strokeStyle = 'rgba(250, 204, 21, 0.85)';
                    ctx.beginPath(); ctx.moveTo(sp.x, sp.y); ctx.lineTo(sOut.x, sOut.y); ctx.stroke();

                    // Incoming arm (Cyan)
                    const sIn = worldToScreen(pt.x + tIn.x, pt.y + tIn.y);
                    ctx.strokeStyle = 'rgba(56, 189, 248, 0.85)';
                    ctx.beginPath(); ctx.moveTo(sp.x, sp.y); ctx.lineTo(sIn.x, sIn.y); ctx.stroke();
                }
            });

            // Intermediate TE Knots Dual Tangents
            wing.teKnots.forEach((pt, i) => {
                if (pt.mode !== 'sharp') {
                    const sp = worldToScreen(pt.x, pt.y);
                    const tOut = pt.tanOut || pt.tan || { x: -0.15, y: 0 };
                    const tIn = pt.tanIn || { x: -tOut.x, y: -tOut.y };

                    // Outgoing arm (Yellow)
                    const sOut = worldToScreen(pt.x + tOut.x, pt.y + tOut.y);
                    ctx.strokeStyle = 'rgba(250, 204, 21, 0.85)';
                    ctx.beginPath(); ctx.moveTo(sp.x, sp.y); ctx.lineTo(sOut.x, sOut.y); ctx.stroke();

                    // Incoming arm (Orange)
                    const sIn = worldToScreen(pt.x + tIn.x, pt.y + tIn.y);
                    ctx.strokeStyle = 'rgba(251, 146, 60, 0.85)';
                    ctx.beginPath(); ctx.moveTo(sp.x, sp.y); ctx.lineTo(sIn.x, sIn.y); ctx.stroke();
                }
            });

            ctx.setLineDash([]);
        }

        function drawHandles(tipTE) {
            const isSimple = wing.designMode === 'simple';

            // Primary 4 Corner Anchors
            if (wing.rootLE.mode === 'sharp') {
                drawSquareHandle(wing.rootLE, '#4ade80', 'Root LE [Sharp]', 'rootLE');
            } else {
                drawDiamondHandle(wing.rootLE, '#4ade80', 'Root LE', 'rootLE');
            }

            if (wing.rootTE.mode === 'sharp') {
                drawSquareHandle(wing.rootTE, '#4ade80', 'Root TE [Sharp]', 'rootTE');
            } else {
                drawDiamondHandle(wing.rootTE, '#4ade80', 'Root TE', 'rootTE');
            }

            if (wing.tipLE.mode === 'sharp') {
                drawSquareHandle(wing.tipLE, '#38bdf8', 'Tip LE [Sharp]', 'tipLE');
            } else {
                drawCircleHandle(wing.tipLE, '#38bdf8', 'Tip LE', 'tipLE');
            }

            if (wing.tipTE.mode === 'sharp') {
                drawSquareHandle(tipTE, '#fb923c', 'Tip TE [Sharp]', 'tipTE');
            } else {
                drawCircleHandle(tipTE, '#fb923c', 'Tip TE', 'tipTE');
            }

            // Tip Edge Handle (Move both Tip LE and Tip TE together)
            const midTip = { x: (wing.tipLE.x + tipTE.x) * 0.5, y: (wing.tipLE.y + tipTE.y) * 0.5 };
            drawSquareHandle(midTip, '#38bdf8', 'Tip Edge (Move Both)', 'tipEdge', 8);

            // Tangent & Intermediate Knots (Spline Mode Only)
            if (!isSimple) {
                if (wing.useTangents) {
                    if (wing.rootLE.mode !== 'sharp') {
                        drawCircleHandle({ x: wing.rootLE.x + wing.rootLeTan.x, y: wing.rootLE.y + wing.rootLeTan.y }, '#facc15', 'Root LE Tan', 'rootLeTan', 5.5);
                    }
                    if (wing.rootTE.mode !== 'sharp') {
                        drawCircleHandle({ x: wing.rootTE.x + wing.rootTeTan.x, y: wing.rootTE.y + wing.rootTeTan.y }, '#facc15', 'Root TE Tan', 'rootTeTan', 5.5);
                    }
                    if (wing.tipLE.mode !== 'sharp') {
                        drawCircleHandle({ x: wing.tipLE.x + wing.tipLeTan.x, y: wing.tipLE.y + wing.tipLeTan.y }, '#facc15', 'Tip LE Tan', 'tipLeTan', 5.5);
                    }
                    if (wing.tipTE.mode !== 'sharp') {
                        drawCircleHandle({ x: tipTE.x + wing.tipTeTan.x, y: tipTE.y + wing.tipTeTan.y }, '#facc15', 'Tip TE Tan', 'tipTeTan', 5.5);
                    }
                }

                wing.leKnots.forEach((pt, i) => {
                    const isSharp = pt.mode === 'sharp';
                    if (isSharp) {
                        drawSquareHandle(pt, '#60a5fa', `LE #${i + 1} [Sharp]`, { type: 'leKnot', index: i });
                    } else {
                        drawCircleHandle(pt, '#60a5fa', `LE #${i + 1} [${pt.mode === 'broken' ? 'Split' : 'Smooth'}]`, { type: 'leKnot', index: i });
                        if (wing.useTangents) {
                            const tOut = pt.tanOut || pt.tan || { x: 0.15, y: 0 };
                            const tIn = pt.tanIn || { x: -tOut.x, y: -tOut.y };
                            drawCircleHandle({ x: pt.x + tOut.x, y: pt.y + tOut.y }, '#facc15', `LE #${i + 1} Out`, { type: 'leKnotTanOut', index: i }, 4.8);
                            drawCircleHandle({ x: pt.x + tIn.x, y: pt.y + tIn.y }, '#38bdf8', `LE #${i + 1} In`, { type: 'leKnotTanIn', index: i }, 4.8);
                        }
                    }
                });

                wing.teKnots.forEach((pt, i) => {
                    const isSharp = pt.mode === 'sharp';
                    if (isSharp) {
                        drawSquareHandle(pt, '#f97316', `TE #${i + 1} [Sharp]`, { type: 'teKnot', index: i });
                    } else {
                        drawCircleHandle(pt, '#f97316', `TE #${i + 1} [${pt.mode === 'broken' ? 'Split' : 'Smooth'}]`, { type: 'teKnot', index: i });
                        if (wing.useTangents) {
                            const tOut = pt.tanOut || pt.tan || { x: -0.15, y: 0 };
                            const tIn = pt.tanIn || { x: -tOut.x, y: -tOut.y };
                            drawCircleHandle({ x: pt.x + tOut.x, y: pt.y + tOut.y }, '#facc15', `TE #${i + 1} Out`, { type: 'teKnotTanOut', index: i }, 4.8);
                            drawCircleHandle({ x: pt.x + tIn.x, y: pt.y + tIn.y }, '#fb923c', `TE #${i + 1} In`, { type: 'teKnotTanIn', index: i }, 4.8);
                        }
                    }
                });
            }
        }

        function drawSquareHandle(pt, color, label, id, size = 12) {
            const s = worldToScreen(pt.x, pt.y);
            const isHover = isSameHandle(view.hoverHandle, id);
            const isActive = isSameHandle(view.activeHandle, id);

            ctx.fillStyle = isActive ? '#facc15' : (isHover ? '#fff' : color);
            ctx.fillRect(s.x - size / 2, s.y - size / 2, size, size);
            ctx.strokeStyle = '#000';
            ctx.lineWidth = 1.5;
            ctx.strokeRect(s.x - size / 2, s.y - size / 2, size, size);

            // Label: only show if explicitly enabled, or on hover / active
            if (wing.showPointLabels || isHover || isActive) {
                ctx.font = '10px sans-serif';
                ctx.fillStyle = isHover || isActive ? '#fff' : 'rgba(255,255,255,0.7)';
                ctx.textAlign = 'left';
                ctx.fillText(`${label} (${pt.x.toFixed(3)}, ${pt.y.toFixed(3)})`, s.x + 10, s.y + 3);
            }
        }

        function drawDiamondHandle(pt, color, label, id, size = 8) {
            const s = worldToScreen(pt.x, pt.y);
            const isHover = isSameHandle(view.hoverHandle, id);
            const isActive = isSameHandle(view.activeHandle, id);

            ctx.fillStyle = isActive ? '#facc15' : (isHover ? '#fff' : color);
            ctx.beginPath();
            ctx.moveTo(s.x, s.y - size);
            ctx.lineTo(s.x + size, s.y);
            ctx.lineTo(s.x, s.y + size);
            ctx.lineTo(s.x - size, s.y);
            ctx.closePath();
            ctx.fill();
            ctx.strokeStyle = '#000';
            ctx.lineWidth = 1.5;
            ctx.stroke();

            // Label: only show if explicitly enabled, or on hover / active
            if (wing.showPointLabels || isHover || isActive) {
                ctx.font = '10px sans-serif';
                ctx.fillStyle = isHover || isActive ? '#fff' : 'rgba(255,255,255,0.7)';
                ctx.textAlign = 'left';
                ctx.fillText(`${label} [Y:${pt.y.toFixed(3)}]`, s.x + 12, s.y + 3);
            }
        }

        function drawCircleHandle(pt, color, label, id, radius = 7) {
            const s = worldToScreen(pt.x, pt.y);
            const isHover = isSameHandle(view.hoverHandle, id);
            const isActive = isSameHandle(view.activeHandle, id);

            ctx.fillStyle = isActive ? '#facc15' : (isHover ? '#fff' : color);
            ctx.beginPath();
            ctx.arc(s.x, s.y, radius, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = '#000';
            ctx.lineWidth = 1.5;
            ctx.stroke();

            // Label: only show if explicitly enabled, or on hover / active
            if (wing.showPointLabels || isHover || isActive) {
                ctx.font = '10px sans-serif';
                ctx.fillStyle = isHover || isActive ? '#fff' : 'rgba(255,255,255,0.7)';
                ctx.textAlign = 'left';
                ctx.fillText(`${label} (${pt.x.toFixed(3)}, ${pt.y.toFixed(3)})`, s.x + 10, s.y + 3);
            }
        }
