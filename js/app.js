// Application Entry Point & Initialization
window.addEventListener('resize', resizeCanvas);
window.addEventListener('load', () => {
    resizeCanvas();
    setDesignMode(wing.designMode || 'simple');
    if (wing.ribMode === 'curve') {
        renderCurveEditor();
    }
    setTimeout(recenter, 50);
});
