
import { useState } from "react";

import Dashboard from "./pages/Dashboard";
import Vehicles from "./pages/Vehicles";
import Trajectories from "./pages/Trajectories";
import CameraNetwork from "./pages/CameraNetwork";
import Patterns from "./pages/Patterns";
import Anomalies from "./pages/Anomalies";

import {
  LayoutDashboard,
  CarFront,
  Route,
  Network,
  Activity,
  AlertTriangle,
} from "lucide-react";

const navigation = [
  { name: "Overview", icon: LayoutDashboard },
  { name: "Vehicles", icon: CarFront },
  { name: "Trajectories", icon: Route },
  { name: "Camera Network", icon: Network },
  { name: "Patterns", icon: Activity },
  { name: "Anomaly Detection", icon: AlertTriangle },
];

function App() {
  const [activePage, setActivePage] = useState("Overview");

  return (
    <div className="app-layout">

      {/* Sidebar */}
      <aside className="sidebar">

        <div className="brand">
          <div className="brand-icon">TF</div>

          <div>
            <h2>TrafficFlow</h2>
            <span>Intelligent Mobility</span>
          </div>
        </div>

        <p className="menu-label">MAIN MENU</p>

        <nav>
          {navigation.map((item) => {
            const Icon = item.icon;

            return (
              <button
                key={item.name}
                className={
                  activePage === item.name
                    ? "nav-item active"
                    : "nav-item"
                }
                onClick={() => setActivePage(item.name)}
              >
                <Icon size={19} />
                {item.name}
              </button>
            );
          })}
        </nav>

        <div className="sidebar-footer">
          <span className="online-dot"></span>
          Backend API Connected
        </div>

      </aside>

      {/* Main Content */}
      <main className="main-content">

        {/* Navbar */}
        <header className="topbar">

          <div>
            <h3>{activePage}</h3>
            <p>Traffic intelligence platform</p>
          </div>

          <div className="user-avatar">TF</div>

        </header>

        {/* Page Routing */}
        {activePage === "Overview" ? (

          <Dashboard />

        ) : activePage === "Vehicles" ? (

          <Vehicles />

        ) : activePage === "Trajectories" ? (

          <Trajectories />

        ) : activePage === "Camera Network" ? (

          <CameraNetwork />

        ) : activePage === "Patterns" ? (

          <Patterns />

        ) : activePage === "Anomaly Detection" ? (

          <Anomalies />

        ) : (

          <div className="content-card coming-soon">
            <h2>{activePage}</h2>
            <p>This section will be implemented in the next development step.</p>
          </div>

        )}

      </main>

    </div>
  );
}

export default App;
