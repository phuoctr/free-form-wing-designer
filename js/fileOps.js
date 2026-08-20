// ============================================================================
// File Operations: JSON/SVG Export, JSON Import & Reset All
// ============================================================================

// --- Export / Import ---
        document.getElementById('btn-export-json').onclick = () => {
            const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(wing, null, 2));
            const downloadAnchor = document.createElement('a');
            downloadAnchor.setAttribute("href", dataStr);
            downloadAnchor.setAttribute("download", "FreeFormWing.json");
            document.body.appendChild(downloadAnchor);
            downloadAnchor.click();
            downloadAnchor.remove();
        };

        document.getElementById('btn-export-svg').onclick = () => {
            const tipTE = getTipTE();
            const rawLE = [wing.rootLE, ...wing.leKnots, wing.tipLE];
            const rawTE = [tipTE, ...[...wing.teKnots].reverse(), wing.rootTE];

            const leCurve = sampleCurve(rawLE, wing.rootLeTan, { x: -wing.tipLeTan.x, y: -wing.tipLeTan.y }, 100);
            const teCurve = sampleCurve(rawTE, wing.tipTeTan, { x: -wing.rootTeTan.x, y: -wing.rootTeTan.y }, 100);
            const poly = [...leCurve, ...teCurve];

            let pathD = `M ${poly[0].x * 500 + 20} ${-poly[0].y * 500 + 350} `;
            for (let i = 1; i < poly.length; i++) {
                pathD += `L ${poly[i].x * 500 + 20} ${-poly[i].y * 500 + 350} `;
            }
            pathD += 'Z';

            // SVG Control surfaces
            let csSvg = '';
            wing.controlSurfaces.forEach(cs => {
                const csPoly = evaluateControlSurfacePolygon(cs, leCurve, teCurve);
                if (csPoly && csPoly.length >= 3) {
                    let d = `M ${csPoly[0].x * 500 + 20} ${-csPoly[0].y * 500 + 350} `;
                    for (let i = 1; i < csPoly.length; i++) d += `L ${csPoly[i].x * 500 + 20} ${-csPoly[i].y * 500 + 350} `;
                    d += 'Z';
                    csSvg += `<path d="${d}" fill="rgba(192, 132, 252, 0.4)" stroke="#c084fc" stroke-width="1.5"/>`;
                }
            });

            const svgContent = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 700" width="1000" height="700">
                <rect width="1000" height="700" fill="#14161b"/>
                <path d="${pathD}" fill="rgba(56, 189, 248, 0.2)" stroke="#38bdf8" stroke-width="2"/>
                ${csSvg}
            </svg>`;

            const dataStr = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svgContent);
            const downloadAnchor = document.createElement('a');
            downloadAnchor.setAttribute("href", dataStr);
            downloadAnchor.setAttribute("download", "FreeFormWing.svg");
            document.body.appendChild(downloadAnchor);
            downloadAnchor.click();
            downloadAnchor.remove();
        };

        document.getElementById('btn-import-json').onclick = () => {
            document.getElementById('file-input').click();
        };

        document.getElementById('file-input').onchange = (e) => {
            const file = e.target.files[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = (event) => {
                try {
                    const loaded = JSON.parse(event.target.result);
                    Object.assign(wing, loaded);
                    syncInputsFromState();
                    recenter();
                } catch (err) {
                    alert("Invalid JSON format!");
                }
            };
            reader.readAsText(file);
        };

        document.getElementById('btn-reset-all').onclick = () => {
            if (confirm("Reset all wing geometry, spline knots, control surfaces, and viewport settings to defaults?")) {
                loadPreset('straight');
                wing.controlSurfaces = [];
                wing.showRibs = false;
                wing.showPointLabels = false;
                syncInputsFromState();
                syncControlSurfacesUI();
                recenter();
            }
        };
