
// import { useEffect, useState } from "react";

// import ReactFlow, {
//   Background,
//   Controls,
//   MiniMap,
//   MarkerType,
// } from "reactflow";

// import "reactflow/dist/style.css";

// import { getCityFlowCameraNetwork } from "../services/api";

// function CameraGraph({ sequence = "S04" }) {
//   const [nodes, setNodes] = useState([]);
//   const [edges, setEdges] = useState([]);
//   const [loading, setLoading] = useState(true);
//   const [error, setError] = useState("");
//   const [routeSummary, setRouteSummary] = useState(null);

//   useEffect(() => {
//     let active = true;

//     async function loadNetwork() {
//       try {
//         setLoading(true);
//         setError("");

//         const response = await getCityFlowCameraNetwork(sequence);
//         const routes = response.data.routes || [];

//         if (!active) return;

//         if (routes.length === 0) {
//           setNodes([]);
//           setEdges([]);
//           setRouteSummary({
//             totalRoutes: 0,
//             totalTransitions: 0,
//           });
//           return;
//         }

//         const cameraIds = [
//           ...new Set(
//             routes.flatMap((route) => [
//               route.from_camera,
//               route.to_camera,
//             ])
//           ),
//         ];

//         const maxVehicles = Math.max(
//           ...routes.map((route) => route.vehicle_count),
//           1
//         );

//         const cameraStats = {};

//         cameraIds.forEach((camera) => {
//           cameraStats[camera] = {
//             incoming: 0,
//             outgoing: 0,
//           };
//         });

//         routes.forEach((route) => {
//           cameraStats[route.from_camera].outgoing +=
//             route.vehicle_count;

//           cameraStats[route.to_camera].incoming +=
//             route.vehicle_count;
//         });

//         // Arrange camera nodes in a grid.
//         const columns = 3;
//         const graphNodes = cameraIds.map((cameraId, index) => {
//           const stats = cameraStats[cameraId];

//           return {
//             id: cameraId,
//             position: {
//               x: 100 + (index % columns) * 300,
//               y: 100 + Math.floor(index / columns) * 210,
//             },
//             data: {
//               label:
//                 `${cameraId}\n` +
//                 `Incoming: ${stats.incoming}\n` +
//                 `Outgoing: ${stats.outgoing}`,
//             },
//             style: {
//               background: "#172554",
//               color: "#ffffff",
//               border: "1px solid #38bdf8",
//               borderRadius: "12px",
//               padding: "18px",
//               width: 190,
//               whiteSpace: "pre-line",
//               fontSize: "13px",
//               fontWeight: "600",
//               textAlign: "center",
//               lineHeight: "1.8",
//               boxShadow: "0 4px 18px rgba(56,189,248,0.12)",
//             },
//           };
//         });

//         // Create directional connections.
//         const graphEdges = routes.map((route, index) => {
//           const count = route.vehicle_count;

//           const strokeWidth =
//             2 + (count / maxVehicles) * 5;

//           return {
//             id: `route-${sequence}-${index}`,
//             source: route.from_camera,
//             target: route.to_camera,
//             type: "smoothstep",
//             animated: true,
//             label:
//               `${count} vehicles | ` +
//               `${(route.avg_travel_minutes * 60).toFixed(1)} sec`,

//             markerEnd: {
//               type: MarkerType.ArrowClosed,
//               color: "#38bdf8",
//               width: 20,
//               height: 20,
//             },

//             style: {
//               stroke: "#38bdf8",
//               strokeWidth,
//             },

//             labelStyle: {
//               fill: "#e2e8f0",
//               fontSize: 11,
//               fontWeight: 600,
//             },

//             labelBgStyle: {
//               fill: "#0f172a",
//               fillOpacity: 0.95,
//             },

//             labelBgPadding: [7, 4],
//             labelBgBorderRadius: 5,
//           };
//         });

//         const totalTransitions = routes.reduce(
//           (total, route) => total + route.vehicle_count,
//           0
//         );

//         setNodes(graphNodes);
//         setEdges(graphEdges);

//         setRouteSummary({
//           totalRoutes: routes.length,
//           totalTransitions,
//         });

//       } catch (err) {
//         console.error("CityFlow graph error:", err);

//         if (active) {
//           setError(
//             err.response?.data?.detail ||
//               "Unable to load CityFlow camera graph."
//           );
//         }
//       } finally {
//         if (active) {
//           setLoading(false);
//         }
//       }
//     }

//     loadNetwork();

//     return () => {
//       active = false;
//     };
//   }, [sequence]);

//   if (loading) {
//     return <p>Loading CityFlow camera graph...</p>;
//   }

