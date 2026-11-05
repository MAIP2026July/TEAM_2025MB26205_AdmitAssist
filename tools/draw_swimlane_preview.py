#!/usr/bin/env python3
"""Draws PNG previews of the two swimlanes for the PDF copies (PDFs cannot render PlantUML).
The PlantUML files in diagrams/ are the source of truth; these previews follow the same steps.
Usage: python tools/draw_swimlane_preview.py"""
import pathlib
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
from matplotlib.patches import FancyBboxPatch, Polygon

OUT = pathlib.Path(__file__).resolve().parents[1] / "diagrams" / "preview"
OUT.mkdir(parents=True, exist_ok=True)
COL = {"rule": "#DDEEFF", "ai": "#FFE0B2", "human": "#D7F5D7", "stop": "#F8D7DA", "plain": "#FFFFFF", "dec": "#FFFFFF"}

def draw(name, title, lanes, nodes, edges, legend=True):
    lane_w, row_h = 3.2, 1.05
    rows = max(n["row"] for n in nodes) + 1
    W, H = lane_w * len(lanes), row_h * rows + 1.5
    fig, ax = plt.subplots(figsize=(W * 0.95, H * 0.95))
    ax.set_xlim(0, W); ax.set_ylim(0, H); ax.axis("off")
    for i, ln in enumerate(lanes):
        ax.add_patch(plt.Rectangle((i * lane_w, 0.5), lane_w, H - 1.05, facecolor="#F7F9FC" if i % 2 else "#FFFFFF", edgecolor="#B0B8C4", lw=0.8))
        ax.add_patch(plt.Rectangle((i * lane_w, H - 0.95), lane_w, 0.4, facecolor="#12355B", edgecolor="#12355B"))
        ax.text(i * lane_w + lane_w / 2, H - 0.75, ln, ha="center", va="center", color="white", fontsize=10, weight="bold")
    ax.text(0.05, H - 0.28, title, fontsize=12, weight="bold", color="#12355B", va="center")
    pos = {}
    for n in nodes:
        li = lanes.index(n["lane"]); cx = li * lane_w + lane_w / 2; cy = H - 1.45 - n["row"] * row_h
        pos[n["id"]] = (cx, cy)
        w, h = lane_w * 0.88, row_h * 0.72
        if n["type"] == "dec":
            ax.add_patch(Polygon([(cx, cy + h / 2), (cx + w / 2, cy), (cx, cy - h / 2), (cx - w / 2, cy)], closed=True, facecolor="#FFFDE7", edgecolor="#555", lw=1))
        else:
            ax.add_patch(FancyBboxPatch((cx - w / 2, cy - h / 2), w, h, boxstyle="round,pad=0.02,rounding_size=0.12", facecolor=COL[n["type"]], edgecolor="#555", lw=1))
        ax.text(cx, cy, n["text"], ha="center", va="center", fontsize=7.6, wrap=True)
    for a, b, lab in edges:
        (x1, y1), (x2, y2) = pos[a], pos[b]
        if abs(x1 - x2) < 0.01:
            ax.annotate("", xy=(x2, y2 + row_h * 0.36), xytext=(x1, y1 - row_h * 0.36), arrowprops=dict(arrowstyle="-|>", color="#333", lw=1))
        elif abs(y1 - y2) < 0.01:
            dx = lane_w * 0.44 if x2 > x1 else -lane_w * 0.44
            ax.annotate("", xy=(x2 - dx, y2), xytext=(x1 + dx, y1), arrowprops=dict(arrowstyle="-|>", color="#333", lw=1))
        else:
            ym = (y1 - row_h * 0.36 + y2 + row_h * 0.36) / 2
            ax.plot([x1, x1, x2], [y1 - row_h * 0.36, ym, ym], color="#333", lw=1)
            ax.annotate("", xy=(x2, y2 + row_h * 0.36), xytext=(x2, ym), arrowprops=dict(arrowstyle="-|>", color="#333", lw=1))
        if lab:
            ax.text((x1 + x2) / 2 + 0.05, (y1 + y2) / 2 + 0.08, lab, fontsize=7, color="#8B0000", ha="center")
    if legend:
        items = [("rule", "Rule (same output every time)"), ("ai", "AI model (quality can vary)"), ("human", "Person decides"), ("stop", "Stop: AI output not used")]
        for i, (k, t) in enumerate(items):
            x = 0.15 + i * (W - 0.3) / 4
            ax.add_patch(plt.Rectangle((x, 0.12), 0.3, 0.22, facecolor=COL[k], edgecolor="#555", lw=0.8))
            ax.text(x + 0.38, 0.23, t, fontsize=8, va="center")
    fig.savefig(OUT / f"{name}.png", dpi=150, bbox_inches="tight")
    plt.close(fig)

