// Animation Curve Editor
const curveEditor = {
            canvas: document.getElementById('curve-canvas'),
            ctx: document.getElementById('curve-canvas').getContext('2d'),
            hoverKey: -1,
            dragKey: -1,
            padding: 12
        };

        const canvas = document.getElementById('viewport');
        const ctx = canvas.getContext('2d');
        const container = document.getElementById('canvas-container');
        const contextMenu = document.getElementById('context-menu');
        const toast = document.getElementById('toast');
        let contextPos = { x: 0, y: 0 };
        let toastTimeout = null;

        function showToast(msg) {
            toast.innerText = msg;
            toast.style.display = 'block';
            clearTimeout(toastTimeout);
            toastTimeout = setTimeout(() => { toast.style.display = 'none'; }, 2400);
        }

        // --- Resize Canvas with HiDPI ---
        
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

        // --- Control Surfaces Management ---
        