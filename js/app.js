// ============================================================================
// Main Application Bootstrap & Lifecycle
// ============================================================================

// --- Resize Canvas with HiDPI ---
        function resizeCanvas() {
            const dpr = window.devicePixelRatio || 1;
            canvas.width = container.clientWidth * dpr;
            canvas.height = container.clientHeight * dpr;

            const rect = curveEditor.canvas.getBoundingClientRect();
            curveEditor.canvas.width = rect.width * dpr;
            curveEditor.canvas.height = rect.height * dpr;

            render();
            renderCurveEditor();
        }
        window.addEventListener('resize', resizeCanvas);

// Window & Lifecycle Listeners
window.addEventListener('resize', resizeCanvas);
window.addEventListener('load', () => {
    resizeCanvas();
    setDesignMode(wing.designMode || 'simple');
    if (wing.ribMode === 'curve') {
        renderCurveEditor();
    }
    setTimeout(recenter, 50);
});

