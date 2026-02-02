import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Sidebar from "./components/Sidebar";
import Home from "./pages/Home";
import Documents from "./pages/Documents";
import EntityManagement from "./pages/EntityManagement.jsx";
import EntityManagement2 from "./pages/EntityManagement2.jsx";
import EntityManagement3 from "./pages/EntityManagement3.jsx";
import Relations from "./pages/Relations";
import Relations2 from "./pages/Relations2";
import Relations3 from "./pages/Relations3";
import Prompts from "./pages/Prompts";
import KGEditor from "./pages/KGEditor";
import KGViewer from "./pages/KGViewer";
import Agent from "./pages/Agent";



function App() {
  return (
      <Router>
        <div className="app-shell">
          <Sidebar />
          <div className="main-area">
            <header className="topbar">
              <div>
                <div className="eyebrow">数据标注工作台</div>
                <div className="title">智能数据系统</div>
              </div>
              <div className="user-chip">
                <div className="avatar">A</div>
                <div>
                  <div className="font-semibold text-sm">admin</div>
                  <div className="text-xs muted">在线</div>
                </div>
              </div>
            </header>
            <div className="page-body">
              <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/documents" element={<Documents />} />
                <Route path="/entities" element={<EntityManagement />} />
                <Route path="/entities/labels" element={<EntityManagement2 />} />
                <Route path="/entities/results" element={<EntityManagement3 />} />
                <Route path="/relations" element={<Relations />} />
                <Route path="/relations/labels" element={<Relations2 />} />
                <Route path="/relations/results" element={<Relations3 />} />
                <Route path="/prompts" element={<Prompts />} />
                 <Route path="/agent" element={<Agent />} />

                {/* Knowledge Graph */}
                <Route path="/kg/editor" element={<KGEditor />} />
                <Route path="/kg/view" element={<KGViewer />} />

              </Routes>
            </div>
          </div>
        </div>
      </Router>
  );
}

export default App;
