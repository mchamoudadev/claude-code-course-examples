import { A } from "../data";
import Caret from "./Caret";

const legend = [
  { label: "Aliquam", color: "var(--chart-purple)" },
  { label: "Morbi", color: "var(--chart-pink)" },
  { label: "Molestie", color: "var(--chart-orange)" },
];

export default function Investments() {
  return (
    <div className="invest-card">
      {/* All dropdown */}
      <div className="invest-dropdown">
        <div className="dropdown">
          <span>All</span>
          <Caret size={20} />
        </div>
      </div>

      {/* 1D / 1W / 1Y segmented control */}
      <div className="segmented">
        <div className="segmented__pill" />
        <button>1D</button>
        <button style={{ color: "var(--muted)" }}>1W</button>
        <button>1Y</button>
      </div>

      {/* Legend */}
      <div className="invest-legend">
        {legend.map((l) => (
          <div className="legend-item" key={l.label}>
            <span className="legend-dot" style={{ background: l.color }} />
            <span style={{ color: l.color }}>{l.label}</span>
          </div>
        ))}
      </div>

      {/* Chart: dashed grid + three overlaid waves */}
      <div className="invest-chart">
        <img className="invest-grid" src={`${A}/invest-chart-grid.svg`} alt="" />
        <img className="wave wave--purple" src={`${A}/invest-wave-3.svg`} alt="" />
        <img className="wave wave--pink" src={`${A}/invest-wave-2.svg`} alt="" />
        <img className="wave wave--orange" src={`${A}/invest-wave-1.svg`} alt="" />
      </div>
    </div>
  );
}
