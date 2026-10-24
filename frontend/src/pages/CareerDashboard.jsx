import { useState, useRef } from "react";
import {
    RadarChart, Radar, PolarGrid, PolarAngleAxis, ResponsiveContainer,
    BarChart, Bar, XAxis, YAxis, Tooltip, Cell
} from "recharts";

import { logout } from "../services/auth";
import { auth, db } from "../firebase/config";
import { useNavigate } from "react-router-dom";

const rawApiUrl = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000/career-analyzer";
const API_URL = rawApiUrl.endsWith("/career-analyzer") ? rawApiUrl : `${rawApiUrl.replace(/\/+$/, "")}/career-analyzer`;

const MOCK = {
    target_role: "AI Engineer",
    best_fit_role: {
        role: "Natural Language Processing Specialist",
        score: 26.58,
        matched_skills: ["python", "deep learning"],
        missing_skills: ["nlp", "tensorflow", "keras", "spacy", "nltk"],
        classified_skills: {
            core: ["python", "nlp", "deep learning"],
            important: ["tensorflow", "keras", "spacy", "nltk"],
            optional: []
        }
    },
    all_roles: [
        { role: "NLP Specialist", score: 26.58, matched_skills: ["python", "deep learning"], missing_skills: ["nlp", "tensorflow", "keras"], classified_skills: { core: ["python", "nlp"], important: ["tensorflow", "keras"], optional: [] } },
        { role: "Computer Vision Engineer", score: 23.12, matched_skills: ["python", "deep learning", "numpy"], missing_skills: ["opencv", "pytorch"], classified_skills: { core: ["python"], important: ["opencv", "pytorch"], optional: [] } },
        { role: "ML Engineer", score: 22.74, matched_skills: ["python", "deep learning", "numpy", "pandas"], missing_skills: ["sql", "tensorflow"], classified_skills: { core: ["python", "sql"], important: ["tensorflow"], optional: ["r"] } },
        { role: "Deep Learning Engineer", score: 11.06, matched_skills: ["python", "numpy"], missing_skills: ["cuda", "pytorch"], classified_skills: { core: ["python", "cuda"], important: ["pytorch"], optional: [] } },
        { role: "Robotics Engineer", score: 12.97, matched_skills: ["python"], missing_skills: ["c++", "ros"], classified_skills: { core: ["c++", "ros"], important: ["python"], optional: [] } },
    ],
    learning_priority: ["nlp", "tensorflow", "keras", "spacy", "nltk"],
    learning_path: [
        { step: 1, description: "Learn fundamentals of NLP", skills: ["nlp", "nltk"], project: "Text Preprocessing and Tokenization" },
        { step: 2, description: "Master deep learning for NLP with TensorFlow and Keras", skills: ["tensorflow", "keras"], project: "Sentiment Analysis using LSTM" },
        { step: 3, description: "Explore Spacy for advanced NLP tasks", skills: ["spacy"], project: "Named Entity Recognition" },
        { step: 4, description: "Work on project integrating multiple skills", skills: ["nlp", "tensorflow", "keras", "spacy", "nltk"], project: "Chatbot Development using NLP and Deep Learning" },
        { step: 5, description: "Practice with real-world datasets", skills: ["nlp", "tensorflow"], project: "Participate in Kaggle NLP competitions" },
        { step: 6, description: "Build a personal project showcasing expertise", skills: ["nlp", "tensorflow", "keras"], project: "Develop a personal NLP-based product" }
    ],
    better_fit_roles: [
        { role: "Machine Learning Engineer", description: "Design ML models using Python and deep learning.", required_skills: ["python", "deep learning"], average_salary: "$141,000" },
        { role: "Data Scientist", description: "Interpret complex data using Python and deep learning.", required_skills: ["python", "deep learning"], average_salary: "$118,000" },
        { role: "AI Researcher", description: "Research and develop AI models using Python.", required_skills: ["python", "deep learning"], average_salary: "$150,000" },
    ],
    estimated_salary: "₹15L – ₹35L",
    skill_gap: { core_gap: 10, important_gap: 32, optional_gap: 0 },
    career_insights: "You need to develop core skills before targeting this role."
};

const sa = (v) => (Array.isArray(v) ? v : []);
const sv = (v, fb = "") => (v !== undefined && v !== null ? String(v) : fb);

const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@300;400;500&display=swap');
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
:root{
  --bg:#060810;--s1:#0c0f1c;--s2:#111528;--s3:#171d35;
  --border:#1e2540;--border2:#2a3360;
  --gold:#f5c842;--gold2:#ffd96e;--teal:#2affd4;--blue:#4a8fff;
  --red:#ff5252;--green:#3dffa0;--orange:#ff9f43;
  --text:#eef0ff;--muted:#6070a8;--muted2:#8899cc;
  --r:14px;--font:'Outfit',sans-serif;--mono:'JetBrains Mono',monospace;
}
html{scroll-behavior:smooth}
body{background:var(--bg);color:var(--text);font-family:var(--font);min-height:100vh;overflow-x:hidden}
body::before{
  content:'';position:fixed;inset:0;
  background-image:linear-gradient(rgba(74,143,255,.025) 1px,transparent 1px),
    linear-gradient(90deg,rgba(74,143,255,.025) 1px,transparent 1px);
  background-size:44px 44px;pointer-events:none;z-index:0;
}
.app{position:relative;z-index:1;padding-bottom:100px}