//   if (error) {
//     return (
//       <p style={{ color: "#ef4444" }}>
//         {error}
//       </p>
//     );
//   }

//   if (nodes.length === 0) {
//     return (
//       <p style={{ color: "#94a3b8" }}>
//         No camera routes available for {sequence}.
//       </p>
//     );
//   }

//   return (
//     <div>
//       <div
//         style={{
//           display: "flex",
//           gap: "24px",
//           flexWrap: "wrap",
//           marginBottom: "16px",
//           color: "#cbd5e1",
//           fontSize: "13px",
//         }}
//       >
//         <span>
//           Cameras: <strong>{nodes.length}</strong>
//         </span>

//         <span>
//           Connections:{" "}
//           <strong>{routeSummary?.totalRoutes}</strong>
//         </span>

//         <span>
//           Vehicle transitions:{" "}
//           <strong>{routeSummary?.totalTransitions}</strong>
//         </span>
//       </div>

//       <div
//         className="graph-container"
//         style={{
//           width: "100%",
//           height: "650px",
//           background: "#0f172a",
//           borderRadius: "12px",
//           overflow: "hidden",
//         }}
//       >
//         <ReactFlow
//           nodes={nodes}
//           edges={edges}
//           fitView
//           fitViewOptions={{ padding: 0.2 }}
//           nodesDraggable
//           nodesConnectable={false}
//           elementsSelectable
//           minZoom={0.2}
//           maxZoom={2}
//         >
//           <Background
//             color="#334155"
//             gap={20}
//           />

//           <Controls />

//           <MiniMap
//             nodeColor="#2563eb"
//             maskColor="rgba(15, 23, 42, 0.7)"
//           />
//         </ReactFlow>
//       </div>

//       <p
//         style={{
//           color: "#94a3b8",
//           fontSize: "12px",
//           marginTop: "12px",
//         }}
//       >
//         Arrow direction represents the inferred camera transition.
//         Thicker connections indicate more observed vehicle transitions.
//         These are dataset-derived candidates, not confirmed physical
//         road movements.
//       </p>
//     </div>
//   );
// }

// export default CameraGraph;



import { useEffect, useState } from "react";

import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  MarkerType,
} from "reactflow";

import "reactflow/dist/style.css";

import { getCityFlowCameraNetwork } from "../services/api";

