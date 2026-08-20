// ============================================================================
// Aerodynamics & Stability Analysis (Area, Aspect Ratio, MAC, Neutral Point, CoG)
// ============================================================================

// --- MAC (Mean Aerodynamic Chord) & CoG Calculation & Rendering ---
        function calculateMAC(leCurve, teCurve) {
            const span = wing.tipLE.x;
            const teRootToTip = [...teCurve].reverse();
            const steps = 100;
            const dx = span / steps;

            let int_c = 0;
            let int_c2 = 0;
            let int_x_c = 0;
            let int_yle_c = 0;
            let int_y_mid_c = 0;

            for (let i = 0; i < steps; i++) {
                const x = (i + 0.5) * dx;
                const lePt = sampleYAtX(leCurve, x);
                const tePt = sampleYAtX(teRootToTip, x);
                const c = Math.max(0.0001, lePt.y - tePt.y);
                const yMid = (lePt.y + tePt.y) * 0.5;

                int_c += c * dx;
                int_c2 += c * c * dx;
                int_x_c += x * c * dx;
                int_yle_c += lePt.y * c * dx;
                int_y_mid_c += yMid * c * dx;
            }

            const semiArea = Math.max(1e-5, int_c);
            const mac = int_c2 / semiArea;
            const xMac = int_x_c / semiArea;
            const yLeMac = int_yle_c / semiArea;
            const yTeMac = yLeMac - mac;
            
            // Individual wing AC (at xMac)
            const ac = { x: xMac, y: yLeMac - 0.25 * mac };
            
            // Full Wing Set Combined Neutral Point / AC (on Centerline X = 0)
            const fullWingAC = { x: 0.0, y: yLeMac - 0.25 * mac };

            // Structural Wing Centroid (Center of Mass of the planform)
            const structCG = { x: 0.0, y: int_y_mid_c / semiArea };

            // Target Flight Center of Gravity (CoG) based on user Static Margin (SM)
            // CoG sits forward of the Neutral Point (AC) by (SM% * MAC)
            const smFraction = (wing.staticMargin || 10.0) / 100.0;
            const targetCG = { x: 0.0, y: fullWingAC.y + (smFraction * mac) };
            const cgMacPercent = (0.25 - smFraction) * 100.0;

            return {
                mac,
                xMac,
                yLeMac,
                yTeMac,
                ac,
                fullWingAC,
                structCG,
                targetCG,
                cgMacPercent
            };
        }

        function drawMAC(macData) {
            if (!macData) return;

            // 1. Semi-Span MAC on Main Wing (at +X_mac)
            const sLE = worldToScreen(macData.xMac, macData.yLeMac);
            const sTE = worldToScreen(macData.xMac, macData.yTeMac);
            const sAC = worldToScreen(macData.ac.x, macData.ac.y);

            ctx.strokeStyle = '#c084fc';
            ctx.lineWidth = 2.0;
            ctx.beginPath();
            ctx.moveTo(sLE.x, sLE.y);
            ctx.lineTo(sTE.x, sTE.y);
            ctx.stroke();

            // Endcaps
            ctx.beginPath();
            ctx.moveTo(sLE.x - 4, sLE.y); ctx.lineTo(sLE.x + 4, sLE.y);
            ctx.moveTo(sTE.x - 4, sTE.y); ctx.lineTo(sTE.x + 4, sTE.y);
            ctx.stroke();

            // Semi-span AC reticle
            ctx.strokeStyle = 'rgba(250, 204, 21, 0.8)';
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.arc(sAC.x, sAC.y, 4, 0, Math.PI * 2);
            ctx.stroke();

            // Semi-span label
            ctx.font = '9px sans-serif';
            ctx.textAlign = 'left';
            ctx.fillStyle = 'rgba(192, 132, 252, 0.8)';
            ctx.fillText(`MAC: ${macData.mac.toFixed(3)}m`, sLE.x + 6, (sLE.y + sTE.y) * 0.5);

            // 2. Mirrored Semi-Span MAC (at -X_mac)
            if (wing.showMirrored) {
                const msLE = worldToScreen(-macData.xMac, macData.yLeMac);
                const msTE = worldToScreen(-macData.xMac, macData.yTeMac);
                const msAC = worldToScreen(-macData.ac.x, macData.ac.y);

                ctx.strokeStyle = 'rgba(192, 132, 252, 0.4)';
                ctx.lineWidth = 1.5;
                ctx.beginPath();
                ctx.moveTo(msLE.x, msLE.y);
                ctx.lineTo(msTE.x, msTE.y);
                ctx.stroke();

                ctx.strokeStyle = 'rgba(250, 204, 21, 0.4)';
                ctx.beginPath();
                ctx.arc(msAC.x, msAC.y, 4, 0, Math.PI * 2);
                ctx.stroke();

                // Alignment leader line connecting left and right MAC across centerline
                ctx.strokeStyle = 'rgba(192, 132, 252, 0.2)';
                ctx.setLineDash([3, 4]);
                ctx.beginPath();
                ctx.moveTo(msLE.x, msLE.y);
                ctx.lineTo(sLE.x, sLE.y);
                ctx.moveTo(msTE.x, msTE.y);
                ctx.lineTo(sTE.x, sTE.y);
                ctx.stroke();
                ctx.setLineDash([]);
            }

            // 3. FULL WING SET CENTERLINE MAC & COG (at X = 0)
            const cLE = worldToScreen(0, macData.yLeMac);
            const cTE = worldToScreen(0, macData.yTeMac);
            const cAC = worldToScreen(0, macData.fullWingAC.y);
            const cCG = worldToScreen(0, macData.targetCG.y);
            const cStruct = worldToScreen(0, macData.structCG.y);

            // Centerline MAC Band (Shaded reference corridor)
            const bandW = 8;
            ctx.fillStyle = 'rgba(192, 132, 252, 0.15)';
            ctx.fillRect(cLE.x - bandW / 2, cLE.y, bandW, cTE.y - cLE.y);

            // Centerline MAC Chord Line
            ctx.strokeStyle = '#c084fc';
            ctx.lineWidth = 3.0;
            ctx.beginPath();
            ctx.moveTo(cLE.x, cLE.y);
            ctx.lineTo(cTE.x, cTE.y);
            ctx.stroke();

            // Centerline LE & TE Tick Bars
            ctx.lineWidth = 2.0;
            ctx.beginPath();
            ctx.moveTo(cLE.x - 9, cLE.y); ctx.lineTo(cLE.x + 9, cLE.y);
            ctx.moveTo(cTE.x - 9, cTE.y); ctx.lineTo(cTE.x + 9, cTE.y);
            ctx.stroke();

            // 4. Centerline Neutral Point / Aerodynamic Center (NP / AC)
            ctx.strokeStyle = '#facc15';
            ctx.lineWidth = 2.0;
            ctx.beginPath();
            ctx.arc(cAC.x, cAC.y, 7, 0, Math.PI * 2);
            ctx.moveTo(cAC.x - 11, cAC.y); ctx.lineTo(cAC.x + 11, cAC.y);
            ctx.moveTo(cAC.x, cAC.y - 11); ctx.lineTo(cAC.x, cAC.y + 11);
            ctx.stroke();

            // 5. Target Center of Gravity (CoG) Symbol (Standard Aerospace Black & Yellow 4-Quadrant Symbol)
            drawCoGSymbol(cCG.x, cCG.y, 8);

            // 6. Structural Planform Centroid (Small Cyan Diamond)
            ctx.fillStyle = '#38bdf8';
            ctx.beginPath();
            ctx.moveTo(cStruct.x, cStruct.y - 5);
            ctx.lineTo(cStruct.x + 5, cStruct.y);
            ctx.lineTo(cStruct.x, cStruct.y + 5);
            ctx.lineTo(cStruct.x - 5, cStruct.y);
            ctx.closePath();
            ctx.fill();
            ctx.strokeStyle = '#000';
            ctx.lineWidth = 1;
            ctx.stroke();

            // 7. Viewport Aeronautical Labels
            ctx.font = '10px sans-serif';
            ctx.textAlign = 'left';
            
            // CoG Label (Bold Gold)
            ctx.fillStyle = '#facc15';
            ctx.fillText(`Target Flight CoG (SM: ${(wing.staticMargin || 10).toFixed(1)}%, ${macData.cgMacPercent.toFixed(1)}% MAC) [Y: ${macData.targetCG.y.toFixed(3)}m]`, cCG.x + 14, cCG.y + 3);

            // NP / AC Label
            ctx.fillStyle = 'rgba(250, 204, 21, 0.9)';
            ctx.fillText(`Neutral Point / AC (25.0% MAC) [Y: ${macData.fullWingAC.y.toFixed(3)}m]`, cAC.x + 14, cAC.y + 13);

            // MAC Centerline Label
            ctx.fillStyle = '#c084fc';
            ctx.fillText(`Wing Set MAC: ${macData.mac.toFixed(3)}m (LE: ${macData.yLeMac.toFixed(3)}m, TE: ${macData.yTeMac.toFixed(3)}m)`, cLE.x + 14, cLE.y + 3);

            // Structural Centroid Label
            ctx.fillStyle = 'rgba(56, 189, 248, 0.8)';
            ctx.fillText(`Structural Centroid [Y: ${macData.structCG.y.toFixed(3)}m]`, cStruct.x + 14, cStruct.y - 6);
        }

        // Draw aeronautical 4-quadrant CoG marker
        function drawCoGSymbol(x, y, r) {
            ctx.save();
            ctx.beginPath();
            ctx.arc(x, y, r, 0, Math.PI * 2);
            ctx.fillStyle = '#111318';
            ctx.fill();

            // Quadrant 1 & 3 (Yellow)
            ctx.fillStyle = '#facc15';
            ctx.beginPath();
            ctx.moveTo(x, y);
            ctx.arc(x, y, r, 0, Math.PI * 0.5);
            ctx.closePath();
            ctx.fill();

            ctx.beginPath();
            ctx.moveTo(x, y);
            ctx.arc(x, y, r, Math.PI, Math.PI * 1.5);
            ctx.closePath();
            ctx.fill();

            // Outer ring & crosshair
            ctx.strokeStyle = '#facc15';
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.arc(x, y, r, 0, Math.PI * 2);
            ctx.moveTo(x - r - 4, y); ctx.lineTo(x + r + 4, y);
            ctx.moveTo(x, y - r - 4); ctx.lineTo(x, y + r + 4);
            ctx.stroke();
            ctx.restore();
        }

        // --- Metrics HUD Calculation ---
        function updateMetrics(poly, macData) {
            const tTE = getTipTE();
            const span = Math.max(wing.tipLE.x, tTE.x);
            const fullSpan = span * 2;
            const rootChord = Math.max(0.001, wing.rootLE.y - wing.rootTE.y);
            const tipChord = Math.hypot(wing.tipLE.x - tTE.x, wing.tipLE.y - tTE.y);
            wing.tipChord = tipChord;

            // Shoelace area
            let area = 0;
            for (let i = 0; i < poly.length; i++) {
                const a = poly[i];
                const b = poly[(i + 1) % poly.length];
                area += (a.x * b.y) - (b.x * a.y);
            }
            const semiArea = Math.abs(area * 0.5);
            const totalArea = semiArea * 2;
            const ar = totalArea > 1e-4 ? (fullSpan * fullSpan) / totalArea : 0;
            const taper = rootChord > 1e-4 ? tipChord / rootChord : 0;

            document.getElementById('val-span').innerText = `${fullSpan.toFixed(3)} m`;
            document.getElementById('val-area').innerText = `${totalArea.toFixed(3)} m²`;
            document.getElementById('val-ar').innerText = ar.toFixed(2);
            document.getElementById('val-taper').innerText = taper.toFixed(2);
            document.getElementById('val-root-chord').innerText = `${rootChord.toFixed(3)} m`;
            document.getElementById('val-tip-chord').innerText = `${tipChord.toFixed(3)} m`;
            if (macData) {
                document.getElementById('val-mac').innerText = `${macData.mac.toFixed(3)} m`;
                document.getElementById('val-mac-y').innerText = `${macData.xMac.toFixed(3)} m`;
                document.getElementById('val-ac-y').innerText = `Y = ${macData.fullWingAC.y.toFixed(3)} m`;
                document.getElementById('val-cog-y').innerText = `Y = ${macData.targetCG.y.toFixed(3)} m`;
            }
            document.getElementById('badge-cs-count').innerText = `${wing.controlSurfaces.length} Active`;
        }
