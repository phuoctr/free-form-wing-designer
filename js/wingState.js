// ============================================================================
// Wing State, Viewport State & Global Canvas Handles
// ============================================================================

var wing = {
    designMode: 'simple', // 'simple' (parametric 4-corner) or 'spline' (multi-knot CAD)
    sweepMode: 'angle',   // 'angle' (degrees) or 'distance' (meters)

    rootLE: { x: 0, y: 0, mode: 'smooth' },
    rootTE: { x: 0, y: -0.35, mode: 'smooth' },
    tipLE: { x: 1.0, y: -0.15, mode: 'smooth' },
    tipTE: { x: 1.0, y: -0.27, mode: 'smooth' },
    tipChord: 0.12,
    
    useTangents: true,
    rootLeTan: { x: 0.25, y: -0.038 },
    rootTeTan: { x: 0.25, y: -0.038 },
    tipLeTan: { x: -0.25, y: 0.038 },
    tipTeTan: { x: -0.25, y: 0.038 },

    leKnots: [],
    teKnots: [],

    // Snapping Options
    snapPoints: true,
    snapTangents: true,
    gridSnapStep: 0.05,

    // Control Surfaces List
    controlSurfaces: [],

    // Rib Options
    showRibs: false,
    showRibLabels: true,
    ribCount: 12,
    ribMode: 'curve', // 'curve' or 'curvature'
    curvatureSensitivity: 2.5,

    // Animation Curve Keyframes
    ribCurveKeys: [
        { time: 0.0, value: 0.0 },
        { time: 0.5, value: 0.45 },
        { time: 1.0, value: 1.0 }
    ],

    showMAC: true,
    showPointLabels: false,
    staticMargin: 10.0, // Static Margin in % of MAC
    showMirrored: true
};

function getTipTE() {
    if (!wing.tipTE) {
        wing.tipTE = { 
            x: wing.tipLE.x, 
            y: wing.tipLE.y - (wing.tipChord !== undefined ? wing.tipChord : 0.12), 
            mode: 'smooth' 
        };
    }
    if (wing.tipTE.x === undefined) wing.tipTE.x = wing.tipLE.x;
    if (wing.tipTE.y === undefined) wing.tipTE.y = wing.tipLE.y - (wing.tipChord !== undefined ? wing.tipChord : 0.12);
    if (wing.tipTE.mode === undefined) wing.tipTE.mode = 'smooth';

    if (wing.designMode === 'simple') {
        wing.tipTE.x = wing.tipLE.x;
        wing.tipTE.y = wing.tipLE.y - (wing.tipChord !== undefined ? wing.tipChord : 0.12);
    }
    return wing.tipTE;
}

// --- Viewport State ---
var view = {
    pan: { x: 0.5, y: -0.15 },
    zoom: 380, // pixels per meter
    isDragging: false,
    lastMouse: { x: 0, y: 0 },
    hoverHandle: null,
    activeHandle: null,
    dragHandle: null,

    // Tool state
    toolMode: 'select', // 'select' or 'draw_cs'
    drawBox: null, // { start: {x,y}, current: {x,y}, isValid: true, error: "" }
    hoverCSIndex: -1,
    selectedCSIndex: -1
};

// --- Curve Editor State ---
var curveEditor = {
    canvas: document.getElementById('curve-canvas'),
    ctx: document.getElementById('curve-canvas').getContext('2d'),
    hoverKey: -1,
    dragKey: -1,
    padding: 12
};

var canvas = document.getElementById('viewport');
var ctx = canvas.getContext('2d');
var container = document.getElementById('canvas-container');
var contextMenu = document.getElementById('context-menu');
var toast = document.getElementById('toast');
var contextPos = { x: 0, y: 0 };
var toastTimeout = null;

function showToast(msg) {
    toast.innerText = msg;
    toast.style.display = 'block';
    clearTimeout(toastTimeout);
    toastTimeout = setTimeout(() => { toast.style.display = 'none'; }, 2400);
}
