# Free-Form Wing Designer ✈️📐

An interactive web-based 2D CAD & Aerodynamics tool for designing free-form parametric and spline-based aircraft wings. Built with native HTML5 Canvas and vanilla ES6 JavaScript—zero dependencies, lightweight, and fast.

Designed for RC aircraft, UAVs, model builders, and aerodynamicists.

---

## ✨ Features

- **Dual Design Modes**:
  - **Parametric Mode**: Rapid geometric definition for 4-corner trapezoidal, swept, and delta wings.
  - **Spline Mode**: Free-form multi-knot cubic Hermite splines with customizable tangent slope vectors.
- **Knot & Tangent Customization**:
  - `Smooth`, `Sharp`, and `Split (Broken)` knot modes.
  - Dual independent incoming/outgoing tangent arms with orthogonal fuselage snapping.
- **Aerodynamics & Stability Suite**:
  - Real-time **Planform Area**, **Aspect Ratio (AR)**, and **Taper Ratio ($\lambda$)**.
  - **Mean Aerodynamic Chord (MAC)** & Quarter-Chord Aerodynamic Center (Neutral Point).
  - Target **Center of Gravity (CoG)** calculated from customizable Static Margin.
- **Trailing Edge Control Surfaces**:
  - Interactive box drawing & boundary validation.
  - Automatic collision / overlap checks and Leading Edge protection.
  - Adjustable inboard/outboard hinge depth lines and deflection angles ($\pm^\circ$).
- **Spanwise Rib Distribution Engine**:
  - **Interactive Animation Curve Editor**: Custom multi-key normalized distribution (root-dense, tip-dense, S-curve).
  - **Adaptive Curvature Engine**: Automatically concentrates ribs in regions of high geometric curvature ($\kappa$).
- **Math-Enabled Inputs**:
  - Support for inline arithmetic expressions (`+`, `-`, `*`, `/`, parens) in all numerical fields.
  - High precision formatted to 1 mm (`0.001 m`).
- **Export & Import**:
  - Save/load wing planform definitions in standard JSON.
  - Vector SVG export for laser cutting, CAD import, and 3D modeling.

---

## 🚀 Getting Started

### Local Use
Simply open `index.html` in any modern web browser:
```bash
open index.html
```

Or run a local static server:
```bash
npx serve .
# or
python3 -m http.server 8000
```

---

## 📁 Project Structure

```
free-form-wing-designer/
├── index.html              # Main application markup
├── css/
│   └── style.css           # Dark theme UI styles, sidebar, and layout
├── js/
│   ├── app.js              # Application entry point & initialization
│   ├── splineMath.js       # Hermite spline math, tangents, curve sampling & collision
│   ├── aerodynamics.js     # Area, Aspect Ratio, MAC, Neutral Point & CoG
│   ├── wingState.js        # Wing data model, default state, and presets
│   ├── canvasRenderer.js   # 2D Viewport rendering (wing skins, ribs, control surfaces)
│   ├── curveEditor.js      # Interactive animation curve widget
│   ├── uiController.js     # Sidebar event handling & math expression inputs
│   └── fileOps.js          # JSON/SVG export & import handlers
├── README.md               # Documentation
└── LICENSE                 # MIT License
```

---

## 📄 License
Distributed under the MIT License. See `LICENSE` for more information.
