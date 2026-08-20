// UI Event Handlers, Sidebar & Math Inputs
function getHandleUnderMouse(mx, my) {
            const hitDistSqr = 12 * 12;

            function check(pt, id) {
                const s = worldToScreen(pt.x, pt.y);
                const dx = s.x - mx;
                const dy = s.y - my;
                return (dx * dx + dy * dy) <= hitDistSqr ? id : null;
            }

            const tipTE = getTipTE();
            const midTip = { x: (wing.tipLE.x + tipTE.x) * 0.5, y: (wing.tipLE.y + tipTE.y) * 0.5 };

            let hit = check(wing.rootLE, 'rootLE') ||
                      check(wing.rootTE, 'rootTE') ||
                      check(wing.tipLE, 'tipLE') ||
                      check(tipTE, 'tipTE') ||
                      check(midTip, 'tipEdge');
            if (hit) return hit;

            if (wing.useTangents && wing.designMode !== 'simple') {
                if (wing.rootLE.mode !== 'sharp') {
                    hit = check({ x: wing.rootLE.x + wing.rootLeTan.x, y: wing.rootLE.y + wing.rootLeTan.y }, 'rootLeTan');
                    if (hit) return hit;
                }
                if (wing.rootTE.mode !== 'sharp') {
                    hit = check({ x: wing.rootTE.x + wing.rootTeTan.x, y: wing.rootTE.y + wing.rootTeTan.y }, 'rootTeTan');
                    if (hit) return hit;
                }
                if (wing.tipLE.mode !== 'sharp') {
                    hit = check({ x: wing.tipLE.x + wing.tipLeTan.x, y: wing.tipLE.y + wing.tipLeTan.y }, 'tipLeTan');
                    if (hit) return hit;
                }
                if (wing.tipTE.mode !== 'sharp') {
                    hit = check({ x: tipTE.x + wing.tipTeTan.x, y: tipTE.y + wing.tipTeTan.y }, 'tipTeTan');
                    if (hit) return hit;
                }

                for (let i = 0; i < wing.leKnots.length; i++) {
                    const pt = wing.leKnots[i];
                    if (pt.mode !== 'sharp') {
                        const tOut = pt.tanOut || pt.tan || { x: 0.15, y: 0 };
                        const tIn = pt.tanIn || { x: -tOut.x, y: -tOut.y };
                        hit = check({ x: pt.x + tOut.x, y: pt.y + tOut.y }, { type: 'leKnotTanOut', index: i }) ||
                              check({ x: pt.x + tIn.x, y: pt.y + tIn.y }, { type: 'leKnotTanIn', index: i });
                        if (hit) return hit;
                    }
                }

                for (let i = 0; i < wing.teKnots.length; i++) {
                    const pt = wing.teKnots[i];
                    if (pt.mode !== 'sharp') {
                        const tOut = pt.tanOut || pt.tan || { x: -0.15, y: 0 };
                        const tIn = pt.tanIn || { x: -tOut.x, y: -tOut.y };
                        hit = check({ x: pt.x + tOut.x, y: pt.y + tOut.y }, { type: 'teKnotTanOut', index: i }) ||
                              check({ x: pt.x + tIn.x, y: pt.y + tIn.y }, { type: 'teKnotTanIn', index: i });
                        if (hit) return hit;
                    }
                }
            }

            // Check Control Surface Handles
            if (wing.controlSurfaces.length > 0) {
                const teRootToTip = view.lastTeCurve ? [...view.lastTeCurve].reverse() : [];
                for (let i = 0; i < wing.controlSurfaces.length; i++) {
                    const cs = wing.controlSurfaces[i];
                    const x0 = cs.xMin !== undefined ? cs.xMin : (cs.box ? cs.box.xMin : 0.2);
                    const x1 = cs.xMax !== undefined ? cs.xMax : (cs.box ? cs.box.xMax : 0.8);
                    const yIn = cs.yIn !== undefined ? cs.yIn : (cs.box ? Math.max(cs.box.yMin, cs.box.yMax) : -0.3);
                    const yOut = cs.yOut !== undefined ? cs.yOut : (cs.box ? Math.max(cs.box.yMin, cs.box.yMax) : -0.3);
                    const teIn = sampleYAtX(teRootToTip, x0);
                    const teOut = sampleYAtX(teRootToTip, x1);
                    const midLeftY = (yIn + teIn.y) * 0.5;
                    const midRightY = (yOut + teOut.y) * 0.5;

                    hit = check({ x: x0, y: yIn }, { type: 'cs_hinge_in', index: i }) ||
                          check({ x: x1, y: yOut }, { type: 'cs_hinge_out', index: i }) ||
                          check({ x: x0, y: midLeftY }, { type: 'cs_edge_left', index: i }) ||
                          check({ x: x1, y: midRightY }, { type: 'cs_edge_right', index: i });
                    if (hit) return hit;
                }
            }

            for (let i = 0; i < wing.leKnots.length; i++) {
                hit = check(wing.leKnots[i], { type: 'leKnot', index: i });
                if (hit) return hit;
            }

            for (let i = 0; i < wing.teKnots.length; i++) {
                hit = check(wing.teKnots[i], { type: 'teKnot', index: i });
                if (hit) return hit;
            }

            return null;
        }

        function getControlSurfaceUnderMouse(mx, my) {
            const wPos = screenToWorld(mx, my);
            for (let i = 0; i < wing.controlSurfaces.length; i++) {
                const cs = wing.controlSurfaces[i];
                const x0 = cs.xMin !== undefined ? cs.xMin : (cs.box ? cs.box.xMin : 0);
                const x1 = cs.xMax !== undefined ? cs.xMax : (cs.box ? cs.box.xMax : 1);
                const yTopIn = cs.yIn !== undefined ? cs.yIn : (cs.box ? Math.max(cs.box.yMin, cs.box.yMax) : 0);
                const yTopOut = cs.yOut !== undefined ? cs.yOut : (cs.box ? Math.max(cs.box.yMin, cs.box.yMax) : 0);
                const yTop = Math.max(yTopIn, yTopOut);
                const yBot = cs.yBot !== undefined ? cs.yBot : (cs.box ? Math.min(cs.box.yMin, cs.box.yMax) : -10);

                if (wPos.x >= x0 && wPos.x <= x1 && wPos.y >= yBot && wPos.y <= yTop + 0.02) {
                    return i;
                }
            }
            return -1;
        }

        canvas.addEventListener('mousedown', (e) => {
            const rect = canvas.getBoundingClientRect();
            const mx = e.clientX - rect.left;
            const my = e.clientY - rect.top;
            const wPos = screenToWorld(mx, my);

            // --- 1. Draw Control Surface Mode ---
            if (view.toolMode === 'draw_cs' && e.button === 0) {
                let startPos = { ...wPos };
                if (wing.snapPoints) {
                    startPos.x = snapVal(startPos.x, wing.gridSnapStep);
                    startPos.y = snapVal(startPos.y, wing.gridSnapStep);
                }
                view.drawBox = {
                    start: startPos,
                    current: startPos,
                    isValid: true,
                    error: ""
                };
                render();
                return;
            }

            // --- 2. Normal Selection Mode ---
            if (e.button === 0 && !e.altKey) {
                const hit = getHandleUnderMouse(mx, my);
                if (hit) {
                    view.activeHandle = hit;
                    view.dragHandle = hit;
                    if (typeof hit === 'object' && hit.type && hit.type.startsWith('cs_')) {
                        view.selectedCSIndex = hit.index;
                    }
                    render();
                    return;
                }

                // Check click on existing control surface
                const csHit = getControlSurfaceUnderMouse(mx, my);
                if (csHit >= 0) {
                    view.selectedCSIndex = csHit;
                    render();
                    return;
                } else {
                    view.selectedCSIndex = -1;
                }
            }

            // Pan with middle click, alt+click, or right-drag
            if (e.button === 1 || e.button === 2 || (e.button === 0 && e.altKey)) {
                view.isDragging = true;
                view.lastMouse = { x: e.clientX, y: e.clientY };
            }
        });

        window.addEventListener('mousemove', (e) => {
            const rect = canvas.getBoundingClientRect();
            const mx = e.clientX - rect.left;
            const my = e.clientY - rect.top;

            if (view.isDragging) {
                const dx = e.clientX - view.lastMouse.x;
                const dy = e.clientY - view.lastMouse.y;
                view.pan.x -= dx / view.zoom;
                view.pan.y += dy / view.zoom;
                view.lastMouse = { x: e.clientX, y: e.clientY };
                render();
                return;
            }

            // --- Draw Box Dragging ---
            if (view.drawBox) {
                let curPos = screenToWorld(mx, my);
                if (wing.snapPoints) {
                    curPos.x = snapVal(curPos.x, wing.gridSnapStep);
                    curPos.y = snapVal(curPos.y, wing.gridSnapStep);
                }
                view.drawBox.current = curPos;
                render();
                return;
            }

            // --- Drag Handle ---
            if (view.dragHandle) {
                const wPos = screenToWorld(mx, my);
                applyHandleMovement(view.dragHandle, wPos);
                syncInputsFromState();
                render();
                return;
            }

            // --- Hover Detection ---
            const hit = getHandleUnderMouse(mx, my);
            const csHit = getControlSurfaceUnderMouse(mx, my);

            if (!isSameHandle(hit, view.hoverHandle) || csHit !== view.hoverCSIndex) {
                view.hoverHandle = hit;
                view.hoverCSIndex = csHit;
                render();
            }
        });

        window.addEventListener('mouseup', () => {
            if (view.drawBox) {
                const b = view.drawBox;
                if (b.isValid) {
                    const x0 = Math.min(b.start.x, b.current.x);
                    const x1 = Math.max(b.start.x, b.current.x);
                    const y0 = Math.min(b.start.y, b.current.y);
                    const y1 = Math.max(b.start.y, b.current.y);

                    const newCS = {
                        id: Date.now(),
                        name: `CS #${wing.controlSurfaces.length + 1}`,
                        xMin: x0,
                        xMax: x1,
                        yIn: y1,
                        yOut: y1,
                        yBot: y0,
                        box: { xMin: x0, xMax: x1, yMin: y0, yMax: y1 },
                        deflection: 25
                    };
                    wing.controlSurfaces.push(newCS);
                    view.selectedCSIndex = wing.controlSurfaces.length - 1;
                    syncControlSurfacesUI();
                    setDrawCSMode(false);
                } else {
                    showToast(b.error ? `Cannot create: ${b.error}` : "Cannot create: Invalid box region!");
                }
                view.drawBox = null;
                render();
            }

            view.isDragging = false;
            view.dragHandle = null;
        });

        canvas.addEventListener('wheel', (e) => {
            e.preventDefault();
            const rect = canvas.getBoundingClientRect();
            const mx = e.clientX - rect.left;
            const my = e.clientY - rect.top;

            const wBefore = screenToWorld(mx, my);
            const zoomFactor = e.deltaY < 0 ? 1.12 : 0.89;
            view.zoom = Math.max(50, Math.min(2500, view.zoom * zoomFactor));
            const wAfter = screenToWorld(mx, my);

            view.pan.x += (wBefore.x - wAfter.x);
            view.pan.y += (wBefore.y - wAfter.y);
            render();
        }, { passive: false });

        function snapVal(val, step) {
            return Math.round(val / step) * step;
        }

        function applyHandleMovement(handle, wPos) {
            const step = wing.gridSnapStep || 0.05;
            const isTangentHandle = handle === 'rootLeTan' || handle === 'rootTeTan' || handle === 'tipLeTan' || handle === 'tipTeTan' ||
                                    (typeof handle === 'object' && (handle.type === 'leKnotTanOut' || handle.type === 'leKnotTanIn' || handle.type === 'teKnotTanOut' || handle.type === 'teKnotTanIn'));

            if (wing.snapPoints && !isTangentHandle) {
                wPos.x = snapVal(wPos.x, step);
                wPos.y = snapVal(wPos.y, step);
            } else if (wing.snapTangents && isTangentHandle) {
                wPos.x = snapVal(wPos.x, step);
                wPos.y = snapVal(wPos.y, step);
            }

            const isSimple = wing.designMode === 'simple';
            const tipTE = getTipTE();

            if (handle === 'rootLE') {
                wing.rootLE.x = 0; // Strict axis constraint
                wing.rootLE.y = wPos.y;
                if (wing.rootTE.y > wing.rootLE.y - 0.02) wing.rootTE.y = wing.rootLE.y - 0.02;
            } else if (handle === 'rootTE') {
                wing.rootTE.x = 0; // Strict axis constraint
                wing.rootTE.y = Math.min(wing.rootLE.y - 0.02, wPos.y);
            } else if (handle === 'tipLE') {
                wing.tipLE.x = Math.max(0.05, wPos.x);
                wing.tipLE.y = wPos.y;
                if (isSimple) {
                    tipTE.x = wing.tipLE.x;
                    tipTE.y = wing.tipLE.y - (wing.tipChord || 0.12);
                } else {
                    wing.tipChord = Math.hypot(wing.tipLE.x - tipTE.x, wing.tipLE.y - tipTE.y);
                }
            } else if (handle === 'tipTE') {
                if (isSimple) {
                    wing.tipLE.x = Math.max(0.05, wPos.x);
                    wing.tipChord = Math.max(0, wing.tipLE.y - wPos.y);
                    tipTE.x = wing.tipLE.x;
                    tipTE.y = wing.tipLE.y - wing.tipChord;
                } else {
                    // Free-form Spline Mode: fully independent 2D movement in X and Y!
                    tipTE.x = Math.max(0.05, wPos.x);
                    tipTE.y = wPos.y;
                    wing.tipChord = Math.hypot(wing.tipLE.x - tipTE.x, wing.tipLE.y - tipTE.y);
                }
            } else if (handle === 'tipEdge') {
                const curMidX = (wing.tipLE.x + tipTE.x) * 0.5;
                const curMidY = (wing.tipLE.y + tipTE.y) * 0.5;
                const dx = wPos.x - curMidX;
                const dy = wPos.y - curMidY;

                const newLeX = wing.tipLE.x + dx;
                const newTeX = tipTE.x + dx;
                if (newLeX >= 0.05 && newTeX >= 0.05) {
                    wing.tipLE.x = newLeX;
                    tipTE.x = newTeX;
                }
                wing.tipLE.y += dy;
                tipTE.y += dy;
            } else if (handle === 'rootLeTan') {
                wing.rootLeTan = { x: Math.max(0.01, wPos.x - wing.rootLE.x), y: wPos.y - wing.rootLE.y };
            } else if (handle === 'rootTeTan') {
                wing.rootTeTan = { x: Math.max(0.01, wPos.x - wing.rootTE.x), y: wPos.y - wing.rootTE.y };
            } else if (handle === 'tipLeTan') {
                wing.tipLeTan = { x: wPos.x - wing.tipLE.x, y: wPos.y - wing.tipLE.y };
            } else if (handle === 'tipTeTan') {
                wing.tipTeTan = { x: wPos.x - tipTE.x, y: wPos.y - tipTE.y };
            } else if (typeof handle === 'object') {
                if (handle.type === 'leKnot') {
                    const pt = wing.leKnots[handle.index];
                    pt.x = Math.max(0.01, Math.min(wing.tipLE.x - 0.01, wPos.x));
                    pt.y = wPos.y;
                } else if (handle.type === 'teKnot') {
                    const pt = wing.teKnots[handle.index];
                    pt.x = Math.max(0.01, Math.min(wing.tipLE.x - 0.01, wPos.x));
                    pt.y = wPos.y;
                } else if (handle.type === 'leKnotTanOut') {
                    const pt = wing.leKnots[handle.index];
                    const tOut = { x: wPos.x - pt.x, y: wPos.y - pt.y };
                    pt.tanOut = tOut;
                    if (pt.mode !== 'broken') {
                        pt.tanIn = { x: -tOut.x, y: -tOut.y };
                    }
                } else if (handle.type === 'leKnotTanIn') {
                    const pt = wing.leKnots[handle.index];
                    const tIn = { x: wPos.x - pt.x, y: wPos.y - pt.y };
                    pt.tanIn = tIn;
                    if (pt.mode !== 'broken') {
                        pt.tanOut = { x: -tIn.x, y: -tIn.y };
                    }
                } else if (handle.type === 'teKnotTanOut') {
                    const pt = wing.teKnots[handle.index];
                    const tOut = { x: wPos.x - pt.x, y: wPos.y - pt.y };
                    pt.tanOut = tOut;
                    if (pt.mode !== 'broken') {
                        pt.tanIn = { x: -tOut.x, y: -tOut.y };
                    }
                } else if (handle.type === 'teKnotTanIn') {
                    const pt = wing.teKnots[handle.index];
                    const tIn = { x: wPos.x - pt.x, y: wPos.y - pt.y };
                    pt.tanIn = tIn;
                    if (pt.mode !== 'broken') {
                        pt.tanOut = { x: -tIn.x, y: -tIn.y };
                    }
                } else if (handle.type === 'cs_hinge_in') {
                    const cs = wing.controlSurfaces[handle.index];
                    let yVal = wPos.y;
                    if (wing.snapPoints) yVal = snapVal(yVal, wing.gridSnapStep);
                    const tePt = sampleYAtX(view.lastTeCurve ? [...view.lastTeCurve].reverse() : [], cs.xMin);
                    const lePt = sampleYAtX(view.lastLeCurve || [], cs.xMin);
                    cs.yIn = Math.max(tePt.y + 0.01, Math.min(lePt.y - 0.01, yVal));
                    if (cs.box) {
                        cs.box.yMin = Math.min(cs.yIn, cs.yOut, cs.yBot !== undefined ? cs.yBot : -10);
                        cs.box.yMax = Math.max(cs.yIn, cs.yOut);
                    }
                    syncControlSurfacesUI();
                } else if (handle.type === 'cs_hinge_out') {
                    const cs = wing.controlSurfaces[handle.index];
                    let yVal = wPos.y;
                    if (wing.snapPoints) yVal = snapVal(yVal, wing.gridSnapStep);
                    const tePt = sampleYAtX(view.lastTeCurve ? [...view.lastTeCurve].reverse() : [], cs.xMax);
                    const lePt = sampleYAtX(view.lastLeCurve || [], cs.xMax);
                    cs.yOut = Math.max(tePt.y + 0.01, Math.min(lePt.y - 0.01, yVal));
                    if (cs.box) {
                        cs.box.yMin = Math.min(cs.yIn, cs.yOut, cs.yBot !== undefined ? cs.yBot : -10);
                        cs.box.yMax = Math.max(cs.yIn, cs.yOut);
                    }
                    syncControlSurfacesUI();
                } else if (handle.type === 'cs_edge_left') {
                    const cs = wing.controlSurfaces[handle.index];
                    let xVal = wPos.x;
                    if (wing.snapPoints) xVal = snapVal(xVal, wing.gridSnapStep);
                    cs.xMin = Math.max(0, Math.min(cs.xMax - 0.02, xVal));
                    if (cs.box) cs.box.xMin = cs.xMin;
                    syncControlSurfacesUI();
                } else if (handle.type === 'cs_edge_right') {
                    const cs = wing.controlSurfaces[handle.index];
                    let xVal = wPos.x;
                    if (wing.snapPoints) xVal = snapVal(xVal, wing.gridSnapStep);
                    cs.xMax = Math.min(wing.tipLE.x, Math.max(cs.xMin + 0.02, xVal));
                    if (cs.box) cs.box.xMax = cs.xMax;
                    syncControlSurfacesUI();
                }
            }
        }

        // --- Context Menu & Deletion ---
        canvas.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            const rect = canvas.getBoundingClientRect();
            const mx = e.clientX - rect.left;
            const my = e.clientY - rect.top;
            contextPos = screenToWorld(mx, my);

            const hit = getHandleUnderMouse(mx, my);
            const csHit = getControlSurfaceUnderMouse(mx, my);
            const delOption = document.getElementById('cm-del-point');
            const delCSOption = document.getElementById('cm-del-cs');
            const setSharpOption = document.getElementById('cm-set-sharp');
            const setSmoothOption = document.getElementById('cm-set-smooth');
            const setBrokenOption = document.getElementById('cm-set-broken');
            const resetKnotTanOption = document.getElementById('cm-reset-knot-tan');
            const isSimple = wing.designMode === 'simple';

            document.getElementById('cm-add-le').style.display = isSimple ? 'none' : 'flex';
            document.getElementById('cm-add-te').style.display = isSimple ? 'none' : 'flex';
            document.getElementById('cm-reset-root').style.display = isSimple ? 'none' : 'flex';
            document.getElementById('cm-reset-tip').style.display = isSimple ? 'none' : 'flex';

            const isKnotHit = hit && typeof hit === 'object' && (hit.type === 'leKnot' || hit.type === 'teKnot');
            const isRootOrTipHit = hit === 'rootLE' || hit === 'rootTE' || hit === 'tipLE' || hit === 'tipTE';

            if (isRootOrTipHit && !isSimple) {
                const targetObj = hit === 'rootLE' ? wing.rootLE : (hit === 'rootTE' ? wing.rootTE : (hit === 'tipLE' ? wing.tipLE : wing.tipTE));
                const isSharp = targetObj.mode === 'sharp';

                setSharpOption.style.display = isSharp ? 'none' : 'flex';
                setSmoothOption.style.display = isSharp ? 'flex' : 'none';
                setBrokenOption.style.display = 'none';
                resetKnotTanOption.style.display = 'none';
                delOption.style.display = 'none';

                setSharpOption.onclick = () => {
                    targetObj.mode = 'sharp';
                    hideContextMenu();
                    syncInputsFromState();
                    render();
                };
                setSmoothOption.onclick = () => {
                    targetObj.mode = 'smooth';
                    hideContextMenu();
                    syncInputsFromState();
                    render();
                };
            } else if (isKnotHit && !isSimple) {
                const knotList = hit.type === 'leKnot' ? wing.leKnots : wing.teKnots;
                const knot = knotList[hit.index];

                setSharpOption.style.display = knot.mode === 'sharp' ? 'none' : 'flex';
                setSmoothOption.style.display = knot.mode === 'smooth' ? 'none' : 'flex';
                setBrokenOption.style.display = knot.mode === 'broken' ? 'none' : 'flex';
                resetKnotTanOption.style.display = knot.mode === 'sharp' ? 'none' : 'flex';
                delOption.style.display = 'flex';

                setSharpOption.onclick = () => {
                    knot.mode = 'sharp';
                    hideContextMenu();
                    syncPointListUI();
                    render();
                };
                setSmoothOption.onclick = () => {
                    knot.mode = 'smooth';
                    const tOut = knot.tanOut || knot.tan || { x: 0.15, y: 0 };
                    knot.tanOut = tOut;
                    knot.tanIn = { x: -tOut.x, y: -tOut.y };
                    hideContextMenu();
                    syncPointListUI();
                    render();
                };
                setBrokenOption.onclick = () => {
                    knot.mode = 'broken';
                    if (!knot.tanOut) knot.tanOut = knot.tan || { x: 0.15, y: 0 };
                    if (!knot.tanIn) knot.tanIn = { x: -knot.tanOut.x, y: -knot.tanOut.y };
                    hideContextMenu();
                    syncPointListUI();
                    render();
                };
                resetKnotTanOption.onclick = () => {
                    knot.tanOut = null;
                    knot.tanIn = null;
                    knot.tan = null;
                    hideContextMenu();
                    render();
                };
                delOption.onclick = () => {
                    if (hit.type === 'leKnot') wing.leKnots.splice(hit.index, 1);
                    if (hit.type === 'teKnot') wing.teKnots.splice(hit.index, 1);
                    hideContextMenu();
                    syncPointListUI();
                    render();
                };
            } else {
                setSharpOption.style.display = 'none';
                setSmoothOption.style.display = 'none';
                setBrokenOption.style.display = 'none';
                resetKnotTanOption.style.display = 'none';
                delOption.style.display = 'none';
            }

            if (csHit >= 0) {
                delCSOption.style.display = 'flex';
                delCSOption.onclick = () => {
                    wing.controlSurfaces.splice(csHit, 1);
                    hideContextMenu();
                    syncControlSurfacesUI();
                    render();
                };
            } else {
                delCSOption.style.display = 'none';
            }

            contextMenu.style.display = 'flex';
            const menuW = contextMenu.offsetWidth || 190;
            const menuH = contextMenu.offsetHeight || 220;
            let left = e.clientX + 2;
            let top = e.clientY + 2;
            if (left + menuW > window.innerWidth) left = window.innerWidth - menuW - 8;
            if (top + menuH > window.innerHeight) top = window.innerHeight - menuH - 8;
            contextMenu.style.left = `${Math.max(6, left)}px`;
            contextMenu.style.top = `${Math.max(6, top)}px`;
        });

        function hideContextMenu() {
            contextMenu.style.display = 'none';
        }
        window.addEventListener('click', hideContextMenu);

        document.getElementById('cm-add-le').onclick = () => {
            wing.leKnots.push({ x: Math.max(0.02, Math.min(wing.tipLE.x - 0.02, contextPos.x)), y: contextPos.y, mode: 'smooth', tanOut: { x: 0.15, y: 0 }, tanIn: { x: -0.15, y: 0 } });
            syncPointListUI();
            render();
        };

        document.getElementById('cm-add-te').onclick = () => {
            wing.teKnots.push({ x: Math.max(0.02, Math.min(wing.tipLE.x - 0.02, contextPos.x)), y: contextPos.y, mode: 'smooth', tanOut: { x: -0.15, y: 0 }, tanIn: { x: 0.15, y: 0 } });
            syncPointListUI();
            render();
        };

        document.getElementById('cm-reset-root').onclick = () => {
            resetRootTangents();
            render();
        };

        document.getElementById('cm-reset-tip').onclick = () => {
            resetTipTangents();
            render();
        };

        document.getElementById('cm-recenter').onclick = recenter;

        // Keyboard Shortcut Delete
        window.addEventListener('keydown', (e) => {
            if (e.key === 'Delete' || e.key === 'Backspace') {
                // Delete selected control surface
                if (view.selectedCSIndex >= 0 && view.selectedCSIndex < wing.controlSurfaces.length) {
                    wing.controlSurfaces.splice(view.selectedCSIndex, 1);
                    view.selectedCSIndex = -1;
                    syncControlSurfacesUI();
                    render();
                    return;
                }

                const target = view.activeHandle || view.hoverHandle;
                if (target && typeof target === 'object') {
                    if (target.type === 'leKnot') wing.leKnots.splice(target.index, 1);
                    if (target.type === 'teKnot') wing.teKnots.splice(target.index, 1);
                    view.activeHandle = null;
                    view.hoverHandle = null;
                    syncPointListUI();
                    render();
                }
            } else if (e.key === 'Escape') {
                setDrawCSMode(false);
                view.drawBox = null;
                render();
            }
        });

        // --- Interactive Animation Curve Canvas Editor ---
        
