// ============================================================================
// Animation Curve Editor Canvas Widget
// ============================================================================

// --- Interactive Animation Curve Canvas Editor ---
        function renderCurveEditor() {
            const cCtx = curveEditor.ctx;
            const cCanvas = curveEditor.canvas;
            const dpr = window.devicePixelRatio || 1;
            cCtx.setTransform(dpr, 0, 0, dpr, 0, 0);

            const cw = cCanvas.width / dpr;
            const ch = cCanvas.height / dpr;
            const p = curveEditor.padding;
            const dw = cw - p * 2;
            const dh = ch - p * 2;

            // Background
            cCtx.fillStyle = '#0d0e12';
            cCtx.fillRect(0, 0, cw, ch);

            // Grid lines (0, 0.25, 0.5, 0.75, 1.0)
            cCtx.strokeStyle = 'rgba(255,255,255,0.06)';
            cCtx.lineWidth = 1;
            for (let i = 0; i <= 4; i++) {
                const frac = i / 4;
                const gx = p + frac * dw;
                const gy = p + (1 - frac) * dh;

                cCtx.beginPath(); cCtx.moveTo(gx, p); cCtx.lineTo(gx, p + dh); cCtx.stroke();
                cCtx.beginPath(); cCtx.moveTo(p, gy); cCtx.lineTo(p + dw, gy); cCtx.stroke();
            }

            // Diagonal baseline
            cCtx.strokeStyle = 'rgba(255,255,255,0.12)';
            cCtx.setLineDash([2, 2]);
            cCtx.beginPath(); cCtx.moveTo(p, p + dh); cCtx.lineTo(p + dw, p); cCtx.stroke();
            cCtx.setLineDash([]);

            // Draw smooth evaluated curve line
            cCtx.strokeStyle = '#38bdf8';
            cCtx.lineWidth = 2.0;
            cCtx.beginPath();
            for (let s = 0; s <= 60; s++) {
                const t = s / 60;
                const v = evaluateAnimationCurve(t);
                const px = p + t * dw;
                const py = p + (1 - v) * dh;
                if (s === 0) cCtx.moveTo(px, py);
                else cCtx.lineTo(px, py);
            }
            cCtx.stroke();

            // Draw Keyframe Nodes
            wing.ribCurveKeys.forEach((k, idx) => {
                const kx = p + k.time * dw;
                const ky = p + (1 - k.value) * dh;

                const isHover = curveEditor.hoverKey === idx;
                const isDrag = curveEditor.dragKey === idx;

                cCtx.fillStyle = isDrag ? '#facc15' : (isHover ? '#fff' : '#38bdf8');
                cCtx.beginPath();
                cCtx.arc(kx, ky, 4.5, 0, Math.PI * 2);
                cCtx.fill();
                cCtx.strokeStyle = '#000';
                cCtx.lineWidth = 1.5;
                cCtx.stroke();
            });
        }

        curveEditor.canvas.addEventListener('mousedown', (e) => {
            const rect = curveEditor.canvas.getBoundingClientRect();
            const mx = e.clientX - rect.left;
            const my = e.clientY - rect.top;
            const p = curveEditor.padding;
            const dw = rect.width - p * 2;
            const dh = rect.height - p * 2;

            let hitIdx = -1;
            wing.ribCurveKeys.forEach((k, idx) => {
                const kx = p + k.time * dw;
                const ky = p + (1 - k.value) * dh;
                const dist = Math.hypot(mx - kx, my - ky);
                if (dist <= 8) hitIdx = idx;
            });

            if (hitIdx >= 0) {
                if (e.button === 2) {
                    if (hitIdx > 0 && hitIdx < wing.ribCurveKeys.length - 1) {
                        wing.ribCurveKeys.splice(hitIdx, 1);
                        renderCurveEditor();
                        render();
                    }
                    return;
                }
                curveEditor.dragKey = hitIdx;
            } else if (e.button === 0) {
                const t = Math.max(0.02, Math.min(0.98, (mx - p) / dw));
                const v = Math.max(0, Math.min(1, 1 - (my - p) / dh));
                wing.ribCurveKeys.push({ time: t, value: v });
                wing.ribCurveKeys.sort((a, b) => a.time - b.time);
                curveEditor.dragKey = wing.ribCurveKeys.findIndex(k => Math.abs(k.time - t) < 1e-4);
                renderCurveEditor();
                render();
            }
        });

        window.addEventListener('mousemove', (e) => {
            const rect = curveEditor.canvas.getBoundingClientRect();
            const mx = e.clientX - rect.left;
            const my = e.clientY - rect.top;
            const p = curveEditor.padding;
            const dw = rect.width - p * 2;
            const dh = rect.height - p * 2;

            if (curveEditor.dragKey >= 0) {
                const k = wing.ribCurveKeys[curveEditor.dragKey];
                const isEndpoint = (curveEditor.dragKey === 0 || curveEditor.dragKey === wing.ribCurveKeys.length - 1);

                if (!isEndpoint) {
                    k.time = Math.max(0.02, Math.min(0.98, (mx - p) / dw));
                }
                k.value = Math.max(0, Math.min(1, 1 - (my - p) / dh));

                wing.ribCurveKeys.sort((a, b) => a.time - b.time);
                curveEditor.dragKey = wing.ribCurveKeys.indexOf(k);

                renderCurveEditor();
                render();
                return;
            }

            let hover = -1;
            wing.ribCurveKeys.forEach((k, idx) => {
                const kx = p + k.time * dw;
                const ky = p + (1 - k.value) * dh;
                if (Math.hypot(mx - kx, my - ky) <= 8) hover = idx;
            });

            if (hover !== curveEditor.hoverKey) {
                curveEditor.hoverKey = hover;
                renderCurveEditor();
            }
        });

        window.addEventListener('mouseup', () => {
            curveEditor.dragKey = -1;
        });

        curveEditor.canvas.addEventListener('contextmenu', e => e.preventDefault());

        // Curve Preset Buttons
        document.getElementById('crv-pre-linear').onclick = () => {
            wing.ribCurveKeys = [{ time: 0, value: 0 }, { time: 1, value: 1 }];
            renderCurveEditor(); render();
        };
        document.getElementById('crv-pre-root').onclick = () => {
            wing.ribCurveKeys = [{ time: 0, value: 0 }, { time: 0.35, value: 0.15 }, { time: 1, value: 1 }];
            renderCurveEditor(); render();
        };
        document.getElementById('crv-pre-tip').onclick = () => {
            wing.ribCurveKeys = [{ time: 0, value: 0 }, { time: 0.65, value: 0.85 }, { time: 1, value: 1 }];
            renderCurveEditor(); render();
        };
        document.getElementById('crv-pre-scurve').onclick = () => {
            wing.ribCurveKeys = [{ time: 0, value: 0 }, { time: 0.25, value: 0.08 }, { time: 0.75, value: 0.92 }, { time: 1, value: 1 }];
            renderCurveEditor(); render();
        };
        document.getElementById('crv-pre-mid').onclick = () => {
            wing.ribCurveKeys = [{ time: 0, value: 0 }, { time: 0.5, value: 0.5 }, { time: 1, value: 1 }];
            renderCurveEditor(); render();
        };