# Today
lanes = ["Parent", "Front-office coordinator", "Principal"]
nodes = [
    dict(id="a", lane="Parent", row=0, type="plain", text="Sends inquiry: WhatsApp, voice note,\ncall, walk-in, web form, e-mail"),
    dict(id="b", lane="Front-office coordinator", row=1, type="stop", text="Waits in order of arrival\n(no priority)"),
    dict(id="c", lane="Front-office coordinator", row=2, type="human", text="Reads it, works out class\nand urgency (about 6 min, est.)"),
    dict(id="d", lane="Front-office coordinator", row=3, type="dec", text="Complaint, fee help\nor child's health?"),
    dict(id="e", lane="Principal", row=3, type="human", text="Replies when free\n(no target time)"),
    dict(id="f", lane="Front-office coordinator", row=4, type="stop", text="Types reply from memory:\nanswers vary, fees/dates can be wrong"),
    dict(id="g", lane="Front-office coordinator", row=5, type="stop", text="Sends; writes in register\nif there is time"),
    dict(id="h", lane="Parent", row=6, type="plain", text="Gets reply hours to days later;\nvisits or goes elsewhere"),
]
edges = [("a", "b", ""), ("b", "c", ""), ("c", "d", ""), ("d", "e", "yes"), ("d", "f", "no"), ("f", "g", ""), ("g", "h", "")]
draw("01_current_workflow_preview", "Today: one admission inquiry, no tool (preview of diagrams/01_current_workflow.puml)", lanes, nodes, edges, legend=False)

# V1
lanes = ["Parent", "Front-office coordinator", "AdmitAssist rules", "AdmitAssist AI model", "Principal"]
nodes = [
    dict(id="p0", lane="Parent", row=0, type="plain", text="Sends inquiry\n(any channel)"),
    dict(id="h1", lane="Front-office coordinator", row=1, type="human", text="H1 Pastes message or\ntypes call/walk-in notes"),
    dict(id="r1", lane="AdmitAssist rules", row=2, type="rule", text="R1-R3 Hide phones/e-mails,\nsensitive words, class patterns"),
    dict(id="a1", lane="AdmitAssist AI model", row=3, type="ai", text="AI1 Read: class, timeframe,\nsignals, sensitive?, quotes,\nconfidence (~Rs 0.24)"),
    dict(id="d1", lane="AdmitAssist rules", row=4, type="dec", text="Valid JSON\nin 2 tries?"),
    dict(id="x1", lane="Front-office coordinator", row=4, type="stop", text="Read it yourself\n(reply-by 2 h)"),
    dict(id="r4", lane="AdmitAssist rules", row=5, type="rule", text="R4 Quote check, class\ncross-check, Sure/Check/Not sure"),
    dict(id="d2", lane="AdmitAssist rules", row=6, type="dec", text="Sensitive\n(rules or AI)?"),
    dict(id="x2", lane="Principal", row=6, type="stop", text="Staff only: no AI draft,\nreply personally (8 h)"),
    dict(id="d3", lane="AdmitAssist rules", row=7, type="dec", text="Not admission,\nintent 0.8+?"),
    dict(id="x3", lane="Front-office coordinator", row=7, type="human", text="Pass to the\nright person"),
    dict(id="r5", lane="AdmitAssist rules", row=8, type="rule", text="R5-R7 Priority points; AI can\nonly raise; LOW only if Sure;\nreply-by time"),
    dict(id="a2", lane="AdmitAssist AI model", row=9, type="ai", text="AI2 Draft from approved\nschool facts (~Rs 0.13)"),
    dict(id="r8", lane="AdmitAssist rules", row=10, type="rule", text="R8 Check draft: promises, amounts,\nnumbers, times, months, length\n(1 automatic rewrite)"),
    dict(id="h3", lane="Front-office coordinator", row=11, type="human", text="H3 Reads card + reasons,\nedits, approves or rejects"),
    dict(id="h4", lane="Front-office coordinator", row=12, type="human", text="H4 Presses Send in WhatsApp\n(tool cannot send); R9 log"),
    dict(id="p1", lane="Parent", row=13, type="plain", text="Correct reply;\nHIGH within 2 working hours"),
]
edges = [("p0", "h1", ""), ("h1", "r1", ""), ("r1", "a1", ""), ("a1", "d1", ""), ("d1", "x1", "no"), ("d1", "r4", "yes"),
         ("r4", "d2", ""), ("d2", "x2", "yes"), ("d2", "d3", "no"), ("d3", "x3", "yes"), ("d3", "r5", "no"),
         ("r5", "a2", ""), ("a2", "r8", ""), ("r8", "h3", ""), ("h3", "h4", ""), ("h4", "p1", "")]
draw("02_target_workflow_v1_preview", "AdmitAssist V1: one inquiry end to end (preview of diagrams/02_target_workflow_v1.puml)", lanes, nodes, edges)
print("previews written to", OUT)
