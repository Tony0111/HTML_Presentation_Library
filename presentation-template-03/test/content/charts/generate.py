from pathlib import Path
import csv
import math
import argparse
from plotly.offline import get_plotlyjs

import matplotlib as mpl
mpl.use("Agg")
import matplotlib.pyplot as plt
import plotly.graph_objects as go

ROOT = Path(__file__).resolve().parent
DATA = ROOT / "data.csv"
OUT = ROOT / "output"
OUT.mkdir(exist_ok=True)

parser = argparse.ArgumentParser()
parser.add_argument('--reset-demo', action='store_true', help='Explicitly replace the CSV with synthetic demo data')
args = parser.parse_args()
# CSV 是数值的唯一来源；常规重绘不覆盖用户已修改的数据。
if not DATA.exists() or args.reset_demo:
    demo = []
    for i in range(41):
        t = i / 10
        demo.append({'time_s': t, 'signal_a': 0.18 + 0.74 * math.exp(-((t - 2.0) ** 2) / 1.15) + 0.035 * math.sin(t * 5),
                     'signal_b': 0.16 + 0.60 * math.exp(-((t - 2.9) ** 2) / 1.8) + 0.025 * math.cos(t * 4.2)})
    with DATA.open('w', newline='', encoding='utf-8') as f:
        writer = csv.DictWriter(f, fieldnames=demo[0].keys())
        writer.writeheader()
        writer.writerows(demo)
with DATA.open(encoding='utf-8', newline='') as f:
    rows = [{key: float(value) for key, value in row.items()} for row in csv.DictReader(f)]
if not rows or any(not math.isfinite(value) for row in rows for value in row.values()):
    raise ValueError('CSV must contain finite numeric data')
if any(rows[i]['time_s'] >= rows[i+1]['time_s'] for i in range(len(rows)-1)):
    raise ValueError('time_s must be strictly increasing')

mpl.rcParams.update({
    "font.family": "DejaVu Sans",
    "svg.fonttype": "path",
    "svg.hashsalt": "editorial-demo",
    "font.size": 11,
    "axes.edgecolor": "#222226",
    "axes.labelcolor": "#222226",
    "xtick.color": "#66636a",
    "ytick.color": "#66636a",
    "text.color": "#222226",
    "savefig.facecolor": "#f3efe6",
    "axes.facecolor": "#f3efe6",
})
fig, ax = plt.subplots(figsize=(12, 5.9), dpi=160)
fig.patch.set_facecolor("#f3efe6")
ax.set_facecolor("#f3efe6")
x = [r["time_s"] for r in rows]
a = [r["signal_a"] for r in rows]
b = [r["signal_b"] for r in rows]
ax.plot(x, a, color="#c8452c", linewidth=2.8, label="signal A")
ax.plot(x, b, color="#354a5f", linewidth=2.8, linestyle='--', label="signal B")
ax.fill_between(x, a, b, color="#c8452c", alpha=.08)
ax.set_xlim(min(x), max(x))
ax.set_ylim(min(0, min(a+b) * 1.1), max(a+b) * 1.15)
ax.set_xlabel("time (s)", labelpad=12)
ax.set_ylabel("amplitude (a.u.)", labelpad=12)
ax.set_title("Two trajectories, one visible difference", loc="left", fontsize=17, fontweight="bold", pad=20)
ax.grid(axis="y", color="#222226", alpha=.12, linewidth=.7)
ax.grid(axis="x", visible=False)
ax.spines["top"].set_visible(False)
ax.spines["right"].set_visible(False)
ax.legend(frameon=False, loc="upper right", ncol=2)
fig.text(.02, .02, "SYNTHETIC EXAMPLE · NOT A RESEARCH RESULT", fontsize=8, color="#8d8990", family="DejaVu Sans")
fig.tight_layout(rect=(0, .04, 1, 1))
fig.savefig(OUT / "trend.svg", format="svg", bbox_inches="tight", metadata={'Date': None})
plt.close(fig)

fig = go.Figure()
fig.add_trace(go.Scatter(x=x, y=a, mode="lines", name="signal A", line={"color": "#c8452c", "width": 3}))
fig.add_trace(go.Scatter(x=x, y=b, mode="lines", name="signal B", line={"color": "#354a5f", "width": 3, "dash": "dash"}))
fig.update_layout(
    title={"text": "Two trajectories, one visible difference", "x": 0.02, "xanchor": "left"},
    paper_bgcolor="#f3efe6", plot_bgcolor="#f3efe6", font={"family": "Arial, sans-serif", "color": "#222226", "size": 13},
    margin={"l": 90, "r": 40, "t": 100, "b": 70}, autosize=True,
    xaxis={"title": "time (s)", "gridcolor": "rgba(34,34,38,.12)", "zeroline": False},
    yaxis={"title": "amplitude (a.u.)", "gridcolor": "rgba(34,34,38,.12)", "zeroline": False},
    legend={"orientation": "h", "y": 1.08, "x": 0},
)
# This local bundle is copied into the delivery folder, never fetched at runtime.
(OUT / 'plotly.min.js').write_text(get_plotlyjs(), encoding='utf-8')
plot = fig.to_html(include_plotlyjs='plotly.min.js', full_html=False, div_id='signal-chart',
                   default_width='100%', default_height='100%',
                   config={'displaylogo': False, 'responsive': True, 'scrollZoom': False,
                           'modeBarButtonsToRemove': ['toImage', 'sendDataToCloud']},
                   post_script="parent.postMessage({type:'chart-ready'}, '*');")
bridge = '''<script>
const keys = ['ArrowRight','ArrowLeft','ArrowUp','ArrowDown','PageDown','PageUp','Home','End','Backspace',' ','Enter','f','F'];
addEventListener('keydown', event => {
  if (!keys.includes(event.key)) return;
  event.preventDefault();
  if (!event.repeat) parent.postMessage({type:'chart-key',key:event.key}, '*');
});
addEventListener('error', () => parent.postMessage({type:'chart-error'}, '*'), true);
</script>'''
html = '''<!doctype html><html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Synthetic signal example — Plotly</title>
<style>html,body{height:100%;margin:0;background:#f3efe6}body>div{height:100%}</style>
</head><body>''' + bridge + plot + '</body></html>'
(OUT / 'interactive.html').write_text(html, encoding='utf-8')
print(f'Generated SVG + offline Plotly HTML from {len(rows)} CSV rows: {OUT}')