/* ── NAVBAR ── */
.navbar{
  position:sticky;top:0;z-index:100;
  display:flex;align-items:center;justify-content:space-between;
  padding:0 40px;height:64px;
  background:rgba(6,8,16,.85);backdrop-filter:blur(20px);-webkit-backdrop-filter:blur(20px);
  border-bottom:1px solid rgba(30,37,64,.7);
}
.navbar-left{display:flex;align-items:center;gap:12px}
.navbar-logo-icon{
  width:32px;height:32px;border-radius:8px;
  background:linear-gradient(135deg,#3a6fff,#5a30ff);
  display:flex;align-items:center;justify-content:center;
  font-size:.8rem;font-weight:800;color:#fff;
  box-shadow:0 4px 14px rgba(58,111,255,.35);flex-shrink:0;
}
.navbar-logo-text{
  font-size:1rem;font-weight:800;letter-spacing:-.5px;
  background:linear-gradient(135deg,#eef0ff,#6080ff);
  -webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;
}
.navbar-center{
  position:absolute;left:50%;transform:translateX(-50%);
  display:flex;align-items:center;gap:6px;
}
.navbar-pill{
  font-family:var(--mono);font-size:.6rem;letter-spacing:2px;text-transform:uppercase;
  color:var(--teal);background:rgba(42,255,212,.06);
  border:1px solid rgba(42,255,212,.18);border-radius:99px;padding:5px 16px;
}
.navbar-right{display:flex;align-items:center;gap:10px}
.navbar-user{
  display:flex;align-items:center;gap:8px;
  font-family:var(--mono);font-size:.65rem;color:var(--muted);letter-spacing:.5px;
}
.navbar-avatar{
  width:28px;height:28px;border-radius:50%;
  background:linear-gradient(135deg,rgba(74,143,255,.2),rgba(42,255,212,.15));
  border:1px solid rgba(74,143,255,.3);
  display:flex;align-items:center;justify-content:center;
  font-size:.65rem;font-weight:700;color:var(--blue);
}
.btn-signout{
  display:flex;align-items:center;gap:7px;
  font-family:var(--font);font-size:.82rem;font-weight:600;letter-spacing:.2px;
  padding:8px 18px;border-radius:8px;cursor:pointer;
  background:rgba(255,82,82,.07);border:1px solid rgba(255,82,82,.22);color:var(--red);
  transition:background .18s,border-color .18s,transform .15s;
}
.btn-signout:hover{background:rgba(255,82,82,.14);border-color:rgba(255,82,82,.4);transform:translateY(-1px)}
.btn-signout:active{transform:translateY(0)}
.btn-signout svg{flex-shrink:0;opacity:.8}

/* ── HERO ── */
.hero{
  min-height:calc(100vh - 64px);display:flex;flex-direction:column;align-items:center;
  justify-content:center;padding:40px 20px;
  background:radial-gradient(ellipse 80% 55% at 50% 0%,rgba(74,143,255,.09) 0%,transparent 70%);
}
.hero-badge{
  font-family:var(--mono);font-size:.62rem;letter-spacing:3px;text-transform:uppercase;
  color:var(--teal);border:1px solid rgba(42,255,212,.2);border-radius:99px;
  padding:5px 18px;margin-bottom:24px;background:rgba(42,255,212,.05);
}
.hero h1{
  font-size:clamp(2.6rem,7vw,5.2rem);font-weight:800;letter-spacing:-3px;line-height:.95;
  text-align:center;margin-bottom:14px;
  background:linear-gradient(135deg,#eef0ff 30%,#6080ff);
  -webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;
}
.hero h1 em{
  font-style:normal;
  background:linear-gradient(135deg,var(--gold),var(--gold2));
  -webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;
}
.hero-sub{color:var(--muted2);font-size:1rem;text-align:center;margin-bottom:44px;max-width:460px;line-height:1.6}
.form-card{
  width:100%;max-width:700px;background:var(--s1);border:1px solid var(--border);
  border-radius:20px;padding:32px;
  box-shadow:0 40px 120px rgba(0,0,0,.6),inset 0 1px 0 rgba(255,255,255,.04);
}
.field-label{font-family:var(--mono);font-size:.62rem;letter-spacing:2px;text-transform:uppercase;color:var(--muted);margin-bottom:8px}
textarea,input[type=text]{
  width:100%;background:var(--bg);border:1px solid var(--border);border-radius:10px;
  color:var(--text);font-family:var(--font);font-size:.95rem;line-height:1.7;
  padding:14px 16px;outline:none;transition:border-color .2s,box-shadow .2s;
}
textarea{min-height:150px;resize:vertical}
textarea:focus,input:focus{border-color:var(--blue);box-shadow:0 0 0 3px rgba(74,143,255,.1)}
.fields-row{display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-top:16px}
@media(max-width:560px){.fields-row{grid-template-columns:1fr}}
.btn-primary{
  width:100%;margin-top:20px;padding:16px;
  background:linear-gradient(135deg,#3a6fff,#5a30ff);
  color:#fff;border:none;border-radius:10px;
  font-family:var(--font);font-weight:700;font-size:1rem;letter-spacing:.5px;
  cursor:pointer;box-shadow:0 8px 32px rgba(58,111,255,.35);
  transition:transform .15s,box-shadow .15s,opacity .15s;position:relative;overflow:hidden;
  display:flex;align-items:center;justify-content:center;gap:8px;
}
.btn-primary::before{content:'';position:absolute;inset:0;background:linear-gradient(135deg,rgba(255,255,255,.08),transparent)}
.btn-primary:hover:not(:disabled){transform:translateY(-2px);box-shadow:0 12px 40px rgba(58,111,255,.5)}
.btn-primary:disabled{opacity:.4;cursor:not-allowed;transform:none}
@keyframes spin{to{transform:rotate(360deg)}}
.spinner{width:16px;height:16px;border:2px solid rgba(255,255,255,.3);border-top-color:#fff;border-radius:50%;animation:spin .7s linear infinite;flex-shrink:0}
.err-box{background:rgba(255,82,82,.07);border:1px solid rgba(255,82,82,.25);border-radius:10px;padding:12px 16px;color:var(--red);font-family:var(--mono);font-size:.78rem;margin-top:14px}
.warn-box{background:rgba(245,200,66,.07);border:1px solid rgba(245,200,66,.25);border-radius:10px;padding:12px 16px;color:var(--gold);font-family:var(--mono);font-size:.76rem;margin-top:14px}

/* ── DASHBOARD ── */
.dash{max-width:1200px;margin:0 auto;padding:0 20px}
.dash-header{padding:56px 0 36px;border-bottom:1px solid var(--border);margin-bottom:36px}
.dash-header-top{display:flex;align-items:flex-start;justify-content:space-between;flex-wrap:wrap;gap:20px}
.target-label{font-family:var(--mono);font-size:.62rem;letter-spacing:2px;text-transform:uppercase;color:var(--muted);margin-bottom:6px}
.target-role{font-size:2.2rem;font-weight:800;letter-spacing:-1.5px}
.salary-chip{background:linear-gradient(135deg,rgba(245,200,66,.1),rgba(245,200,66,.04));border:1px solid rgba(245,200,66,.28);border-radius:12px;padding:14px 24px;text-align:center}
.salary-label{font-family:var(--mono);font-size:.58rem;letter-spacing:2px;text-transform:uppercase;color:var(--muted);margin-bottom:4px}
.salary-val{font-size:1.5rem;font-weight:800;color:var(--gold)}
.insight-bar{margin-top:22px;background:linear-gradient(90deg,rgba(74,143,255,.07),rgba(42,255,212,.03));border:1px solid rgba(74,143,255,.18);border-radius:12px;padding:14px 20px;display:flex;align-items:center;gap:14px}
.insight-txt{color:var(--muted2);font-size:.92rem;line-height:1.5}
.insight-txt strong{color:var(--text)}

.g2{display:grid;grid-template-columns:1fr 1fr;gap:24px}
.g2-asym{display:grid;grid-template-columns:1.1fr .9fr;gap:24px}
@media(max-width:900px){.g2,.g2-asym{grid-template-columns:1fr}}

.section{margin-bottom:36px}
.sec-head{display:flex;align-items:center;gap:10px;margin-bottom:18px}
.sec-num{font-family:var(--mono);font-size:.62rem;color:var(--blue);background:rgba(74,143,255,.1);border:1px solid rgba(74,143,255,.2);border-radius:6px;padding:3px 8px}
.sec-title{font-size:1.1rem;font-weight:700;letter-spacing:-.5px}

.card{background:var(--s1);border:1px solid var(--border);border-radius:var(--r);padding:24px;transition:border-color .2s}
.card:hover{border-color:var(--border2)}

.stat-row{display:flex;gap:12px;flex-wrap:wrap;margin-bottom:32px}
.stat-chip{background:var(--s2);border:1px solid var(--border);border-radius:12px;padding:16px 20px;flex:1;min-width:110px}
.sc-val{font-size:1.7rem;font-weight:800;letter-spacing:-1px;line-height:1}
.sc-lbl{font-family:var(--mono);font-size:.58rem;letter-spacing:1.5px;text-transform:uppercase;color:var(--muted);margin-top:4px}

.gap-item{margin-bottom:14px}
.gap-item:last-child{margin-bottom:0}
.gap-label-row{display:flex;justify-content:space-between;margin-bottom:5px}
.gap-name{font-family:var(--mono);font-size:.72rem;color:var(--muted2)}
.gap-val{font-family:var(--mono);font-size:.72rem;color:var(--muted)}
.gap-track{height:8px;background:rgba(255,255,255,.05);border-radius:99px;overflow:hidden}
.gap-fill{height:100%;border-radius:99px;transition:width 1.2s cubic-bezier(.23,1,.32,1)}

.bestfit{background:linear-gradient(135deg,#0d1a10,#091220);border:1px solid rgba(61,255,160,.15)}
.bf-badge{font-family:var(--mono);font-size:.58rem;letter-spacing:2px;text-transform:uppercase;color:var(--green);margin-bottom:8px}
.bf-role{font-size:1.65rem;font-weight:800;letter-spacing:-1px;color:var(--green);line-height:1.1;margin-bottom:16px}
.big-score{font-size:3.5rem;font-weight:800;letter-spacing:-3px;background:linear-gradient(135deg,var(--green),var(--teal));-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;line-height:1}
.big-score-sub{font-family:var(--mono);font-size:.6rem;color:var(--muted);letter-spacing:1px;text-transform:uppercase;margin-bottom:4px}
.prog-track{height:6px;background:rgba(255,255,255,.06);border-radius:99px;overflow:hidden;margin:12px 0 16px}
.prog-fill{height:100%;border-radius:99px;transition:width 1.3s cubic-bezier(.23,1,.32,1)}

.tags{display:flex;flex-wrap:wrap;gap:6px}
.tag{font-family:var(--mono);font-size:.68rem;padding:4px 11px;border-radius:99px}
.tag.ok{background:rgba(61,255,160,.08);border:1px solid rgba(61,255,160,.25);color:var(--green)}
.tag.miss{background:rgba(255,82,82,.08);border:1px solid rgba(255,82,82,.25);color:var(--red)}
.tag.core{background:rgba(74,143,255,.1);border:1px solid rgba(74,143,255,.3);color:var(--blue)}
.tag.imp{background:rgba(42,255,212,.07);border:1px solid rgba(42,255,212,.2);color:var(--teal)}
.tag.opt{background:rgba(255,159,67,.07);border:1px solid rgba(255,159,67,.2);color:var(--orange)}
.tag.pri{background:rgba(245,200,66,.08);border:1px solid rgba(245,200,66,.25);color:var(--gold)}
.tag.blue{background:rgba(74,143,255,.08);border:1px solid rgba(74,143,255,.25);color:var(--blue)}

.role-row{background:var(--s2);border:1px solid var(--border);border-radius:10px;padding:14px 18px;cursor:pointer;transition:border-color .2s,background .2s;margin-bottom:8px}
.role-row:hover{background:var(--s3);border-color:var(--border2)}
.role-row.open{border-color:rgba(74,143,255,.35)}
.rr-top{display:flex;align-items:center;justify-content:space-between;gap:12px}
.rr-name{font-weight:700;font-size:.95rem}
.rr-right{display:flex;align-items:center;gap:8px}
.rr-score{font-family:var(--mono);font-size:.7rem;color:var(--teal);background:rgba(42,255,212,.06);border:1px solid rgba(42,255,212,.15);border-radius:99px;padding:3px 10px;white-space:nowrap}
.mini-bar{height:3px;background:var(--border);border-radius:99px;margin-top:10px;overflow:hidden}
.mini-fill{height:100%;border-radius:99px;background:linear-gradient(90deg,var(--blue),var(--teal))}
.rr-expand{margin-top:14px;padding-top:14px;border-top:1px solid var(--border)}
.exp-lbl{font-family:var(--mono);font-size:.6rem;text-transform:uppercase;letter-spacing:1.5px;color:var(--muted);margin-bottom:6px}
.chev{font-size:.75rem;color:var(--muted);transition:transform .2s;display:inline-block}
.chev.up{transform:rotate(180deg)}

.chart-wrap{width:100%;height:280px}
.chart-lbl{font-family:var(--mono);font-size:.62rem;letter-spacing:2px;text-transform:uppercase;color:var(--muted);margin-bottom:14px}

.path-step{display:grid;grid-template-columns:48px 1fr;gap:0 20px;padding-bottom:28px}
.path-step:last-child{padding-bottom:0}
.ps-left{display:flex;flex-direction:column;align-items:center}
.ps-num{width:48px;height:48px;border-radius:50%;background:linear-gradient(135deg,var(--blue),#5a30ff);display:flex;align-items:center;justify-content:center;font-weight:800;font-size:.95rem;color:#fff;flex-shrink:0;box-shadow:0 4px 20px rgba(74,143,255,.3);z-index:1}
.ps-line{flex:1;width:2px;background:linear-gradient(var(--border2),var(--border));margin-top:8px}
.path-step:last-child .ps-line{display:none}
.ps-content{padding-top:10px}
.ps-header{display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin-bottom:10px}
.ps-desc{font-weight:700;font-size:.95rem}
.project-box{background:var(--s2);border:1px solid var(--border);border-radius:8px;padding:10px 14px;margin-top:10px;display:flex;align-items:flex-start;gap:10px}
.proj-icon{color:var(--blue);flex-shrink:0;margin-top:1px}
.proj-txt{font-size:.85rem;color:var(--muted2);line-height:1.5}

.pri-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(130px,1fr));gap:10px}
.pri-item{background:var(--s2);border:1px solid rgba(245,200,66,.14);border-radius:10px;padding:14px;display:flex;flex-direction:column;align-items:center;text-align:center;gap:6px;transition:border-color .2s,transform .2s;cursor:default}
.pri-item:hover{border-color:rgba(245,200,66,.4);transform:translateY(-2px)}
.pri-rank{font-family:var(--mono);font-size:.58rem;color:var(--gold);letter-spacing:1px}
.pri-skill{font-weight:700;font-size:.88rem;text-transform:capitalize}

.bfr-card{background:var(--s2);border:1px solid var(--border);border-radius:12px;padding:20px;transition:border-color .2s,transform .2s}
.bfr-card:hover{border-color:var(--border2);transform:translateY(-3px)}
.bfr-role{font-weight:700;font-size:1rem;margin-bottom:4px}
.bfr-salary{font-family:var(--mono);font-size:.7rem;color:var(--gold);margin-bottom:8px}
.bfr-desc{font-size:.83rem;color:var(--muted2);line-height:1.5;margin-bottom:12px}

.cls-block{margin-top:12px;padding-top:12px;border-top:1px solid rgba(255,255,255,.05)}
.cls-lbl{font-family:var(--mono);font-size:.6rem;text-transform:uppercase;letter-spacing:1.5px;color:var(--muted);margin-bottom:5px;margin-top:8px}

@keyframes fadeUp{from{opacity:0;transform:translateY(22px)}to{opacity:1;transform:translateY(0)}}
.fu{animation:fadeUp .5s ease both}
.fu.d1{animation-delay:.08s}.fu.d2{animation-delay:.16s}.fu.d3{animation-delay:.24s}
.fu.d4{animation-delay:.32s}.fu.d5{animation-delay:.4s}.fu.d6{animation-delay:.48s}

@media(max-width:640px){
  .navbar{padding:0 20px}
  .navbar-center{display:none}
  .navbar-user{display:none}
}
`;

const CTip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null;
    return (
        <div style={{ background: "#111528", border: "1px solid #2a3360", borderRadius: 8, padding: "10px 14px", fontFamily: "JetBrains Mono,monospace", fontSize: "0.75rem", color: "#eef0ff" }}>
            <div style={{ color: "#6070a8", marginBottom: 4 }}>{label}</div>
            <div style={{ color: "#2affd4", fontWeight: 700 }}>{Number(payload[0].value).toFixed(2)} pts</div>
        </div>
    );
};

function GapBar({ label, value, max = 50, color }) {
    const pct = Math.min(((Number(value) || 0) / max) * 100, 100);
    return (
        <div className="gap-item">
            <div className="gap-label-row">
                <span className="gap-name">{label}</span>
                <span className="gap-val">{value ?? 0}% gap</span>
            </div>
            <div className="gap-track">
                <div className="gap-fill" style={{ width: `${pct}%`, background: color }} />
            </div>
        </div>
    );
}

function RoleRow({ role, maxScore }) {
    const [open, setOpen] = useState(false);
    const pct = Math.min(((Number(role.score) || 0) / maxScore) * 100, 100);
    const cs = role.classified_skills || {};
    return (
        <div className={`role-row ${open ? "open" : ""}`} onClick={() => setOpen(!open)}>
            <div className="rr-top">
                <span className="rr-name">{role.role}</span>
                <div className="rr-right">
                    <span className="rr-score">{Number(role.score).toFixed(2)}</span>
                    <span style={{ fontFamily: "var(--mono)", fontSize: ".68rem", color: "var(--muted)" }}>{pct.toFixed(0)}%</span>
                    <span className={`chev ${open ? "up" : ""}`}>▾</span>
                </div>
            </div>
            <div className="mini-bar"><div className="mini-fill" style={{ width: `${pct}%` }} /></div>
            {open && (
                <div className="rr-expand">
                    {sa(role.matched_skills).length > 0 && (
                        <div style={{ marginBottom: 12 }}>
                            <div className="exp-lbl">✓ You have</div>
                            <div className="tags">{sa(role.matched_skills).map(s => <span key={s} className="tag ok">{s}</span>)}</div>
                        </div>
                    )}
                    {sa(role.missing_skills).length > 0 && (
                        <div style={{ marginBottom: 12 }}>
                            <div className="exp-lbl">✗ Missing</div>
                            <div className="tags">{sa(role.missing_skills).map(s => <span key={s} className="tag miss">{s}</span>)}</div>
                        </div>
                    )}
                    {(sa(cs.core).length > 0 || sa(cs.important).length > 0 || sa(cs.optional).length > 0) && (
                        <div className="cls-block">
                            <div className="exp-lbl" style={{ marginBottom: 8 }}>Skill Classification</div>
                            {sa(cs.core).length > 0 && <><div className="cls-lbl">Core</div><div className="tags">{sa(cs.core).map(s => <span key={s} className="tag core">{s}</span>)}</div></>}
                            {sa(cs.important).length > 0 && <><div className="cls-lbl">Important</div><div className="tags">{sa(cs.important).map(s => <span key={s} className="tag imp">{s}</span>)}</div></>}
                            {sa(cs.optional).length > 0 && <><div className="cls-lbl">Optional</div><div className="tags">{sa(cs.optional).map(s => <span key={s} className="tag opt">{s}</span>)}</div></>}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

export default function CareerDashboard() {
    const [resumeText, setResumeText] = useState(
        `AI/ML Engineer with experience building deep learning models.
Proficient in Python, NumPy, Pandas for data analysis and processing.
Experience with neural network architectures and deep learning frameworks.
Familiar with NLP concepts and computer vision techniques.
Built ML projects including classification and regression models.`
    );
    const [targetRole, setTargetRole] = useState("AI Engineer");
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [usingMock, setUsingMock] = useState(false);
    const dashRef = useRef(null);

    const analyze = async () => {
        setLoading(true); setError(null); setData(null); setUsingMock(false);
        try {
            const res = await fetch(API_URL, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ resume_text: resumeText, target_role: targetRole }),
            });
            if (!res.ok) {
                const e = await res.json().catch(() => ({}));
                throw new Error(e?.detail || `HTTP ${res.status}`);
            }
            setData(await res.json());
        } catch (e) {
            setData(MOCK); setUsingMock(true); setError(e.message);
        } finally {
            setLoading(false);
            setTimeout(() => dashRef.current?.scrollIntoView({ behavior: "smooth" }), 150);
        }
    };

    const maxScore = data ? Math.max(...sa(data.all_roles).map(r => Number(r.score) || 0), 1) : 1;
    const bf = data?.best_fit_role || {};
    const bfPct = ((Number(bf.score) || 0) / maxScore * 100).toFixed(1);
    const sg = data?.skill_gap || {};

    const radarData = sa(data?.all_roles).map(r => ({
        role: r.role.replace(/ Engineer| Specialist/g, "").replace(" Learning", " Lrn"),
        score: parseFloat(Number(r.score).toFixed(2))
    }));
    const barData = sa(data?.all_roles).slice().sort((a, b) => b.score - a.score);
    const BAR_COLORS = ["#3dffa0", "#4a8fff", "#2affd4", "#ff9f43", "#ff5252", "#c084fc", "#f5c842"];
    const navigate = useNavigate();
    const handleSignout = async () => {
        try {
            await logout();
            alert("Logout Successfull");
            navigate("/");
        } catch (err) {
            alert(err.message);
        }
    }

    return (
        <>
            <style>{CSS}</style>
            <div className="app">

                {/* ── NAVBAR ── */}
                <nav className="navbar">
                    <div className="navbar-left">
                        <div className="navbar-logo-icon">CC</div>
                        <span className="navbar-logo-text">CareerCompass</span>
                    </div>
                    <div className="navbar-center">
                        <span className="navbar-pill">AI Career Intelligence</span>
                    </div>
                    <div className="navbar-right">
                        <div className="navbar-user">
                            <div className="navbar-avatar">U</div>
                            <span>Dashboard</span>
                        </div>
                        <button className="btn-signout" onClick={handleSignout}>
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" />
                            </svg>
                            Sign Out
                        </button>
                    </div>
                </nav>

                {/* ── HERO ── */}
                <section className="hero">
                    <div className="hero-badge">AI-Powered Career Intelligence</div>
                    <h1>Your Career<br /><em>Gap Analysis</em></h1>
                    <p className="hero-sub">Paste your resume, choose a target role — get a full skill gap report, learning roadmap &amp; salary insight.</p>
                    <div className="form-card">
                        <div className="field-label">Resume Text</div>
                        <textarea value={resumeText} onChange={e => setResumeText(e.target.value)} placeholder="Paste your resume here…" />
                        <div className="fields-row">
                            <div>
                                <div className="field-label" style={{ marginTop: 16 }}>Target Role</div>
                                <input type="text" value={targetRole} onChange={e => setTargetRole(e.target.value)} placeholder="e.g. AI Engineer" />
                            </div>
                        </div>
                        <button className="btn-primary" onClick={analyze} disabled={loading || !resumeText.trim() || !targetRole.trim()}>
                            {loading && <span className="spinner" />}
                            {loading ? "Analyzing…" : "Run Career Analysis →"}
                        </button>
                        {usingMock && <div className="warn-box">⚠ API unreachable ({error}) — showing demo data.</div>}
                        {error && !usingMock && <div className="err-box">⚠ {error}</div>}
                    </div>
                </section>

                {/* ── DASHBOARD ── */}
                {data && (
                    <section className="dash" ref={dashRef}>

                        {/* Header */}
                        <div className="dash-header fu">
                            <div className="dash-header-top">
                                <div>
                                    <div className="target-label">Analysis for</div>
                                    <div className="target-role">{sv(data.target_role, "—")}</div>
                                </div>
                                <div className="salary-chip">
                                    <div className="salary-label">Estimated Salary</div>
                                    <div className="salary-val">{sv(data.estimated_salary, "—")}</div>
                                </div>
                            </div>
                            <div className="insight-bar">
                                <span style={{ fontSize: "1.3rem" }}>💡</span>
                                <div className="insight-txt">
                                    <strong>{sv(data.career_insights)}</strong>
                                    {bf.role && <> Best match: <strong>{bf.role}</strong> — score <strong>{Number(bf.score).toFixed(2)}</strong>.</>}
                                </div>
                            </div>
                        </div>

                        {/* STAT CHIPS */}
                        <div className="stat-row fu d1">
                            {[
                                { val: Number(bf.score || 0).toFixed(1), lbl: "Best Score", col: "var(--green)" },
                                { val: sa(data.all_roles).length, lbl: "Roles Checked", col: "var(--blue)" },
                                { val: sa(bf.missing_skills).length, lbl: "Skills Gap", col: "var(--red)" },
                                { val: sa(data.learning_path).length, lbl: "Learning Steps", col: "var(--gold)" },
                                { val: sa(data.better_fit_roles).length, lbl: "Alt. Roles", col: "var(--teal)" },
                            ].map(({ val, lbl, col }) => (
                                <div key={lbl} className="stat-chip">
                                    <div className="sc-val" style={{ color: col }}>{val}</div>
                                    <div className="sc-lbl">{lbl}</div>
                                </div>
                            ))}
                        </div>

                        {/* BEST FIT + GAP + RADAR */}
                        <div className="section g2 fu d2">
                            {/* Best Fit Card */}
                            <div className="card bestfit">
                                <div className="bf-badge">🏆 Best Fit Role</div>
                                <div className="bf-role">{sv(bf.role, "—")}</div>
                                <div className="big-score-sub">Match Score</div>
                                <div className="big-score">{Number(bf.score || 0).toFixed(2)}</div>
                                <div className="prog-track">
                                    <div className="prog-fill" style={{ width: `${bfPct}%`, background: "linear-gradient(90deg,#3dffa0,#2affd4)" }} />
                                </div>

                                {sa(bf.matched_skills).length > 0 && (
                                    <div style={{ marginBottom: 12 }}>
                                        <div className="exp-lbl" style={{ marginBottom: 6 }}>✓ You Already Have</div>
                                        <div className="tags">{sa(bf.matched_skills).map(s => <span key={s} className="tag ok">{s}</span>)}</div>
                                    </div>
                                )}
                                {sa(bf.missing_skills).length > 0 && (
                                    <div style={{ marginBottom: 12 }}>
                                        <div className="exp-lbl" style={{ marginBottom: 6 }}>✗ You're Missing</div>
                                        <div className="tags">{sa(bf.missing_skills).map(s => <span key={s} className="tag miss">{s}</span>)}</div>
                                    </div>
                                )}

                                {bf.classified_skills && (
                                    <div className="cls-block">
                                        <div className="exp-lbl" style={{ marginBottom: 8 }}>Skill Breakdown</div>
                                        {sa(bf.classified_skills.core).length > 0 && <><div className="cls-lbl">Core</div><div className="tags">{sa(bf.classified_skills.core).map(s => <span key={s} className="tag core">{s}</span>)}</div></>}
                                        {sa(bf.classified_skills.important).length > 0 && <><div className="cls-lbl">Important</div><div className="tags">{sa(bf.classified_skills.important).map(s => <span key={s} className="tag imp">{s}</span>)}</div></>}
                                        {sa(bf.classified_skills.optional).length > 0 && <><div className="cls-lbl">Optional</div><div className="tags">{sa(bf.classified_skills.optional).map(s => <span key={s} className="tag opt">{s}</span>)}</div></>}
                                    </div>
                                )}
                            </div>

                            {/* Gap + Radar stacked */}
                            <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                                <div className="card">
                                    <div className="chart-lbl">Skill Gap Analysis</div>
                                    <GapBar label="Core Skills Gap" value={sg.core_gap ?? 0} max={50} color="var(--red)" />
                                    <GapBar label="Important Skills Gap" value={sg.important_gap ?? 0} max={50} color="var(--orange)" />
                                    <GapBar label="Optional Skills Gap" value={sg.optional_gap ?? 0} max={50} color="var(--blue)" />
                                    <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
                                        {[["Core", sg.core_gap, "var(--red)"], ["Important", sg.important_gap, "var(--orange)"], ["Optional", sg.optional_gap, "var(--blue)"]].map(([l, v, c]) => (
                                            <div key={l} style={{ flex: 1, background: "var(--s2)", border: "1px solid var(--border)", borderRadius: 10, padding: "10px 14px", textAlign: "center" }}>
                                                <div style={{ fontSize: "1.4rem", fontWeight: 800, color: c }}>{v ?? 0}</div>
                                                <div style={{ fontFamily: "var(--mono)", fontSize: ".58rem", color: "var(--muted)", letterSpacing: 1, textTransform: "uppercase" }}>{l}</div>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <div className="card" style={{ flex: 1 }}>
                                    <div className="chart-lbl">Role Match Radar</div>
                                    <div className="chart-wrap">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <RadarChart data={radarData} margin={{ top: 10, right: 20, bottom: 10, left: 20 }}>
                                                <PolarGrid stroke="#1e2540" />
                                                <PolarAngleAxis dataKey="role" tick={{ fill: "#6070a8", fontSize: 10, fontFamily: "JetBrains Mono" }} />
                                                <Radar name="Score" dataKey="score" stroke="#4a8fff" fill="#4a8fff" fillOpacity={0.14} dot={{ fill: "#4a8fff", r: 4 }} />
                                            </RadarChart>
                                        </ResponsiveContainer>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* BAR CHART */}
                        <div className="section card fu d2">
                            <div className="sec-head">
                                <span className="sec-num">02</span>
                                <span className="sec-title">All Role Match Scores</span>
                            </div>
                            <div style={{ height: 260 }}>
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={barData} margin={{ top: 4, right: 8, bottom: 50, left: 0 }}>
                                        <XAxis dataKey="role" tick={{ fill: "#6070a8", fontSize: 10, fontFamily: "JetBrains Mono" }} angle={-22} textAnchor="end" interval={0} />
                                        <YAxis tick={{ fill: "#6070a8", fontSize: 10, fontFamily: "JetBrains Mono" }} axisLine={false} tickLine={false} />
                                        <Tooltip content={<CTip />} cursor={{ fill: "rgba(74,143,255,.04)" }} />
                                        <Bar dataKey="score" radius={[6, 6, 0, 0]}>
                                            {barData.map((_, i) => <Cell key={i} fill={BAR_COLORS[i] || "#1e2540"} />)}
                                        </Bar>
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        {/* ALL ROLES */}
                        <div className="section fu d3">
                            <div className="sec-head">
                                <span className="sec-num">03</span>
                                <span className="sec-title">All Role Breakdowns <span style={{ fontFamily: "var(--mono)", fontSize: ".65rem", color: "var(--muted)", fontWeight: 400 }}>(click to expand)</span></span>
                            </div>
                            {sa(data.all_roles).map(r => <RoleRow key={r.role} role={r} maxScore={maxScore} />)}
                        </div>

                        {/* LEARNING PRIORITY */}
                        <div className="section fu d4">
                            <div className="sec-head">
                                <span className="sec-num">04</span>
                                <span className="sec-title">Learning Priority Skills</span>
                            </div>
                            <div className="pri-grid">
                                {sa(data.learning_priority).map((skill, i) => (
                                    <div key={skill} className="pri-item">
                                        <span className="pri-rank">#{i + 1} Priority</span>
                                        <span className="pri-skill">{skill}</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* LEARNING PATH */}
                        <div className="section card fu d4">
                            <div className="sec-head">
                                <span className="sec-num">05</span>
                                <span className="sec-title">Your Learning Roadmap</span>
                            </div>
                            {sa(data.learning_path).map(step => (
                                <div key={step.step} className="path-step">
                                    <div className="ps-left">
                                        <div className="ps-num">{step.step}</div>
                                        <div className="ps-line" />
                                    </div>
                                    <div className="ps-content">
                                        <div className="ps-header">
                                            <span className="ps-desc">{sv(step.description)}</span>
                                            {step.duration && <span className="tag pri">⏱ {step.duration}</span>}
                                        </div>
                                        <div className="tags" style={{ marginBottom: 8 }}>
                                            {sa(step.skills).map(s => <span key={s} className="tag imp">{s}</span>)}
                                        </div>
                                        {/* handles BOTH `project` (string) and `projects` (array) */}
                                        {step.project && typeof step.project === "string" && (
                                            <div className="project-box">
                                                <span className="proj-icon">⚡</span>
                                                <span className="proj-txt">{step.project}</span>
                                            </div>
                                        )}
                                        {sa(step.projects).map((p, i) => (
                                            <div key={i} className="project-box">
                                                <span className="proj-icon">⚡</span>
                                                <span className="proj-txt">{p}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* BETTER FIT ROLES */}
                        <div className="section fu d5">
                            <div className="sec-head">
                                <span className="sec-num">06</span>
                                <span className="sec-title">Roles You Can Target Right Now</span>
                            </div>
                            <div className="g2">
                                {sa(data.better_fit_roles).map((r, idx) => {
                                    const roleTitle = typeof r === "string" ? r : (r?.role || "Specialized Role");
                                    const desc = typeof r === "object" ? r?.description : "";
                                    const salary = typeof r === "object" ? r?.average_salary : "";
                                    const skills = typeof r === "object" ? (r?.required_skills || r?.skills_used || []) : [];
                                    return (
                                        <div key={roleTitle || idx} className="bfr-card">
                                            <div className="bfr-role">{roleTitle}</div>
                                            {salary && <div className="bfr-salary">💰 Avg: {salary}</div>}
                                            {desc && <div className="bfr-desc">{desc}</div>}
                                            {sa(skills).length > 0 && (
                                                <div className="tags">
                                                    {sa(skills).map(s => <span key={s} className="tag blue">{s}</span>)}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                    </section>
                )}
            </div>
        </>
    );
}