function CameraGraph({ sequence = "S04" }) {
  const [nodes, setNodes] = useState([]);
  const [edges, setEdges] = useState([]);
  const [routes, setRoutes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedCamera, setSelectedCamera] = useState(null);

  useEffect(() => {
    let active = true;

    async function loadNetwork() {
      try {
        setLoading(true);
        setError("");
        setSelectedCamera(null);

        const response = await getCityFlowCameraNetwork(sequence);
        const routeData = response.data.routes || [];

        if (!active) return;

        setRoutes(routeData);

        const cameraIds = [
          ...new Set(
            routeData.flatMap((route) => [
              route.from_camera,
              route.to_camera,
            ])
          ),
        ];

        if (cameraIds.length === 0) {
          setNodes([]);
          setEdges([]);
          return;
        }

        const stats = {};

        cameraIds.forEach((camera) => {
          stats[camera] = {
            incoming: 0,
            outgoing: 0,
            incomingRoutes: 0,
            outgoingRoutes: 0,
          };
        });

        routeData.forEach((route) => {
          stats[route.from_camera].outgoing += route.vehicle_count;
          stats[route.from_camera].outgoingRoutes++;

          stats[route.to_camera].incoming += route.vehicle_count;
          stats[route.to_camera].incomingRoutes++;
        });

        // Four-column layout gives the graph a wider structure.
        const columns = 4;
        const horizontalGap = 300;
        const verticalGap = 220;

        const graphNodes = cameraIds.map((camera, index) => ({
          id: camera,
          position: {
            x: 100 + (index % columns) * horizontalGap,
            y: 100 + Math.floor(index / columns) * verticalGap,
          },
          data: {
            label:
              `${camera}\n` +
              `Incoming: ${stats[camera].incoming}\n` +
              `Outgoing: ${stats[camera].outgoing}`,
          },
          style: {
            background: "#172554",
            color: "#ffffff",
            border: "1px solid #38bdf8",
            borderRadius: "12px",
            padding: "18px",
            width: 190,
            whiteSpace: "pre-line",
            fontSize: "13px",
            fontWeight: "600",
            textAlign: "center",
            lineHeight: "1.9",
            boxShadow: "0 4px 18px rgba(56,189,248,0.12)",
          },
        }));

        const maxVehicles = Math.max(
          ...routeData.map((route) => route.vehicle_count),
          1
        );

        const graphEdges = routeData.map((route, index) => ({
          id: `route-${sequence}-${index}`,
          source: route.from_camera,
          target: route.to_camera,
          type: "smoothstep",
          animated: false,
          label:
            `${route.vehicle_count} vehicles | ` +
            `${(route.avg_travel_minutes * 60).toFixed(1)} sec`,
          markerEnd: {
            type: MarkerType.ArrowClosed,
            color: "#38bdf8",
            width: 18,
            height: 18,
          },
          style: {
            stroke: "#38bdf8",
            strokeWidth:
              2 + (route.vehicle_count / maxVehicles) * 4,
          },
          labelStyle: {
            fill: "#e2e8f0",
            fontSize: 11,
            fontWeight: 600,
          },
          labelBgStyle: {
            fill: "#0f172a",
            fillOpacity: 0.95,
          },
          labelBgPadding: [6, 4],
          labelBgBorderRadius: 5,
        }));

        if (active) {
          setNodes(graphNodes);
          setEdges(graphEdges);
        }
      } catch (err) {
        if (active) {
          setError(
            err.response?.data?.detail ||
              "Unable to load CityFlow camera graph."
          );
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    loadNetwork();

    return () => {
      active = false;
    };
  }, [sequence]);

  const handleNodeClick = (_, node) => {
    setSelectedCamera((current) =>
      current === node.id ? null : node.id
    );
  };

  const selectedRoutes = selectedCamera
    ? routes.filter(
        (route) =>
          route.from_camera === selectedCamera ||
          route.to_camera === selectedCamera
      )
    : [];

  const incomingRoutes = selectedRoutes.filter(
    (route) => route.to_camera === selectedCamera
  );

  const outgoingRoutes = selectedRoutes.filter(
    (route) => route.from_camera === selectedCamera
  );

  const connectedCameras = new Set(
    selectedRoutes.flatMap((route) => [
      route.from_camera,
      route.to_camera,
    ])
  );

  const visibleNodes = nodes.map((node) => {
    if (!selectedCamera) return node;

    const isSelected = node.id === selectedCamera;
    const isConnected = connectedCameras.has(node.id);

    return {
      ...node,
      style: {
        ...node.style,
        opacity: isSelected || isConnected ? 1 : 0.2,
        border: isSelected
          ? "2px solid #22c55e"
          : "1px solid #38bdf8",
        background: isSelected ? "#14532d" : "#172554",
      },
    };
  });

  const visibleEdges = edges.map((edge, index) => {
    const route = routes[index];

    const isConnected =
      selectedCamera &&
      (route.from_camera === selectedCamera ||
        route.to_camera === selectedCamera);

    return {
      ...edge,
      animated: Boolean(isConnected),
      style: {
        ...edge.style,
        stroke: selectedCamera
          ? isConnected
            ? "#22c55e"
            : "#475569"
          : "#38bdf8",
        opacity: selectedCamera
          ? isConnected
            ? 1
            : 0.12
          : 1,
      },
      markerEnd: {
        ...edge.markerEnd,
        color:
          selectedCamera && isConnected
            ? "#22c55e"
            : "#38bdf8",
      },
    };
  });

  if (loading) {
    return <p>Loading CityFlow camera graph...</p>;
  }

  if (error) {
    return <p style={{ color: "#ef4444" }}>{error}</p>;
  }

  if (!nodes.length) {
    return (
      <p style={{ color: "#94a3b8" }}>
        No camera routes available for {sequence}.
      </p>
    );
  }

  const totalTransitions = routes.reduce(
    (sum, route) => sum + route.vehicle_count,
    0
  );

  return (
    <div style={{ width: "100%", minWidth: 0 }}>
      {/* Graph statistics */}
      <div
        style={{
          display: "flex",
          gap: "24px",
          flexWrap: "wrap",
          marginBottom: "16px",
          color: "#cbd5e1",
          fontSize: "14px",
        }}
      >
        <span>Cameras: <strong>{nodes.length}</strong></span>
        <span>Connections: <strong>{edges.length}</strong></span>
        <span>Transitions: <strong>{totalTransitions}</strong></span>
      </div>

      {/* Graph and details panel */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(0, 1fr) 300px",
          gap: "16px",
          width: "100%",
          minWidth: 0,
          alignItems: "stretch",
        }}
      >
        {/* React Flow canvas */}
        <div
          style={{
            width: "100%",
            minWidth: 0,
            height: "850px",
            position: "relative",
            background: "#0b1527",
            border: "1px solid #263d59",
            borderRadius: "12px",
            overflow: "hidden",
          }}
        >
          <ReactFlow
            nodes={visibleNodes}
            edges={visibleEdges}
            onNodeClick={handleNodeClick}
            onPaneClick={() => setSelectedCamera(null)}
            fitView
            fitViewOptions={{ padding: 0.12, minZoom: 0.2, maxZoom: 1 }}
            minZoom={0.15}
            maxZoom={1.5}
            nodesDraggable
            nodesConnectable={false}
            elementsSelectable
            proOptions={{ hideAttribution: true }}
          >
            <Background color="#334155" gap={22} />
            <Controls />

            <MiniMap
              nodeColor={(node) =>
                node.id === selectedCamera ? "#22c55e" : "#2563eb"
              }
              maskColor="rgba(15, 23, 42, 0.75)"
            />
          </ReactFlow>
        </div>

        {/* Camera details panel */}
        <aside
          style={{
            width: "100%",
            minWidth: 0,
            boxSizing: "border-box",
            background: "#111f35",
            border: "1px solid #263d59",
            borderRadius: "12px",
            padding: "18px",
            color: "#e2e8f0",
            alignSelf: "start",
            maxHeight: "850px",
            overflowY: "auto",
          }}
        >
          <h3 style={{ marginTop: 0 }}>Camera Details</h3>

          {!selectedCamera ? (
            <p style={{ color: "#94a3b8", fontSize: "13px" }}>
              Select a camera node to inspect its incoming and outgoing
              movement connections.
            </p>
          ) : (
            <>
              <h2 style={{ color: "#38bdf8", fontSize: "21px" }}>
                {selectedCamera}
              </h2>

              <div
                style={{
                  background: "#172b45",
                  borderRadius: "8px",
                  padding: "12px",
                  marginBottom: "16px",
                }}
              >
                <p style={{ fontSize: "13px" }}>
                  Incoming routes: <strong>{incomingRoutes.length}</strong>
                </p>

                <p style={{ fontSize: "13px" }}>
                  Outgoing routes: <strong>{outgoingRoutes.length}</strong>
                </p>
              </div>

              <h4>Incoming Routes</h4>

              {incomingRoutes.length > 0 ? (
                incomingRoutes.map((route, index) => (
                  <div
                    key={`in-${index}`}
                    style={{
                      padding: "10px",
                      marginBottom: "8px",
                      background: "#172b45",
                      borderRadius: "8px",
                      fontSize: "12px",
                    }}
                  >
                    <strong>{route.from_camera}</strong>
                    <div style={{ color: "#38bdf8", margin: "4px 0" }}>
                      ↓ {route.vehicle_count} vehicles
                    </div>
                    <span style={{ color: "#94a3b8" }}>
                      Avg: {(route.avg_travel_minutes * 60).toFixed(1)} sec
                    </span>
                  </div>
                ))
              ) : (
                <p style={{ fontSize: "12px", color: "#94a3b8" }}>
                  No incoming routes.
                </p>
              )}

              <h4>Outgoing Routes</h4>

              {outgoingRoutes.length > 0 ? (
                outgoingRoutes.map((route, index) => (
                  <div
                    key={`out-${index}`}
                    style={{
                      padding: "10px",
                      marginBottom: "8px",
                      background: "#172b45",
                      borderRadius: "8px",
                      fontSize: "12px",
                    }}
                  >
                    <strong>{route.to_camera}</strong>
                    <div style={{ color: "#22c55e", margin: "4px 0" }}>
                      → {route.vehicle_count} vehicles
                    </div>
                    <span style={{ color: "#94a3b8" }}>
                      Avg: {(route.avg_travel_minutes * 60).toFixed(1)} sec
                    </span>
                  </div>
                ))
              ) : (
                <p style={{ fontSize: "12px", color: "#94a3b8" }}>
                  No outgoing routes.
                </p>
              )}

              <button
                onClick={() => setSelectedCamera(null)}
                style={{
                  width: "100%",
                  marginTop: "14px",
                  padding: "11px",
                  border: 0,
                  borderRadius: "8px",
                  background: "#2563eb",
                  color: "#ffffff",
                  cursor: "pointer",
                  fontWeight: 600,
                }}
              >
                Clear Selection
              </button>
            </>
          )}
        </aside>
      </div>

      <p
        style={{
          color: "#94a3b8",
          fontSize: "12px",
          marginTop: "14px",
          lineHeight: 1.6,
        }}
      >
        Arrow direction represents an inferred camera transition.
        Thicker connections represent more observed vehicle transitions.
        These are dataset-derived candidates, not confirmed physical
        road movements.
      </p>
    </div>
  );
}

export default CameraGraph;
