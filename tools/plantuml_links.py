#!/usr/bin/env python3
"""Prints a plantuml.com link for every diagram in diagrams/ (the same encoding the PlantUML server uses).
Usage: python tools/plantuml_links.py   -> paste a link in a browser to see the rendered diagram."""
import zlib, pathlib
A = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz-_"
def encode(text):
    data = zlib.compress(text.encode("utf-8"), 9)[2:-4]
    out = []
    for i in range(0, len(data), 3):
        b = data[i:i + 3] + b"\0\0"
        out.append(A[b[0] >> 2] + A[((b[0] & 3) << 4) | (b[1] >> 4)] + A[((b[1] & 0xF) << 2) | (b[2] >> 6)] + A[b[2] & 0x3F])
    return "".join(out)
for p in sorted((pathlib.Path(__file__).resolve().parents[1] / "diagrams").glob("*.puml")):
    print(f"{p.name}: https://www.plantuml.com/plantuml/svg/{encode(p.read_text(encoding='utf-8'))}")
