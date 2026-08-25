import { useEffect, useState } from "react";
import Sidebar from "./components/Sidebar";
import TopBar from "./components/TopBar";
import Featured from "./components/Featured";
import Investments from "./components/Investments";
import Transactions from "./components/Transactions";

const STAGE_W = 1440;
const STAGE_H = 1024;

export default function App() {
  const [scale, setScale] = useState(1);

  useEffect(() => {
    const fit = () => {
      const pad = 56; // page padding * 2
      const s = Math.min(
        1,
        (window.innerWidth - pad) / STAGE_W,
        (window.innerHeight - pad) / STAGE_H,
      );
      setScale(s);
    };
    fit();
    window.addEventListener("resize", fit);
    return () => window.removeEventListener("resize", fit);
  }, []);

  return (
    <div className="page">
      <div
        className="stage-frame"
        style={{ width: STAGE_W * scale, height: STAGE_H * scale }}
      >
        <div className="stage" style={{ transform: `scale(${scale})` }}>
          <Sidebar />
          <TopBar />
          <Featured />

          {/* Bottom section labels */}
          <div className="bottom-label" style={{ left: 459 }}>
            Your investments
          </div>
          <div className="bottom-label" style={{ left: 1004 }}>
            Recent transactions
          </div>
          <div className="view-all">View all</div>

          <Investments />
          <Transactions />
        </div>
      </div>
    </div>
  );
}
