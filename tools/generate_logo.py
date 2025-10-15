#!/usr/bin/env python3
"""
Programmatically generate Chrono Lite breakthrough logos (Time Stream + Smart Grid)
Requires: Pillow (PIL)

Run:
  python3 tools/generate_logo.py
"""

import os
import math
from PIL import Image, ImageDraw

PRIMARY_BLUE = (66, 133, 244, 255)  # Google Blue
DEEP_BLUE = (30, 60, 114, 255)
LIGHT_BLUE = (160, 200, 255, 255)
WHITE = (255, 255, 255, 255)


def ensure_dirs():
    os.makedirs('assets/icons', exist_ok=True)
    os.makedirs('assets/design', exist_ok=True)


def draw_gradient_circle(draw, center, radius):
    # Radial gradient approximation with concentric circles
    steps = 24
    for i in range(steps):
        t = i / float(steps - 1)
        r = int(radius * (1 - t))
        # Interpolate color from deep blue to primary blue
        color = (
            int(DEEP_BLUE[0] * (1 - t) + PRIMARY_BLUE[0] * t),
            int(DEEP_BLUE[1] * (1 - t) + PRIMARY_BLUE[1] * t),
            int(DEEP_BLUE[2] * (1 - t) + PRIMARY_BLUE[2] * t),
            255,
        )
        draw.ellipse([center - r, center - r, center + r, center + r], fill=color)


def draw_time_stream(draw, cx, cy, width, amplitude, phase, stroke_width):
    # Flowing time stream curve across the logo
    points = []
    start_x = cx - width // 2
    for i in range(width + 1):
        x = start_x + i
        y = cy + int(amplitude * math.sin((i + phase) * 0.12))
        points.append((x, y))
    if len(points) > 1:
        draw.line(points, fill=WHITE, width=stroke_width)
        # Nodes on the stream (organized checkpoints)
        step = max(16, width // 12)
        for i in range(0, len(points), step):
            x, y = points[i]
            draw.ellipse([x - stroke_width, y - stroke_width, x + stroke_width, y + stroke_width], fill=WHITE)


def draw_smart_grid(draw, cx, cy, size, lines, stroke_width):
    # Minimal grid indicating "from chaos to order"
    half = size // 2
    start = cx - half
    end = cx + half
    step = size // (lines - 1)
    for i in range(lines):
        y = start + i * step
        draw.line([start, y, end, y], fill=WHITE, width=stroke_width)
        x = start + i * step
        draw.line([x, start, x, end], fill=WHITE, width=stroke_width)
    # Focus nodes along diagonal
    for i in range(lines):
        x = start + i * step
        y = start + i * step
        draw.ellipse([x - stroke_width, y - stroke_width, x + stroke_width, y + stroke_width], fill=WHITE)


def draw_center_clock(draw, cx, cy, r, stroke_width):
    # Simple readable clock at 2 o'clock
    draw.ellipse([cx - r, cy - r, cx + r, cy + r], outline=WHITE, width=stroke_width)
    draw.ellipse([cx - stroke_width, cy - stroke_width, cx + stroke_width, cy + stroke_width], fill=WHITE)
    # Hour and minute hands
    hour_len = int(r * 0.6)
    min_len = int(r * 0.85)
    # 2 o'clock (60 degrees)
    hx = cx + int(hour_len * math.sin(math.radians(60)))
    hy = cy - int(hour_len * math.cos(math.radians(60)))
    mx = cx + int(min_len * math.sin(math.radians(60)))
    my = cy - int(min_len * math.cos(math.radians(60)))
    draw.line([cx, cy, hx, hy], fill=WHITE, width=stroke_width)
    draw.line([cx, cy, mx, my], fill=WHITE, width=max(1, stroke_width - 1))


def draw_mail_envelope(draw, cx, y_top, w, h, stroke_width):
    x0 = cx - w // 2
    x1 = cx + w // 2
    y0 = y_top
    y1 = y_top + h
    draw.rectangle([x0, y0, x1, y1], outline=WHITE, width=stroke_width)
    draw.line([x0, y0, cx, y0 - h // 3], fill=WHITE, width=stroke_width)
    draw.line([x1, y0, cx, y0 - h // 3], fill=WHITE, width=stroke_width)


def generate_logo(size=512):
    img = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)

    cx, cy = size // 2, size // 2
    radius = int(size * 0.42)

    # Background gradient circle
    draw_gradient_circle(draw, cx, radius)

    # Time Stream across upper mid
    stream_y = cy - int(size * 0.12)
    draw_time_stream(draw, cx, stream_y, width=int(size * 0.8), amplitude=int(size * 0.05), phase=0, stroke_width=max(3, size // 48))

    # Smart Grid in lower area
    grid_size = int(size * 0.5)
    draw_smart_grid(draw, cx, cy + int(size * 0.06), grid_size, lines=4, stroke_width=max(2, size // 64))

    # Center clock
    draw_center_clock(draw, cx, cy, r=int(size * 0.16), stroke_width=max(3, size // 40))

    # Envelope near bottom
    draw_mail_envelope(draw, cx, cy + int(size * 0.24), w=int(size * 0.28), h=int(size * 0.18), stroke_width=max(3, size // 40))

    return img


def main():
    ensure_dirs()

    sizes = [16, 32, 48, 128, 256, 512]

    # Generate icons
    for s in sizes:
        logo = generate_logo(s)
        path = f"assets/icons/icon-{s}.png"
        logo.save(path, 'PNG')
        print(f"✅ {path}")

    # Main logos
    generate_logo(512).save('assets/logo.png', 'PNG')
    generate_logo(200).save('assets/logo-200.png', 'PNG')
    print("✅ assets/logo.png, assets/logo-200.png")

if __name__ == '__main__':
    main()