function setDrawCSMode(active) {
            view.toolMode = active ? 'draw_cs' : 'select';
            const btn = document.getElementById('btn-toggle-draw-cs');
            const txt = document.getElementById('txt-draw-cs');

            if (active) {
                btn.classList.add('active-tool');
                txt.innerText = '✕ Cancel Box Drawing (Esc)';
                canvas.style.cursor = 'crosshair';
            } else {
                btn.classList.remove('active-tool');
                txt.innerText = '⊞ Draw Control Surface Box';
                canvas.style.cursor = 'crosshair';
            }
        }

        document.getElementById('btn-toggle-draw-cs').onclick = () => {
            setDrawCSMode(view.toolMode !== 'draw_cs');
        };

        function syncControlSurfacesUI() {
            const list = document.getElementById('cs-list');
            list.innerHTML = '';

            wing.controlSurfaces.forEach((cs, i) => {
                if (cs.xMin === undefined) cs.xMin = cs.box ? cs.box.xMin : 0.2;
                if (cs.xMax === undefined) cs.xMax = cs.box ? cs.box.xMax : 0.8;
                if (cs.yIn === undefined) cs.yIn = cs.box ? Math.max(cs.box.yMin, cs.box.yMax) : -0.3;
                if (cs.yOut === undefined) cs.yOut = cs.box ? Math.max(cs.box.yMin, cs.box.yMax) : -0.3;

                const isSelected = view.selectedCSIndex === i;
                const row = document.createElement('div');
                row.className = 'cs-item';
                row.style.background = isSelected ? 'rgba(192, 132, 252, 0.15)' : 'var(--bg-card)';
                row.style.borderColor = isSelected ? 'var(--accent-purple)' : 'var(--border-color)';
                row.style.padding = '8px';
                row.style.display = 'flex';
                row.style.flexDirection = 'column';
                row.style.gap = '6px';

                row.innerHTML = `
                    <div style="display:flex; justify-content:space-between; align-items:center">
                        <div style="font-weight:700; font-size:0.78rem; color:${isSelected ? 'var(--accent-purple)' : '#fff'}">
                            ${cs.name}
                        </div>
                        <div style="display:flex; gap:6px; align-items:center">
                            <span style="font-size:0.68rem; color:var(--text-secondary)">±${cs.deflection || 25}°</span>
                            <button class="del-btn" onclick="deleteCS(${i})">×</button>
                        </div>
                    </div>
                    <div style="display:grid; grid-template-columns: 1fr 1fr; gap:4px; font-size:0.7rem">
                        <div>
                            <span style="color:var(--accent-cyan); font-weight:600">Left X:</span>
                            <input type="text" value="${cs.xMin.toFixed(3)}" style="width:100%; padding:2px 4px; font-size:0.72rem" autocomplete="off" spellcheck="false"
                                   onkeydown="if(event.key==='Enter') this.blur();"
                                   onchange="updateCSParam(${i}, 'xMin', this.value, this)"
                                   onblur="updateCSParam(${i}, 'xMin', this.value, this)">
                        </div>
                        <div>
                            <span style="color:var(--accent-cyan); font-weight:600">Right X:</span>
                            <input type="text" value="${cs.xMax.toFixed(3)}" style="width:100%; padding:2px 4px; font-size:0.72rem" autocomplete="off" spellcheck="false"
                                   onkeydown="if(event.key==='Enter') this.blur();"
                                   onchange="updateCSParam(${i}, 'xMax', this.value, this)"
                                   onblur="updateCSParam(${i}, 'xMax', this.value, this)">
                        </div>
                    </div>
                    <div style="display:grid; grid-template-columns: 1fr 1fr; gap:4px; font-size:0.7rem">
                        <div>
                            <span style="color:var(--accent-purple); font-weight:600">In Hinge Y:</span>
                            <input type="text" value="${cs.yIn.toFixed(3)}" style="width:100%; padding:2px 4px; font-size:0.72rem" autocomplete="off" spellcheck="false"
                                   onkeydown="if(event.key==='Enter') this.blur();"
                                   onchange="updateCSParam(${i}, 'yIn', this.value, this)"
                                   onblur="updateCSParam(${i}, 'yIn', this.value, this)">
                        </div>
                        <div>
                            <span style="color:var(--accent-purple); font-weight:600">Out Hinge Y:</span>
                            <input type="text" value="${cs.yOut.toFixed(3)}" style="width:100%; padding:2px 4px; font-size:0.72rem" autocomplete="off" spellcheck="false"
                                   onkeydown="if(event.key==='Enter') this.blur();"
                                   onchange="updateCSParam(${i}, 'yOut', this.value, this)"
                                   onblur="updateCSParam(${i}, 'yOut', this.value, this)">
                        </div>
                    </div>
                `;
                row.onclick = (e) => {
                    if (e.target.tagName !== 'BUTTON' && e.target.tagName !== 'INPUT') {
                        view.selectedCSIndex = i;
                        syncControlSurfacesUI();
                        render();
                    }
                };
                list.appendChild(row);
            });
            document.getElementById('badge-cs-count').innerText = `${wing.controlSurfaces.length} Active`;
        }

        // --- Safe Mathematical Expression Parser & Sanitizer ---
        function parseMathExpression(expr, fallback = 0, min = -Infinity, max = Infinity) {
            if (expr === null || expr === undefined) return fallback;
            if (typeof expr === 'number') {
                if (isNaN(expr) || !isFinite(expr)) return fallback;
                return Math.min(max, Math.max(min, expr));
            }
            const trimmed = String(expr).trim();
            if (!trimmed) return fallback;

            // Sanitize: remove any disallowed characters (keep digits, decimal point, + - * / ( ) and whitespace)
            const sanitized = trimmed.replace(/[^0-9+\-*/().\s]/g, '').trim();
            if (!sanitized) return fallback;

            // Ensure valid characters only
            if (!/^[-+/*().\s0-9]+$/.test(sanitized)) return fallback;

            // Reject dangerous or invalid consecutive operators (like **, //, +++, etc.)
            if (/([+/*]){2,}/.test(sanitized) || /[-+/*]{3,}/.test(sanitized)) return fallback;

            try {
                const fn = new Function(`'use strict'; return (${sanitized});`);
                const result = fn();
                if (typeof result !== 'number' || isNaN(result) || !isFinite(result)) {
                    return fallback;
                }
                return Math.min(max, Math.max(min, result));
            } catch (e) {
                return fallback;
            }
        }

        function setInputValueIfNotFocused(id, valStr) {
            const el = document.getElementById(id);
            if (el && document.activeElement !== el) {
                el.value = valStr;
            }
        }

        function setupMathInput(inputId, onCommit, getter, min = -Infinity, max = Infinity, decimals = 3) {
            const el = document.getElementById(inputId);
            if (!el) return;

            const commit = () => {
                const currentVal = getter ? getter() : 0;
                const evaluated = parseMathExpression(el.value, currentVal, min, max);
                onCommit(evaluated);
                el.value = decimals !== null ? evaluated.toFixed(decimals) : evaluated.toString();
                syncInputsFromState();
                render();
            };

            el.onkeydown = (e) => {
                if (e.key === 'Enter') {
                    commit();
                    el.blur();
                } else if (e.key === 'Escape') {
                    const currentVal = getter ? getter() : 0;
                    el.value = decimals !== null ? currentVal.toFixed(decimals) : currentVal.toString();
                    el.blur();
                }
            };

            el.onchange = commit;
            el.onblur = commit;
        }

        window.updateCSParam = (index, key, valStr, inputEl) => {
            const cs = wing.controlSurfaces[index];
            if (!cs) return;
            const currentVal = cs[key] !== undefined ? cs[key] : 0;
            const val = parseMathExpression(valStr, currentVal);
            cs[key] = val;
            if (inputEl) {
                inputEl.value = val.toFixed(3);
            }
            if (cs.box) {
                if (key === 'xMin') cs.box.xMin = val;
                if (key === 'xMax') cs.box.xMax = val;
                if (key === 'yIn' || key === 'yOut') cs.box.yMax = Math.max(cs.yIn, cs.yOut);
            }
            render();
        };

        window.deleteCS = (i) => {
            wing.controlSurfaces.splice(i, 1);
            view.selectedCSIndex = -1;
            syncControlSurfacesUI();
            render();
        };

        // --- Mode Switcher ---
        function setDesignMode(mode) {
            wing.designMode = mode;
            const isSimple = mode === 'simple';

            document.getElementById('tab-mode-simple').classList.toggle('active', isSimple);
            document.getElementById('tab-mode-spline').classList.toggle('active', !isSimple);

            document.getElementById('sec-simple-geometry').style.display = isSimple ? 'flex' : 'none';
            document.getElementById('sec-spline-anchors').style.display = isSimple ? 'none' : 'flex';
            document.getElementById('sec-spline-tangents').style.display = isSimple ? 'none' : 'flex';
            document.getElementById('sec-spline-knots').style.display = isSimple ? 'none' : 'flex';

            // In simple mode, clear intermediate knots
            if (isSimple) {
                wing.leKnots = [];
                wing.teKnots = [];
            }

            syncInputsFromState();
            render();
        }

        document.getElementById('tab-mode-simple').onclick = () => setDesignMode('simple');
        document.getElementById('tab-mode-spline').onclick = () => setDesignMode('spline');

        // --- Sidebar UI Synchronization ---
        function syncInputsFromState() {
            const span = wing.tipLE.x;
            const rootChord = Math.max(0.001, wing.rootLE.y - wing.rootTE.y);
            const tipChord = wing.tipChord;
            const sweepDist = wing.rootLE.y - wing.tipLE.y;
            const sweepAngleDeg = Math.atan2(sweepDist, Math.max(0.01, span)) * (180 / Math.PI);

            // Simple Mode Controls
            document.getElementById('rng-simple-span').value = span.toFixed(3);
            setInputValueIfNotFocused('inp-simple-span', span.toFixed(3));
            document.getElementById('lbl-simple-span').innerText = `${span.toFixed(3)} m`;

            document.getElementById('rng-simple-root').value = rootChord.toFixed(3);
            setInputValueIfNotFocused('inp-simple-root', rootChord.toFixed(3));
            document.getElementById('lbl-simple-root').innerText = `${rootChord.toFixed(3)} m`;

            document.getElementById('rng-simple-tip').value = tipChord.toFixed(3);
            setInputValueIfNotFocused('inp-simple-tip', tipChord.toFixed(3));
            document.getElementById('lbl-simple-tip').innerText = `${tipChord.toFixed(3)} m`;

            document.getElementById('sel-sweep-type').value = wing.sweepMode;
            document.getElementById('row-sweep-angle').style.display = wing.sweepMode === 'angle' ? 'flex' : 'none';
            document.getElementById('row-sweep-dist').style.display = wing.sweepMode === 'distance' ? 'flex' : 'none';

            document.getElementById('rng-sweep-angle').value = sweepAngleDeg.toFixed(1);
            setInputValueIfNotFocused('inp-sweep-angle', sweepAngleDeg.toFixed(1));
            document.getElementById('lbl-sweep-angle').innerText = `${sweepAngleDeg.toFixed(1)}°`;

            document.getElementById('rng-sweep-dist').value = sweepDist.toFixed(3);
            setInputValueIfNotFocused('inp-sweep-dist', sweepDist.toFixed(3));
            document.getElementById('lbl-sweep-dist').innerText = `${sweepDist.toFixed(3)} m`;

            // Spline Mode Controls
            const tTE = getTipTE();
            setInputValueIfNotFocused('inp-root-le-y', wing.rootLE.y.toFixed(3));
            setInputValueIfNotFocused('inp-root-te-y', wing.rootTE.y.toFixed(3));
            setInputValueIfNotFocused('inp-tip-x', wing.tipLE.x.toFixed(3));
            setInputValueIfNotFocused('inp-tip-y', wing.tipLE.y.toFixed(3));
            setInputValueIfNotFocused('inp-tip-te-x', tTE.x.toFixed(3));
            setInputValueIfNotFocused('inp-tip-te-y', tTE.y.toFixed(3));
            document.getElementById('chk-tangents').checked = wing.useTangents;
            document.getElementById('chk-snap-points').checked = wing.snapPoints;
            document.getElementById('chk-snap-tangents').checked = wing.snapTangents;
            document.getElementById('rng-snap-step').value = wing.gridSnapStep.toString();
            document.getElementById('lbl-snap-step').innerText = `${wing.gridSnapStep.toFixed(3)} m`;
            document.getElementById('chk-show-mac').checked = wing.showMAC;
            document.getElementById('chk-show-point-labels').checked = wing.showPointLabels;
            document.getElementById('rng-static-margin').value = (wing.staticMargin || 10).toString();
            document.getElementById('lbl-static-margin').innerText = `${(wing.staticMargin || 10).toFixed(1)}%`;
            document.getElementById('chk-show-ribs').checked = wing.showRibs;
            document.getElementById('chk-show-rib-labels').checked = wing.showRibLabels;
            document.getElementById('rng-rib-count').value = wing.ribCount;
            document.getElementById('lbl-rib-count').innerText = wing.ribCount;
            document.getElementById('sel-rib-mode').value = wing.ribMode;
            document.getElementById('rng-curv-bias').value = wing.curvatureSensitivity;
            document.getElementById('lbl-curv-bias').innerText = wing.curvatureSensitivity.toFixed(1);

            // Root & Tip Sharp/Smooth Buttons
            const btnRootLE = document.getElementById('btn-toggle-root-le-mode');
            const isRootLESharp = wing.rootLE.mode === 'sharp';
            btnRootLE.innerText = isRootLESharp ? '▱ Sharp' : '∿ Smooth';
            btnRootLE.style.background = isRootLESharp ? 'rgba(251,146,60,0.2)' : 'rgba(56,189,248,0.2)';
            btnRootLE.style.color = isRootLESharp ? 'var(--accent-orange)' : 'var(--accent-cyan)';

            const btnRootTE = document.getElementById('btn-toggle-root-te-mode');
            const isRootTESharp = wing.rootTE.mode === 'sharp';
            btnRootTE.innerText = isRootTESharp ? '▱ Sharp' : '∿ Smooth';
            btnRootTE.style.background = isRootTESharp ? 'rgba(251,146,60,0.2)' : 'rgba(56,189,248,0.2)';
            btnRootTE.style.color = isRootTESharp ? 'var(--accent-orange)' : 'var(--accent-cyan)';

            const btnTipLE = document.getElementById('btn-toggle-tip-le-mode');
            const isTipLESharp = wing.tipLE.mode === 'sharp';
            btnTipLE.innerText = isTipLESharp ? '▱ Sharp' : '∿ Smooth';
            btnTipLE.style.background = isTipLESharp ? 'rgba(251,146,60,0.2)' : 'rgba(56,189,248,0.2)';
            btnTipLE.style.color = isTipLESharp ? 'var(--accent-orange)' : 'var(--accent-cyan)';

            const btnTipTE = document.getElementById('btn-toggle-tip-te-mode');
            const isTipTESharp = tTE.mode === 'sharp';
            btnTipTE.innerText = isTipTESharp ? '▱ Sharp' : '∿ Smooth';
            btnTipTE.style.background = isTipTESharp ? 'rgba(251,146,60,0.2)' : 'rgba(56,189,248,0.2)';
            btnTipTE.style.color = isTipTESharp ? 'var(--accent-orange)' : 'var(--accent-cyan)';

            updateRibModeUI();
            syncPointListUI();
            syncControlSurfacesUI();
            renderCurveEditor();
        }

        function updateRibModeUI() {
            const isCurv = wing.ribMode === 'curvature';
            document.getElementById('row-curvature-bias').style.display = isCurv ? 'flex' : 'none';
            document.getElementById('container-curve-widget').style.display = isCurv ? 'none' : 'flex';
        }

        function getKnotBadgeHTML(mode) {
            if (mode === 'sharp') return { label: '▱ Sharp', bg: 'rgba(251,146,60,0.2)', color: 'var(--accent-orange)', border: 'rgba(251,146,60,0.4)' };
            if (mode === 'broken') return { label: '✂ Split', bg: 'rgba(234,179,8,0.2)', color: 'var(--accent-yellow)', border: 'rgba(234,179,8,0.4)' };
            return { label: '∿ Smooth', bg: 'rgba(56,189,248,0.2)', color: 'var(--accent-cyan)', border: 'rgba(56,189,248,0.4)' };
        }

        function syncPointListUI() {
            const leList = document.getElementById('le-points-list');
            leList.innerHTML = '';
            wing.leKnots.forEach((pt, i) => {
                const b = getKnotBadgeHTML(pt.mode);
                const row = document.createElement('div');
                row.className = 'point-item';
                row.style.display = 'flex';
                row.style.justifyContent = 'space-between';
                row.style.alignItems = 'center';
                row.innerHTML = `
                    <div style="font-size:0.75rem; color:#fff">
                        <span style="font-weight:600">#${i+1}:</span> (${pt.x.toFixed(3)}, ${pt.y.toFixed(3)})
                    </div>
                    <div style="display:flex; align-items:center; gap:4px">
                        <button class="btn-sm" style="padding:2px 6px; font-size:0.68rem; background:${b.bg}; color:${b.color}; border: 1px solid ${b.border}" onclick="cycleKnotMode('le', ${i})">
                            ${b.label}
                        </button>
                        <button class="del-btn" onclick="deleteLE(${i})">×</button>
                    </div>
                `;
                leList.appendChild(row);
            });

            const teList = document.getElementById('te-points-list');
            teList.innerHTML = '';
            wing.teKnots.forEach((pt, i) => {
                const b = getKnotBadgeHTML(pt.mode);
                const row = document.createElement('div');
                row.className = 'point-item';
                row.style.display = 'flex';
                row.style.justifyContent = 'space-between';
                row.style.alignItems = 'center';
                row.innerHTML = `
                    <div style="font-size:0.75rem; color:#fff">
                        <span style="font-weight:600">#${i+1}:</span> (${pt.x.toFixed(3)}, ${pt.y.toFixed(3)})
                    </div>
                    <div style="display:flex; align-items:center; gap:4px">
                        <button class="btn-sm" style="padding:2px 6px; font-size:0.68rem; background:${b.bg}; color:${b.color}; border: 1px solid ${b.border}" onclick="cycleKnotMode('te', ${i})">
                            ${b.label}
                        </button>
                        <button class="del-btn" onclick="deleteTE(${i})">×</button>
                    </div>
                `;
                teList.appendChild(row);
            });
        }

        window.cycleKnotMode = (type, index) => {
            const list = type === 'le' ? wing.leKnots : wing.teKnots;
            if (list[index]) {
                const current = list[index].mode || 'smooth';
                let next = 'smooth';
                if (current === 'smooth') next = 'broken';
                else if (current === 'broken') next = 'sharp';
                else if (current === 'sharp') next = 'smooth';

                list[index].mode = next;
                if (next === 'smooth') {
                    const tOut = list[index].tanOut || list[index].tan || { x: 0.15, y: 0 };
                    list[index].tanOut = tOut;
                    list[index].tanIn = { x: -tOut.x, y: -tOut.y };
                } else if (next === 'broken') {
                    if (!list[index].tanOut) list[index].tanOut = list[index].tan || { x: 0.15, y: 0 };
                    if (!list[index].tanIn) list[index].tanIn = { x: -list[index].tanOut.x, y: -list[index].tanOut.y };
                }
                syncPointListUI();
                render();
            }
        };

        window.deleteLE = (i) => { wing.leKnots.splice(i, 1); syncPointListUI(); render(); };
        window.deleteTE = (i) => { wing.teKnots.splice(i, 1); syncPointListUI(); render(); };

        // --- Simple Mode DOM Events ---
        function updateSimpleSpan(val) {
            wing.tipLE.x = Math.max(0.1, val);
            if (wing.sweepMode === 'angle') {
                const deg = parseFloat(document.getElementById('inp-sweep-angle').value) || 0;
                const sweepDist = wing.tipLE.x * Math.tan(deg * Math.PI / 180);
                wing.tipLE.y = wing.rootLE.y - sweepDist;
            }
            syncInputsFromState();
            render();
        }

        function updateSimpleRoot(val) {
            const rootChord = Math.max(0.01, val);
            wing.rootTE.y = wing.rootLE.y - rootChord;
            syncInputsFromState();
            render();
        }

        function updateSimpleTip(val) {
            wing.tipChord = Math.max(0, val);
            syncInputsFromState();
            render();
        }

        function updateSimpleSweepAngle(deg) {
            const sweepDist = wing.tipLE.x * Math.tan(deg * Math.PI / 180);
            wing.tipLE.y = wing.rootLE.y - sweepDist;
            syncInputsFromState();
            render();
        }

        function updateSimpleSweepDist(dist) {
            wing.tipLE.y = wing.rootLE.y - dist;
            syncInputsFromState();
            render();
        }

        document.getElementById('rng-simple-span').oninput = (e) => updateSimpleSpan(parseFloat(e.target.value));
        document.getElementById('rng-simple-root').oninput = (e) => updateSimpleRoot(parseFloat(e.target.value));
        document.getElementById('rng-simple-tip').oninput = (e) => updateSimpleTip(parseFloat(e.target.value));

        document.getElementById('sel-sweep-type').onchange = (e) => {
            wing.sweepMode = e.target.value;
            syncInputsFromState();
        };

        document.getElementById('rng-sweep-angle').oninput = (e) => updateSimpleSweepAngle(parseFloat(e.target.value));
        document.getElementById('rng-sweep-dist').oninput = (e) => updateSimpleSweepDist(parseFloat(e.target.value));

        // Setup Math-enabled text inputs
        setupMathInput('inp-simple-span', updateSimpleSpan, () => wing.tipLE.x, 0.05, 50.0, 3);
        setupMathInput('inp-simple-root', updateSimpleRoot, () => wing.rootLE.y - wing.rootTE.y, 0.01, 50.0, 3);
        setupMathInput('inp-simple-tip', updateSimpleTip, () => wing.tipChord, 0.0, 50.0, 3);
        setupMathInput('inp-sweep-angle', updateSimpleSweepAngle, () => {
            const span = wing.tipLE.x;
            const sweepDist = wing.rootLE.y - wing.tipLE.y;
            return Math.atan2(sweepDist, Math.max(0.01, span)) * (180 / Math.PI);
        }, -89.0, 89.0, 1);
        setupMathInput('inp-sweep-dist', updateSimpleSweepDist, () => wing.rootLE.y - wing.tipLE.y, -50.0, 50.0, 3);

        setupMathInput('inp-root-le-y', (v) => { wing.rootLE.y = v; }, () => wing.rootLE.y, -50.0, 50.0, 3);
        setupMathInput('inp-root-te-y', (v) => { wing.rootTE.y = v; }, () => wing.rootTE.y, -50.0, 50.0, 3);
        setupMathInput('inp-tip-x', (v) => { 
            wing.tipLE.x = Math.max(0.05, v); 
            if (wing.designMode === 'simple') getTipTE().x = wing.tipLE.x; 
        }, () => wing.tipLE.x, 0.05, 50.0, 3);
        setupMathInput('inp-tip-y', (v) => { 
            wing.tipLE.y = v; 
            if (wing.designMode === 'simple') getTipTE().y = wing.tipLE.y - wing.tipChord; 
        }, () => wing.tipLE.y, -50.0, 50.0, 3);
        setupMathInput('inp-tip-te-x', (v) => { 
            getTipTE().x = Math.max(0.05, v); 
            wing.tipChord = Math.hypot(wing.tipLE.x - getTipTE().x, wing.tipLE.y - getTipTE().y); 
        }, () => getTipTE().x, 0.05, 50.0, 3);
        setupMathInput('inp-tip-te-y', (v) => { 
            getTipTE().y = v; 
            wing.tipChord = Math.hypot(wing.tipLE.x - getTipTE().x, wing.tipLE.y - getTipTE().y); 
        }, () => getTipTE().y, -50.0, 50.0, 3);

        // --- Spline Mode DOM Events ---
        document.getElementById('btn-toggle-root-le-mode').onclick = () => {
            wing.rootLE.mode = wing.rootLE.mode === 'sharp' ? 'smooth' : 'sharp';
            syncInputsFromState();
            render();
        };
        document.getElementById('btn-toggle-root-te-mode').onclick = () => {
            wing.rootTE.mode = wing.rootTE.mode === 'sharp' ? 'smooth' : 'sharp';
            syncInputsFromState();
            render();
        };
        document.getElementById('btn-toggle-tip-le-mode').onclick = () => {
            wing.tipLE.mode = wing.tipLE.mode === 'sharp' ? 'smooth' : 'sharp';
            syncInputsFromState();
            render();
        };
        document.getElementById('btn-toggle-tip-te-mode').onclick = () => {
            const tTE = getTipTE();
            tTE.mode = tTE.mode === 'sharp' ? 'smooth' : 'sharp';
            syncInputsFromState();
            render();
        };

        document.getElementById('chk-tangents').onchange = (e) => { wing.useTangents = e.target.checked; render(); };
        document.getElementById('chk-snap-points').onchange = (e) => { wing.snapPoints = e.target.checked; };
        document.getElementById('chk-snap-tangents').onchange = (e) => { wing.snapTangents = e.target.checked; };
        document.getElementById('chk-show-mac').onchange = (e) => { wing.showMAC = e.target.checked; render(); };
        document.getElementById('chk-show-point-labels').onchange = (e) => { wing.showPointLabels = e.target.checked; render(); };
        document.getElementById('rng-static-margin').oninput = (e) => {
            wing.staticMargin = parseFloat(e.target.value);
            document.getElementById('lbl-static-margin').innerText = `${wing.staticMargin.toFixed(1)}%`;
            render();
        };
        document.getElementById('rng-snap-step').oninput = (e) => {
            wing.gridSnapStep = parseFloat(e.target.value);
            document.getElementById('lbl-snap-step').innerText = `${wing.gridSnapStep.toFixed(3)} m`;
            render();
        };

        document.getElementById('chk-show-ribs').onchange = (e) => { wing.showRibs = e.target.checked; render(); };
        document.getElementById('chk-show-rib-labels').onchange = (e) => { wing.showRibLabels = e.target.checked; render(); };
        document.getElementById('rng-rib-count').oninput = (e) => { 
            wing.ribCount = parseInt(e.target.value); 
            document.getElementById('lbl-rib-count').innerText = wing.ribCount;
            render(); 
        };
        document.getElementById('sel-rib-mode').onchange = (e) => { 
            wing.ribMode = e.target.value; 
            updateRibModeUI();
            render(); 
        };
        document.getElementById('rng-curv-bias').oninput = (e) => {
            wing.curvatureSensitivity = parseFloat(e.target.value);
            document.getElementById('lbl-curv-bias').innerText = wing.curvatureSensitivity.toFixed(1);
            render();
        };

        document.getElementById('btn-snap-root-ortho').onclick = () => {
            wing.rootLeTan = { x: Math.max(0.1, wing.rootLeTan.x), y: 0 };
            wing.rootTeTan = { x: Math.max(0.1, wing.rootTeTan.x), y: 0 };
            render();
        };

        document.getElementById('btn-reset-tangents').onclick = () => {
            resetRootTangents();
            resetTipTangents();
            render();
        };

        document.getElementById('btn-all-smooth').onclick = () => {
            wing.rootLE.mode = 'smooth';
            wing.rootTE.mode = 'smooth';
            wing.tipLE.mode = 'smooth';
            wing.tipTE.mode = 'smooth';
            wing.leKnots.forEach(k => { 
                k.mode = 'smooth'; 
                const tOut = k.tanOut || k.tan || { x: 0.15, y: 0 };
                k.tanOut = tOut;
                k.tanIn = { x: -tOut.x, y: -tOut.y };
            });
            wing.teKnots.forEach(k => { 
                k.mode = 'smooth'; 
                const tOut = k.tanOut || k.tan || { x: -0.15, y: 0 };
                k.tanOut = tOut;
                k.tanIn = { x: -tOut.x, y: -tOut.y };
            });
            syncInputsFromState();
            render();
        };

        document.getElementById('btn-all-sharp').onclick = () => {
            wing.rootLE.mode = 'sharp';
            wing.rootTE.mode = 'sharp';
            wing.tipLE.mode = 'sharp';
            wing.tipTE.mode = 'sharp';
            wing.leKnots.forEach(k => { k.mode = 'sharp'; });
            wing.teKnots.forEach(k => { k.mode = 'sharp'; });
            syncInputsFromState();
            render();
        };

        document.getElementById('btn-add-le').onclick = () => {
            wing.leKnots.push({ x: wing.tipLE.x * 0.5, y: (wing.rootLE.y + wing.tipLE.y) * 0.5, mode: 'smooth', tan: { x: 0.15, y: 0 } });
            syncPointListUI();
            render();
        };

        document.getElementById('btn-add-te').onclick = () => {
            const tipTE = getTipTE();
            wing.teKnots.push({ x: (wing.tipLE.x + tipTE.x) * 0.25, y: (wing.rootTE.y + tipTE.y) * 0.5, mode: 'smooth', tan: { x: -0.15, y: 0 } });
            syncPointListUI();
            render();
        };

        function resetRootTangents() {
            const nextLE = wing.leKnots.length > 0 ? wing.leKnots[0] : wing.tipLE;
            const dxLE = nextLE.x - wing.rootLE.x;
            const dyLE = nextLE.y - wing.rootLE.y;
            const lenLE = Math.hypot(dxLE, dyLE) || 1;
            wing.rootLeTan = { x: (dxLE / lenLE) * 0.25, y: (dyLE / lenLE) * 0.25 };

            const tipTE = getTipTE();
            const nextTE = wing.teKnots.length > 0 ? wing.teKnots[0] : tipTE;
            const dxTE = nextTE.x - wing.rootTE.x;
            const dyTE = nextTE.y - wing.rootTE.y;
            const lenTE = Math.hypot(dxTE, dyTE) || 1;
            wing.rootTeTan = { x: (dxTE / lenTE) * 0.25, y: (dyTE / lenTE) * 0.25 };
        }

        function resetTipTangents() {
            const prevLE = wing.leKnots.length > 0 ? wing.leKnots[wing.leKnots.length - 1] : wing.rootLE;
            const dxLE = prevLE.x - wing.tipLE.x;
            const dyLE = prevLE.y - wing.tipLE.y;
            const lenLE = Math.hypot(dxLE, dyLE) || 1;
            wing.tipLeTan = { x: (dxLE / lenLE) * 0.25, y: (dyLE / lenLE) * 0.25 };

            const tipTE = getTipTE();
            const prevTE = wing.teKnots.length > 0 ? wing.teKnots[wing.teKnots.length - 1] : wing.rootTE;
            const dxTE = prevTE.x - tipTE.x;
            const dyTE = prevTE.y - tipTE.y;
            const lenTE = Math.hypot(dxTE, dyTE) || 1;
            wing.tipTeTan = { x: (dxTE / lenTE) * 0.25, y: (dyTE / lenTE) * 0.25 };
        }

        // Viewport Navigation Buttons
        document.getElementById('btn-zoom-in').onclick = () => { view.zoom = Math.min(2500, view.zoom * 1.25); render(); };
        document.getElementById('btn-zoom-out').onclick = () => { view.zoom = Math.max(50, view.zoom / 1.25); render(); };
        document.getElementById('btn-recenter').onclick = recenter;

        function recenter() {
            const tipTE = getTipTE();
            view.pan = { x: Math.max(wing.tipLE.x, tipTE.x) * 0.5, y: (wing.rootLE.y + wing.rootTE.y) * 0.5 };
            view.zoom = (canvas.width / (window.devicePixelRatio || 1)) * 0.45;
            render();
        }

        // --- Presets ---
        document.getElementById('pre-straight').onclick = () => {
            wing.rootLE = { x: 0, y: 0, mode: 'smooth' };
            wing.rootTE = { x: 0, y: -0.25, mode: 'smooth' };
            wing.tipLE = { x: 1.0, y: 0, mode: 'smooth' };
            wing.tipTE = { x: 1.0, y: -0.25, mode: 'smooth' };
            wing.tipChord = 0.25;
            wing.rootLeTan = { x: 0.25, y: 0 };
            wing.rootTeTan = { x: 0.25, y: 0 };
            wing.tipLeTan = { x: -0.25, y: 0 };
            wing.tipTeTan = { x: -0.25, y: 0 };
            wing.leKnots = [];
            wing.teKnots = [];
            wing.controlSurfaces = [];
            wing.ribCount = 10;
            wing.ribMode = 'curve';
            wing.ribCurveKeys = [{ time: 0, value: 0 }, { time: 1, value: 1 }];
            syncInputsFromState();
            recenter();
        };

        document.getElementById('pre-swept').onclick = () => {
            wing.rootLE = { x: 0, y: 0, mode: 'smooth' };
            wing.rootTE = { x: 0, y: -0.30, mode: 'smooth' };
            wing.tipLE = { x: 1.0, y: -0.15, mode: 'smooth' };
            wing.tipTE = { x: 1.0, y: -0.27, mode: 'smooth' };
            wing.tipChord = 0.12;
            wing.rootLeTan = { x: 0.25, y: -0.038 };
            wing.rootTeTan = { x: 0.25, y: -0.038 };
            wing.tipLeTan = { x: -0.25, y: 0.038 };
            wing.tipTeTan = { x: -0.25, y: 0.038 };
            wing.leKnots = [];
            wing.teKnots = [];
            wing.controlSurfaces = [
                { id: 1, name: "Aileron", xMin: 0.55, xMax: 0.95, yIn: -0.22, yOut: -0.28, yBot: -0.40, box: { xMin: 0.55, xMax: 0.95, yMin: -0.40, yMax: -0.22 }, deflection: 25 }
            ];
            wing.ribCount = 12;
            wing.ribMode = 'curve';
            wing.ribCurveKeys = [{ time: 0, value: 0 }, { time: 0.4, value: 0.25 }, { time: 1, value: 1 }];
            syncInputsFromState();
            recenter();
        };

        document.getElementById('pre-delta').onclick = () => {
            wing.rootLE = { x: 0, y: 0, mode: 'smooth' };
            wing.rootTE = { x: 0, y: -0.55, mode: 'smooth' };
            wing.tipLE = { x: 0.85, y: -0.45, mode: 'smooth' };
            wing.tipTE = { x: 0.85, y: -0.49, mode: 'smooth' };
            wing.tipChord = 0.04;
            wing.rootLeTan = { x: 0.25, y: -0.13 };
            wing.rootTeTan = { x: 0.25, y: 0.03 };
            wing.tipLeTan = { x: -0.20, y: 0.10 };
            wing.tipTeTan = { x: -0.20, y: -0.05 };
            wing.leKnots = [];
            wing.teKnots = [];
            wing.controlSurfaces = [
                { id: 1, name: "Elevon", xMin: 0.30, xMax: 0.80, yIn: -0.48, yOut: -0.52, yBot: -0.65, box: { xMin: 0.30, xMax: 0.80, yMin: -0.65, yMax: -0.48 }, deflection: 30 }
            ];
            wing.ribCount = 14;
            wing.ribMode = 'curvature';
            syncInputsFromState();
            recenter();
        };

        document.getElementById('pre-elliptical').onclick = () => {
            wing.rootLE = { x: 0, y: 0, mode: 'smooth' };
            wing.rootTE = { x: 0, y: -0.42, mode: 'smooth' };
            wing.tipLE = { x: 1.0, y: -0.08, mode: 'smooth' };
            wing.tipTE = { x: 1.0, y: -0.12, mode: 'smooth' };
            wing.tipChord = 0.04;
            wing.rootLeTan = { x: 0.55, y: 0.0 };
            wing.rootTeTan = { x: 0.40, y: 0.06 };
            wing.tipLeTan = { x: -0.35, y: 0.15 };
            wing.tipTeTan = { x: -0.40, y: -0.26 };
            wing.leKnots = [];
            wing.teKnots = [];
            wing.controlSurfaces = [];
            wing.ribCount = 14;
            wing.ribMode = 'curvature';
            setDesignMode('spline');
            recenter();
        };

        document.getElementById('pre-cranked').onclick = () => {
            wing.rootLE = { x: 0, y: 0, mode: 'sharp' };
            wing.rootTE = { x: 0, y: -0.60, mode: 'sharp' };
            wing.tipLE = { x: 1.0, y: -0.40, mode: 'sharp' };
            wing.tipTE = { x: 1.0, y: -0.48, mode: 'sharp' };
            wing.tipChord = 0.08;
            wing.rootLeTan = { x: 0.25, y: -0.15 };
            wing.rootTeTan = { x: 0.25, y: 0.025 };
            wing.tipLeTan = { x: -0.25, y: 0.05 };
            wing.tipTeTan = { x: -0.25, y: 0.05 };
            wing.leKnots = [{ x: 0.50, y: -0.30, mode: 'sharp' }];
            wing.teKnots = [{ x: 0.50, y: -0.55, mode: 'sharp' }];
            wing.controlSurfaces = [
                { id: 1, name: "Inboard Flap", xMin: 0.05, xMax: 0.45, yIn: -0.52, yOut: -0.54, yBot: -0.65, box: { xMin: 0.05, xMax: 0.45, yMin: -0.65, yMax: -0.52 }, deflection: 35 },
                { id: 2, name: "Outboard Aileron", xMin: 0.55, xMax: 0.95, yIn: -0.44, yOut: -0.46, yBot: -0.58, box: { xMin: 0.55, xMax: 0.95, yMin: -0.58, yMax: -0.44 }, deflection: 25 }
            ];
            wing.ribCount = 16;
            wing.ribMode = 'curvature';
            setDesignMode('spline');
            recenter();
        };

        document.getElementById('pre-scimitar').onclick = () => {
            wing.rootLE = { x: 0, y: 0, mode: 'smooth' };
            wing.rootTE = { x: 0, y: -0.35, mode: 'smooth' };
            wing.tipLE = { x: 1.05, y: -0.32, mode: 'smooth' };
            wing.tipTE = { x: 1.00, y: -0.38, mode: 'smooth' };
            wing.tipChord = 0.06;
            wing.rootLeTan = { x: 0.25, y: 0 };
            wing.rootTeTan = { x: 0.25, y: 0 };
            wing.tipLeTan = { x: -0.12, y: 0.15 };
            wing.tipTeTan = { x: -0.18, y: 0.08 };
            wing.leKnots = [
                { x: 0.40, y: -0.03, mode: 'smooth', tan: { x: 0.20, y: -0.05 } },
                { x: 0.80, y: -0.16, mode: 'smooth', tan: { x: 0.20, y: -0.12 } }
            ];
            wing.teKnots = [
                { x: 0.40, y: -0.34, mode: 'smooth', tan: { x: 0.20, y: 0.02 } },
                { x: 0.80, y: -0.36, mode: 'smooth', tan: { x: 0.20, y: -0.03 } }
            ];
            wing.controlSurfaces = [];
            wing.ribCount = 14;
            wing.ribMode = 'curvature';
            setDesignMode('spline');
            recenter();
        };

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

        // --- Init ---
        resizeCanvas();
        setDesignMode(wing.designMode || 'simple');
        setTimeout(recenter, 50);
    
function parseMathExpression(expr, fallback = 0, min = -Infinity, max = Infinity) {
            if (expr === null || expr === undefined) return fallback;
            if (typeof expr === 'number') {
                if (isNaN(expr) || !isFinite(expr)) return fallback;
                return Math.min(max, Math.max(min, expr));
            }
            const trimmed = String(expr).trim();
            if (!trimmed) return fallback;

            // Sanitize: remove any disallowed characters (keep digits, decimal point, + - * / ( ) and whitespace)
            const sanitized = trimmed.replace(/[^0-9+\-*/().\s]/g, '').trim();
            if (!sanitized) return fallback;

            // Ensure valid characters only
            if (!/^[-+/*().\s0-9]+$/.test(sanitized)) return fallback;

            // Reject dangerous or invalid consecutive operators (like **, //, +++, etc.)
            if (/([+/*]){2,}/.test(sanitized) || /[-+/*]{3,}/.test(sanitized)) return fallback;

            try {
                const fn = new Function(`'use strict'; return (${sanitized});`);
                const result = fn();
                if (typeof result !== 'number' || isNaN(result) || !isFinite(result)) {
                    return fallback;
                }
                return Math.min(max, Math.max(min, result));
            } catch (e) {
                return fallback;
            }
        }

        function setInputValueIfNotFocused(id, valStr) {
            const el = document.getElementById(id);
            if (el && document.activeElement !== el) {
                el.value = valStr;
            }
        }

        function setupMathInput(inputId, onCommit, getter, min = -Infinity, max = Infinity, decimals = 3) {
            const el = document.getElementById(inputId);
            if (!el) return;

            const commit = () => {
                const currentVal = getter ? getter() : 0;
                const evaluated = parseMathExpression(el.value, currentVal, min, max);
                onCommit(evaluated);
                el.value = decimals !== null ? evaluated.toFixed(decimals) : evaluated.toString();
                syncInputsFromState();
                render();
            };

            el.onkeydown = (e) => {
                if (e.key === 'Enter') {
                    commit();
                    el.blur();
                } else if (e.key === 'Escape') {
                    const currentVal = getter ? getter() : 0;
                    el.value = decimals !== null ? currentVal.toFixed(decimals) : currentVal.toString();
                    el.blur();
                }
            };

            el.onchange = commit;
            el.onblur = commit;
        }

        window.updateCSParam = (index, key, valStr, inputEl) => {
            const cs = wing.controlSurfaces[index];
            if (!cs) return;
            const currentVal = cs[key] !== undefined ? cs[key] : 0;
            const val = parseMathExpression(valStr, currentVal);
            cs[key] = val;
            if (inputEl) {
                inputEl.value = val.toFixed(3);
            }
            if (cs.box) {
                if (key === 'xMin') cs.box.xMin = val;
                if (key === 'xMax') cs.box.xMax = val;
                if (key === 'yIn' || key === 'yOut') cs.box.yMax = Math.max(cs.yIn, cs.yOut);
            }
            render();
        };

        window.deleteCS = (i) => {
            wing.controlSurfaces.splice(i, 1);
            view.selectedCSIndex = -1;
            syncControlSurfacesUI();
            render();
        };

        // --- Mode Switcher ---
        function setDesignMode(mode) {
            wing.designMode = mode;
            const isSimple = mode === 'simple';

            document.getElementById('tab-mode-simple').classList.toggle('active', isSimple);
            document.getElementById('tab-mode-spline').classList.toggle('active', !isSimple);

            document.getElementById('sec-simple-geometry').style.display = isSimple ? 'flex' : 'none';
            document.getElementById('sec-spline-anchors').style.display = isSimple ? 'none' : 'flex';
            document.getElementById('sec-spline-tangents').style.display = isSimple ? 'none' : 'flex';
            document.getElementById('sec-spline-knots').style.display = isSimple ? 'none' : 'flex';

            // In simple mode, clear intermediate knots
            if (isSimple) {
                wing.leKnots = [];
                wing.teKnots = [];
            }

            syncInputsFromState();
            render();
        }

        document.getElementById('tab-mode-simple').onclick = () => setDesignMode('simple');
        document.getElementById('tab-mode-spline').onclick = () => setDesignMode('spline');

        // --- Sidebar UI Synchronization ---
        function syncInputsFromState() {
            const span = wing.tipLE.x;
            const rootChord = Math.max(0.001, wing.rootLE.y - wing.rootTE.y);
            const tipChord = wing.tipChord;
            const sweepDist = wing.rootLE.y - wing.tipLE.y;
            const sweepAngleDeg = Math.atan2(sweepDist, Math.max(0.01, span)) * (180 / Math.PI);

            // Simple Mode Controls
            document.getElementById('rng-simple-span').value = span.toFixed(3);
            setInputValueIfNotFocused('inp-simple-span', span.toFixed(3));
            document.getElementById('lbl-simple-span').innerText = `${span.toFixed(3)} m`;

            document.getElementById('rng-simple-root').value = rootChord.toFixed(3);
            setInputValueIfNotFocused('inp-simple-root', rootChord.toFixed(3));
            document.getElementById('lbl-simple-root').innerText = `${rootChord.toFixed(3)} m`;

            document.getElementById('rng-simple-tip').value = tipChord.toFixed(3);
            setInputValueIfNotFocused('inp-simple-tip', tipChord.toFixed(3));
            document.getElementById('lbl-simple-tip').innerText = `${tipChord.toFixed(3)} m`;

            document.getElementById('sel-sweep-type').value = wing.sweepMode;
            document.getElementById('row-sweep-angle').style.display = wing.sweepMode === 'angle' ? 'flex' : 'none';
            document.getElementById('row-sweep-dist').style.display = wing.sweepMode === 'distance' ? 'flex' : 'none';

            document.getElementById('rng-sweep-angle').value = sweepAngleDeg.toFixed(1);
            setInputValueIfNotFocused('inp-sweep-angle', sweepAngleDeg.toFixed(1));
            document.getElementById('lbl-sweep-angle').innerText = `${sweepAngleDeg.toFixed(1)}°`;

            document.getElementById('rng-sweep-dist').value = sweepDist.toFixed(3);
            setInputValueIfNotFocused('inp-sweep-dist', sweepDist.toFixed(3));
            document.getElementById('lbl-sweep-dist').innerText = `${sweepDist.toFixed(3)} m`;

            // Spline Mode Controls
            const tTE = getTipTE();
            setInputValueIfNotFocused('inp-root-le-y', wing.rootLE.y.toFixed(3));
            setInputValueIfNotFocused('inp-root-te-y', wing.rootTE.y.toFixed(3));
            setInputValueIfNotFocused('inp-tip-x', wing.tipLE.x.toFixed(3));
            setInputValueIfNotFocused('inp-tip-y', wing.tipLE.y.toFixed(3));
            setInputValueIfNotFocused('inp-tip-te-x', tTE.x.toFixed(3));
            setInputValueIfNotFocused('inp-tip-te-y', tTE.y.toFixed(3));
            document.getElementById('chk-tangents').checked = wing.useTangents;
            document.getElementById('chk-snap-points').checked = wing.snapPoints;
            document.getElementById('chk-snap-tangents').checked = wing.snapTangents;
            document.getElementById('rng-snap-step').value = wing.gridSnapStep.toString();
            document.getElementById('lbl-snap-step').innerText = `${wing.gridSnapStep.toFixed(3)} m`;
            document.getElementById('chk-show-mac').checked = wing.showMAC;
            document.getElementById('chk-show-point-labels').checked = wing.showPointLabels;
            document.getElementById('rng-static-margin').value = (wing.staticMargin || 10).toString();
            document.getElementById('lbl-static-margin').innerText = `${(wing.staticMargin || 10).toFixed(1)}%`;
            document.getElementById('chk-show-ribs').checked = wing.showRibs;
            document.getElementById('chk-show-rib-labels').checked = wing.showRibLabels;
            document.getElementById('rng-rib-count').value = wing.ribCount;
            document.getElementById('lbl-rib-count').innerText = wing.ribCount;
            document.getElementById('sel-rib-mode').value = wing.ribMode;
            document.getElementById('rng-curv-bias').value = wing.curvatureSensitivity;
            document.getElementById('lbl-curv-bias').innerText = wing.curvatureSensitivity.toFixed(1);

            // Root & Tip Sharp/Smooth Buttons
            const btnRootLE = document.getElementById('btn-toggle-root-le-mode');
            const isRootLESharp = wing.rootLE.mode === 'sharp';
            btnRootLE.innerText = isRootLESharp ? '▱ Sharp' : '∿ Smooth';
            btnRootLE.style.background = isRootLESharp ? 'rgba(251,146,60,0.2)' : 'rgba(56,189,248,0.2)';
            btnRootLE.style.color = isRootLESharp ? 'var(--accent-orange)' : 'var(--accent-cyan)';

            const btnRootTE = document.getElementById('btn-toggle-root-te-mode');
            const isRootTESharp = wing.rootTE.mode === 'sharp';
            btnRootTE.innerText = isRootTESharp ? '▱ Sharp' : '∿ Smooth';
            btnRootTE.style.background = isRootTESharp ? 'rgba(251,146,60,0.2)' : 'rgba(56,189,248,0.2)';
            btnRootTE.style.color = isRootTESharp ? 'var(--accent-orange)' : 'var(--accent-cyan)';

            const btnTipLE = document.getElementById('btn-toggle-tip-le-mode');
            const isTipLESharp = wing.tipLE.mode === 'sharp';
            btnTipLE.innerText = isTipLESharp ? '▱ Sharp' : '∿ Smooth';
            btnTipLE.style.background = isTipLESharp ? 'rgba(251,146,60,0.2)' : 'rgba(56,189,248,0.2)';
            btnTipLE.style.color = isTipLESharp ? 'var(--accent-orange)' : 'var(--accent-cyan)';

            const btnTipTE = document.getElementById('btn-toggle-tip-te-mode');
            const isTipTESharp = tTE.mode === 'sharp';
            btnTipTE.innerText = isTipTESharp ? '▱ Sharp' : '∿ Smooth';
            btnTipTE.style.background = isTipTESharp ? 'rgba(251,146,60,0.2)' : 'rgba(56,189,248,0.2)';
            btnTipTE.style.color = isTipTESharp ? 'var(--accent-orange)' : 'var(--accent-cyan)';

            updateRibModeUI();
            syncPointListUI();
            syncControlSurfacesUI();
            renderCurveEditor();
        }

        function updateRibModeUI() {
            const isCurv = wing.ribMode === 'curvature';
            document.getElementById('row-curvature-bias').style.display = isCurv ? 'flex' : 'none';
            document.getElementById('container-curve-widget').style.display = isCurv ? 'none' : 'flex';
        }

        function getKnotBadgeHTML(mode) {
            if (mode === 'sharp') return { label: '▱ Sharp', bg: 'rgba(251,146,60,0.2)', color: 'var(--accent-orange)', border: 'rgba(251,146,60,0.4)' };
            if (mode === 'broken') return { label: '✂ Split', bg: 'rgba(234,179,8,0.2)', color: 'var(--accent-yellow)', border: 'rgba(234,179,8,0.4)' };
            return { label: '∿ Smooth', bg: 'rgba(56,189,248,0.2)', color: 'var(--accent-cyan)', border: 'rgba(56,189,248,0.4)' };
        }

        function syncPointListUI() {
            const leList = document.getElementById('le-points-list');
            leList.innerHTML = '';
            wing.leKnots.forEach((pt, i) => {
                const b = getKnotBadgeHTML(pt.mode);
                const row = document.createElement('div');
                row.className = 'point-item';
                row.style.display = 'flex';
                row.style.justifyContent = 'space-between';
                row.style.alignItems = 'center';
                row.innerHTML = `
                    <div style="font-size:0.75rem; color:#fff">
                        <span style="font-weight:600">#${i+1}:</span> (${pt.x.toFixed(3)}, ${pt.y.toFixed(3)})
                    </div>
                    <div style="display:flex; align-items:center; gap:4px">
                        <button class="btn-sm" style="padding:2px 6px; font-size:0.68rem; background:${b.bg}; color:${b.color}; border: 1px solid ${b.border}" onclick="cycleKnotMode('le', ${i})">
                            ${b.label}
                        </button>
                        <button class="del-btn" onclick="deleteLE(${i})">×</button>
                    </div>
                `;
                leList.appendChild(row);
            });

            const teList = document.getElementById('te-points-list');
            teList.innerHTML = '';
            wing.teKnots.forEach((pt, i) => {
                const b = getKnotBadgeHTML(pt.mode);
                const row = document.createElement('div');
                row.className = 'point-item';
                row.style.display = 'flex';
                row.style.justifyContent = 'space-between';
                row.style.alignItems = 'center';
                row.innerHTML = `
                    <div style="font-size:0.75rem; color:#fff">
                        <span style="font-weight:600">#${i+1}:</span> (${pt.x.toFixed(3)}, ${pt.y.toFixed(3)})
                    </div>
                    <div style="display:flex; align-items:center; gap:4px">
                        <button class="btn-sm" style="padding:2px 6px; font-size:0.68rem; background:${b.bg}; color:${b.color}; border: 1px solid ${b.border}" onclick="cycleKnotMode('te', ${i})">
                            ${b.label}
                        </button>
                        <button class="del-btn" onclick="deleteTE(${i})">×</button>
                    </div>
                `;
                teList.appendChild(row);
            });
        }

        window.cycleKnotMode = (type, index) => {
            const list = type === 'le' ? wing.leKnots : wing.teKnots;
            if (list[index]) {
                const current = list[index].mode || 'smooth';
                let next = 'smooth';
                if (current === 'smooth') next = 'broken';
                else if (current === 'broken') next = 'sharp';
                else if (current === 'sharp') next = 'smooth';

                list[index].mode = next;
                if (next === 'smooth') {
                    const tOut = list[index].tanOut || list[index].tan || { x: 0.15, y: 0 };
                    list[index].tanOut = tOut;
                    list[index].tanIn = { x: -tOut.x, y: -tOut.y };
                } else if (next === 'broken') {
                    if (!list[index].tanOut) list[index].tanOut = list[index].tan || { x: 0.15, y: 0 };
                    if (!list[index].tanIn) list[index].tanIn = { x: -list[index].tanOut.x, y: -list[index].tanOut.y };
                }
                syncPointListUI();
                render();
            }
        };

        window.deleteLE = (i) => { wing.leKnots.splice(i, 1); syncPointListUI(); render(); };
        window.deleteTE = (i) => { wing.teKnots.splice(i, 1); syncPointListUI(); render(); };

        // --- Simple Mode DOM Events ---
        function updateSimpleSpan(val) {
            wing.tipLE.x = Math.max(0.1, val);
            if (wing.sweepMode === 'angle') {
                const deg = parseFloat(document.getElementById('inp-sweep-angle').value) || 0;
                const sweepDist = wing.tipLE.x * Math.tan(deg * Math.PI / 180);
                wing.tipLE.y = wing.rootLE.y - sweepDist;
            }
            syncInputsFromState();
            render();
        }

        function updateSimpleRoot(val) {
            const rootChord = Math.max(0.01, val);
            wing.rootTE.y = wing.rootLE.y - rootChord;
            syncInputsFromState();
            render();
        }

        function updateSimpleTip(val) {
            wing.tipChord = Math.max(0, val);
            syncInputsFromState();
            render();
        }

        function updateSimpleSweepAngle(deg) {
            const sweepDist = wing.tipLE.x * Math.tan(deg * Math.PI / 180);
            wing.tipLE.y = wing.rootLE.y - sweepDist;
            syncInputsFromState();
            render();
        }

        function updateSimpleSweepDist(dist) {
            wing.tipLE.y = wing.rootLE.y - dist;
            syncInputsFromState();
            render();
        }

        document.getElementById('rng-simple-span').oninput = (e) => updateSimpleSpan(parseFloat(e.target.value));
        document.getElementById('rng-simple-root').oninput = (e) => updateSimpleRoot(parseFloat(e.target.value));
        document.getElementById('rng-simple-tip').oninput = (e) => updateSimpleTip(parseFloat(e.target.value));

        document.getElementById('sel-sweep-type').onchange = (e) => {
            wing.sweepMode = e.target.value;
            syncInputsFromState();
        };

        document.getElementById('rng-sweep-angle').oninput = (e) => updateSimpleSweepAngle(parseFloat(e.target.value));
        document.getElementById('rng-sweep-dist').oninput = (e) => updateSimpleSweepDist(parseFloat(e.target.value));

        // Setup Math-enabled text inputs
        setupMathInput('inp-simple-span', updateSimpleSpan, () => wing.tipLE.x, 0.05, 50.0, 3);
        setupMathInput('inp-simple-root', updateSimpleRoot, () => wing.rootLE.y - wing.rootTE.y, 0.01, 50.0, 3);
        setupMathInput('inp-simple-tip', updateSimpleTip, () => wing.tipChord, 0.0, 50.0, 3);
        setupMathInput('inp-sweep-angle', updateSimpleSweepAngle, () => {
            const span = wing.tipLE.x;
            const sweepDist = wing.rootLE.y - wing.tipLE.y;
            return Math.atan2(sweepDist, Math.max(0.01, span)) * (180 / Math.PI);
        }, -89.0, 89.0, 1);
        setupMathInput('inp-sweep-dist', updateSimpleSweepDist, () => wing.rootLE.y - wing.tipLE.y, -50.0, 50.0, 3);

        setupMathInput('inp-root-le-y', (v) => { wing.rootLE.y = v; }, () => wing.rootLE.y, -50.0, 50.0, 3);
        setupMathInput('inp-root-te-y', (v) => { wing.rootTE.y = v; }, () => wing.rootTE.y, -50.0, 50.0, 3);
        setupMathInput('inp-tip-x', (v) => { 
            wing.tipLE.x = Math.max(0.05, v); 
            if (wing.designMode === 'simple') getTipTE().x = wing.tipLE.x; 
        }, () => wing.tipLE.x, 0.05, 50.0, 3);
        setupMathInput('inp-tip-y', (v) => { 
            wing.tipLE.y = v; 
            if (wing.designMode === 'simple') getTipTE().y = wing.tipLE.y - wing.tipChord; 
        }, () => wing.tipLE.y, -50.0, 50.0, 3);
        setupMathInput('inp-tip-te-x', (v) => { 
            getTipTE().x = Math.max(0.05, v); 
            wing.tipChord = Math.hypot(wing.tipLE.x - getTipTE().x, wing.tipLE.y - getTipTE().y); 
        }, () => getTipTE().x, 0.05, 50.0, 3);
        setupMathInput('inp-tip-te-y', (v) => { 
            getTipTE().y = v; 
            wing.tipChord = Math.hypot(wing.tipLE.x - getTipTE().x, wing.tipLE.y - getTipTE().y); 
        }, () => getTipTE().y, -50.0, 50.0, 3);

        // --- Spline Mode DOM Events ---
        document.getElementById('btn-toggle-root-le-mode').onclick = () => {
            wing.rootLE.mode = wing.rootLE.mode === 'sharp' ? 'smooth' : 'sharp';
            syncInputsFromState();
            render();
        };
        document.getElementById('btn-toggle-root-te-mode').onclick = () => {
            wing.rootTE.mode = wing.rootTE.mode === 'sharp' ? 'smooth' : 'sharp';
            syncInputsFromState();
            render();
        };
        document.getElementById('btn-toggle-tip-le-mode').onclick = () => {
            wing.tipLE.mode = wing.tipLE.mode === 'sharp' ? 'smooth' : 'sharp';
            syncInputsFromState();
            render();
        };
        document.getElementById('btn-toggle-tip-te-mode').onclick = () => {
            const tTE = getTipTE();
            tTE.mode = tTE.mode === 'sharp' ? 'smooth' : 'sharp';
            syncInputsFromState();
            render();
        };

        document.getElementById('chk-tangents').onchange = (e) => { wing.useTangents = e.target.checked; render(); };
        document.getElementById('chk-snap-points').onchange = (e) => { wing.snapPoints = e.target.checked; };
        document.getElementById('chk-snap-tangents').onchange = (e) => { wing.snapTangents = e.target.checked; };
        document.getElementById('chk-show-mac').onchange = (e) => { wing.showMAC = e.target.checked; render(); };
        document.getElementById('chk-show-point-labels').onchange = (e) => { wing.showPointLabels = e.target.checked; render(); };
        document.getElementById('rng-static-margin').oninput = (e) => {
            wing.staticMargin = parseFloat(e.target.value);
            document.getElementById('lbl-static-margin').innerText = `${wing.staticMargin.toFixed(1)}%`;
            render();
        };
        document.getElementById('rng-snap-step').oninput = (e) => {
            wing.gridSnapStep = parseFloat(e.target.value);
            document.getElementById('lbl-snap-step').innerText = `${wing.gridSnapStep.toFixed(3)} m`;
            render();
        };

        document.getElementById('chk-show-ribs').onchange = (e) => { wing.showRibs = e.target.checked; render(); };
        document.getElementById('chk-show-rib-labels').onchange = (e) => { wing.showRibLabels = e.target.checked; render(); };
        document.getElementById('rng-rib-count').oninput = (e) => { 
            wing.ribCount = parseInt(e.target.value); 
            document.getElementById('lbl-rib-count').innerText = wing.ribCount;
            render(); 
        };
        document.getElementById('sel-rib-mode').onchange = (e) => { 
            wing.ribMode = e.target.value; 
            updateRibModeUI();
            render(); 
        };
        document.getElementById('rng-curv-bias').oninput = (e) => {
            wing.curvatureSensitivity = parseFloat(e.target.value);
            document.getElementById('lbl-curv-bias').innerText = wing.curvatureSensitivity.toFixed(1);
            render();
        };

        document.getElementById('btn-snap-root-ortho').onclick = () => {
            wing.rootLeTan = { x: Math.max(0.1, wing.rootLeTan.x), y: 0 };
            wing.rootTeTan = { x: Math.max(0.1, wing.rootTeTan.x), y: 0 };
            render();
        };

        document.getElementById('btn-reset-tangents').onclick = () => {
            resetRootTangents();
            resetTipTangents();
            render();
        };

        document.getElementById('btn-all-smooth').onclick = () => {
            wing.rootLE.mode = 'smooth';
            wing.rootTE.mode = 'smooth';
            wing.tipLE.mode = 'smooth';
            wing.tipTE.mode = 'smooth';
            wing.leKnots.forEach(k => { 
                k.mode = 'smooth'; 
                const tOut = k.tanOut || k.tan || { x: 0.15, y: 0 };
                k.tanOut = tOut;
                k.tanIn = { x: -tOut.x, y: -tOut.y };
            });
            wing.teKnots.forEach(k => { 
                k.mode = 'smooth'; 
                const tOut = k.tanOut || k.tan || { x: -0.15, y: 0 };
                k.tanOut = tOut;
                k.tanIn = { x: -tOut.x, y: -tOut.y };
            });
            syncInputsFromState();
            render();
        };

        document.getElementById('btn-all-sharp').onclick = () => {
            wing.rootLE.mode = 'sharp';
            wing.rootTE.mode = 'sharp';
            wing.tipLE.mode = 'sharp';
            wing.tipTE.mode = 'sharp';
            wing.leKnots.forEach(k => { k.mode = 'sharp'; });
            wing.teKnots.forEach(k => { k.mode = 'sharp'; });
            syncInputsFromState();
            render();
        };

        document.getElementById('btn-add-le').onclick = () => {
            wing.leKnots.push({ x: wing.tipLE.x * 0.5, y: (wing.rootLE.y + wing.tipLE.y) * 0.5, mode: 'smooth', tan: { x: 0.15, y: 0 } });
            syncPointListUI();
            render();
        };

        document.getElementById('btn-add-te').onclick = () => {
            const tipTE = getTipTE();
            wing.teKnots.push({ x: (wing.tipLE.x + tipTE.x) * 0.25, y: (wing.rootTE.y + tipTE.y) * 0.5, mode: 'smooth', tan: { x: -0.15, y: 0 } });
            syncPointListUI();
            render();
        };

        function resetRootTangents() {
            const nextLE = wing.leKnots.length > 0 ? wing.leKnots[0] : wing.tipLE;
            const dxLE = nextLE.x - wing.rootLE.x;
            const dyLE = nextLE.y - wing.rootLE.y;
            const lenLE = Math.hypot(dxLE, dyLE) || 1;
            wing.rootLeTan = { x: (dxLE / lenLE) * 0.25, y: (dyLE / lenLE) * 0.25 };

            const tipTE = getTipTE();
            const nextTE = wing.teKnots.length > 0 ? wing.teKnots[0] : tipTE;
            const dxTE = nextTE.x - wing.rootTE.x;
            const dyTE = nextTE.y - wing.rootTE.y;
            const lenTE = Math.hypot(dxTE, dyTE) || 1;
            wing.rootTeTan = { x: (dxTE / lenTE) * 0.25, y: (dyTE / lenTE) * 0.25 };
        }

        function resetTipTangents() {
            const prevLE = wing.leKnots.length > 0 ? wing.leKnots[wing.leKnots.length - 1] : wing.rootLE;
            const dxLE = prevLE.x - wing.tipLE.x;
            const dyLE = prevLE.y - wing.tipLE.y;
            const lenLE = Math.hypot(dxLE, dyLE) || 1;
            wing.tipLeTan = { x: (dxLE / lenLE) * 0.25, y: (dyLE / lenLE) * 0.25 };

            const tipTE = getTipTE();
            const prevTE = wing.teKnots.length > 0 ? wing.teKnots[wing.teKnots.length - 1] : wing.rootTE;
            const dxTE = prevTE.x - tipTE.x;
            const dyTE = prevTE.y - tipTE.y;
            const lenTE = Math.hypot(dxTE, dyTE) || 1;
            wing.tipTeTan = { x: (dxTE / lenTE) * 0.25, y: (dyTE / lenTE) * 0.25 };
        }

        // Viewport Navigation Buttons
        document.getElementById('btn-zoom-in').onclick = () => { view.zoom = Math.min(2500, view.zoom * 1.25); render(); };
        document.getElementById('btn-zoom-out').onclick = () => { view.zoom = Math.max(50, view.zoom / 1.25); render(); };
        document.getElementById('btn-recenter').onclick = recenter;

        function recenter() {
            const tipTE = getTipTE();
            view.pan = { x: Math.max(wing.tipLE.x, tipTE.x) * 0.5, y: (wing.rootLE.y + wing.rootTE.y) * 0.5 };
            view.zoom = (canvas.width / (window.devicePixelRatio || 1)) * 0.45;
            render();
        }

        // --- Presets ---
        document.getElementById('pre-straight').onclick = () => {
            wing.rootLE = { x: 0, y: 0, mode: 'smooth' };
            wing.rootTE = { x: 0, y: -0.25, mode: 'smooth' };
            wing.tipLE = { x: 1.0, y: 0, mode: 'smooth' };
            wing.tipTE = { x: 1.0, y: -0.25, mode: 'smooth' };
            wing.tipChord = 0.25;
            wing.rootLeTan = { x: 0.25, y: 0 };
            wing.rootTeTan = { x: 0.25, y: 0 };
            wing.tipLeTan = { x: -0.25, y: 0 };
            wing.tipTeTan = { x: -0.25, y: 0 };
            wing.leKnots = [];
            wing.teKnots = [];
            wing.controlSurfaces = [];
            wing.ribCount = 10;
            wing.ribMode = 'curve';
            wing.ribCurveKeys = [{ time: 0, value: 0 }, { time: 1, value: 1 }];
            syncInputsFromState();
            recenter();
        };

        document.getElementById('pre-swept').onclick = () => {
            wing.rootLE = { x: 0, y: 0, mode: 'smooth' };
            wing.rootTE = { x: 0, y: -0.30, mode: 'smooth' };
            wing.tipLE = { x: 1.0, y: -0.15, mode: 'smooth' };
            wing.tipTE = { x: 1.0, y: -0.27, mode: 'smooth' };
            wing.tipChord = 0.12;
            wing.rootLeTan = { x: 0.25, y: -0.038 };
            wing.rootTeTan = { x: 0.25, y: -0.038 };
            wing.tipLeTan = { x: -0.25, y: 0.038 };
            wing.tipTeTan = { x: -0.25, y: 0.038 };
            wing.leKnots = [];
            wing.teKnots = [];
            wing.controlSurfaces = [
                { id: 1, name: "Aileron", xMin: 0.55, xMax: 0.95, yIn: -0.22, yOut: -0.28, yBot: -0.40, box: { xMin: 0.55, xMax: 0.95, yMin: -0.40, yMax: -0.22 }, deflection: 25 }
            ];
            wing.ribCount = 12;
            wing.ribMode = 'curve';
            wing.ribCurveKeys = [{ time: 0, value: 0 }, { time: 0.4, value: 0.25 }, { time: 1, value: 1 }];
            syncInputsFromState();
            recenter();
        };

        document.getElementById('pre-delta').onclick = () => {
            wing.rootLE = { x: 0, y: 0, mode: 'smooth' };
            wing.rootTE = { x: 0, y: -0.55, mode: 'smooth' };
            wing.tipLE = { x: 0.85, y: -0.45, mode: 'smooth' };
            wing.tipTE = { x: 0.85, y: -0.49, mode: 'smooth' };
            wing.tipChord = 0.04;
            wing.rootLeTan = { x: 0.25, y: -0.13 };
            wing.rootTeTan = { x: 0.25, y: 0.03 };
            wing.tipLeTan = { x: -0.20, y: 0.10 };
            wing.tipTeTan = { x: -0.20, y: -0.05 };
            wing.leKnots = [];
            wing.teKnots = [];
            wing.controlSurfaces = [
                { id: 1, name: "Elevon", xMin: 0.30, xMax: 0.80, yIn: -0.48, yOut: -0.52, yBot: -0.65, box: { xMin: 0.30, xMax: 0.80, yMin: -0.65, yMax: -0.48 }, deflection: 30 }
            ];
            wing.ribCount = 14;
            wing.ribMode = 'curvature';
            syncInputsFromState();
            recenter();
        };

        document.getElementById('pre-elliptical').onclick = () => {
            wing.rootLE = { x: 0, y: 0, mode: 'smooth' };
            wing.rootTE = { x: 0, y: -0.42, mode: 'smooth' };
            wing.tipLE = { x: 1.0, y: -0.08, mode: 'smooth' };
            wing.tipTE = { x: 1.0, y: -0.12, mode: 'smooth' };
            wing.tipChord = 0.04;
            wing.rootLeTan = { x: 0.55, y: 0.0 };
            wing.rootTeTan = { x: 0.40, y: 0.06 };
            wing.tipLeTan = { x: -0.35, y: 0.15 };
            wing.tipTeTan = { x: -0.40, y: -0.26 };
            wing.leKnots = [];
            wing.teKnots = [];
            wing.controlSurfaces = [];
            wing.ribCount = 14;
            wing.ribMode = 'curvature';
            setDesignMode('spline');
            recenter();
        };

        document.getElementById('pre-cranked').onclick = () => {
            wing.rootLE = { x: 0, y: 0, mode: 'sharp' };
            wing.rootTE = { x: 0, y: -0.60, mode: 'sharp' };
            wing.tipLE = { x: 1.0, y: -0.40, mode: 'sharp' };
            wing.tipTE = { x: 1.0, y: -0.48, mode: 'sharp' };
            wing.tipChord = 0.08;
            wing.rootLeTan = { x: 0.25, y: -0.15 };
            wing.rootTeTan = { x: 0.25, y: 0.025 };
            wing.tipLeTan = { x: -0.25, y: 0.05 };
            wing.tipTeTan = { x: -0.25, y: 0.05 };
            wing.leKnots = [{ x: 0.50, y: -0.30, mode: 'sharp' }];
            wing.teKnots = [{ x: 0.50, y: -0.55, mode: 'sharp' }];
            wing.controlSurfaces = [
                { id: 1, name: "Inboard Flap", xMin: 0.05, xMax: 0.45, yIn: -0.52, yOut: -0.54, yBot: -0.65, box: { xMin: 0.05, xMax: 0.45, yMin: -0.65, yMax: -0.52 }, deflection: 35 },
                { id: 2, name: "Outboard Aileron", xMin: 0.55, xMax: 0.95, yIn: -0.44, yOut: -0.46, yBot: -0.58, box: { xMin: 0.55, xMax: 0.95, yMin: -0.58, yMax: -0.44 }, deflection: 25 }
            ];
            wing.ribCount = 16;
            wing.ribMode = 'curvature';
            setDesignMode('spline');
            recenter();
        };

        document.getElementById('pre-scimitar').onclick = () => {
            wing.rootLE = { x: 0, y: 0, mode: 'smooth' };
            wing.rootTE = { x: 0, y: -0.35, mode: 'smooth' };
            wing.tipLE = { x: 1.05, y: -0.32, mode: 'smooth' };
            wing.tipTE = { x: 1.00, y: -0.38, mode: 'smooth' };
            wing.tipChord = 0.06;
            wing.rootLeTan = { x: 0.25, y: 0 };
            wing.rootTeTan = { x: 0.25, y: 0 };
            wing.tipLeTan = { x: -0.12, y: 0.15 };
            wing.tipTeTan = { x: -0.18, y: 0.08 };
            wing.leKnots = [
                { x: 0.40, y: -0.03, mode: 'smooth', tan: { x: 0.20, y: -0.05 } },
                { x: 0.80, y: -0.16, mode: 'smooth', tan: { x: 0.20, y: -0.12 } }
            ];
            wing.teKnots = [
                { x: 0.40, y: -0.34, mode: 'smooth', tan: { x: 0.20, y: 0.02 } },
                { x: 0.80, y: -0.36, mode: 'smooth', tan: { x: 0.20, y: -0.03 } }
            ];
            wing.controlSurfaces = [];
            wing.ribCount = 14;
            wing.ribMode = 'curvature';
            setDesignMode('spline');
            recenter();
        };

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

        // --- Init ---
        resizeCanvas();
        setDesignMode(wing.designMode || 'simple');
        setTimeout(recenter, 50);
    