# Method
SVG source rendered directly with Sharp/librsvg; versions in renderer.json. 8x native dimensions then Lanczos3, white/#181818, sRGB output. Native + 3x nearest board. SVG holes transparent, not painted in background. All seven sizes exported both polarities; 0.5px Gaussian blur on favicon outputs. Ink centroids in centering.json are measurements, not human optical validation.
Prior r005 Pillow renderer drew two overlapping cutout ellipses for c03, while its SVG has one. Parent SVG is authoritative for this comparison; r005 evidence preserved, cannot establish SVG equivalence.
No eyes, no motion, no palette decision.
