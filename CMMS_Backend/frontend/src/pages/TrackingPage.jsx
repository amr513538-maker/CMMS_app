import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import PageCard from "../components/PageCard";
import { api } from "../api/client";
import { useAuth } from "../context/AuthContext";

export default function TrackingPage() {
  const { code } = useParams();
  const { user, can } = useAuth();
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [comment, setComment] = useState("");

  const fetchTracking = async () => {
    try {
      const res = await api(`/api/maintenance-requests/track/${code}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to load tracking data.");
      setData(json);
      setError(null);
    } catch (err) {
      if (err.message !== "Unauthorized") {
        setError(err.message);
      }
    }
  };

  useEffect(() => {
    fetchTracking();
  }, [code]);

  const handleComment = async (e) => {
    e.preventDefault();
    if (!comment) return;
    try {
      await api(`/api/maintenance-requests/${data.request.id}/events`, {
        method: "POST",
        body: JSON.stringify({ event_type: "comment", message: comment })
      });
      setComment("");
      fetchTracking();
    } catch (err) {
      alert("Failed to add comment");
    }
  };

  const handleStatusUpdate = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const payload = Object.fromEntries(formData);
    if (!payload.new_status && !payload.assign_to) return;
    payload.message = "System Update";
    try {
      await api(`/api/maintenance-requests/${data.request.id}/events`, {
        method: "POST",
        body: JSON.stringify(payload)
      });
      fetchTracking();
      e.target.reset();
    } catch (err) {
      alert("Failed to update status");
    }
  };

  if (error) return <PageCard title="Order Tracking"><p className="error text-danger">{error}</p></PageCard>;
  if (!data) return <PageCard title="Order Tracking"><div className="muted"><span className="spinner"></span> Loading timeline...</div></PageCard>;

  const req = data.request;
  const evts = data.events;

  const steps = ["New", "Assigned", "In Progress", "Done"];
  let currentStepIndex = steps.indexOf(req.status);
  if(currentStepIndex === -1) currentStepIndex = 0;

  return (
    <PageCard title={`Tracking: ${req.request_code}`}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "30px", flexWrap: "wrap", gap: "16px" }}>
        <div>
          <h2 style={{ margin: 0 }}>{req.asset_name || "General Request"}</h2>
          <p className="muted" style={{ marginTop: "4px" }}>
            📍 <b>Location:</b> {req.location || "N/A"} <br/>
            👤 <b>Reported by:</b> {req.requested_by_name}
          </p>
        </div>
        <div style={{ textAlign: "right" }}>
          <div className={`pill ${req.priority === 'Critical' ? 'text-danger' : 'text-primary'}`}>{req.priority}</div>
          <p className="muted" style={{ marginTop: "8px", fontSize: "12px" }}>Assigned to: <b>{req.assigned_to_name || "Pending"}</b></p>
        </div>
      </div>

      {req.status !== "Cancelled" && (
        <div className="stepper">
          {steps.map((s, idx) => {
            let icon = idx + 1;
            if (idx < currentStepIndex || req.status === "Done") icon = '✓';
            const activeClass = idx <= currentStepIndex ? "active" : "";
            return (
              <div key={s} className={`step ${activeClass}`}>
                <div className="step__circle">{icon}</div>
                <span>{s}</span>
              </div>
            );
          })}
        </div>
      )}

      <div className="card__body" style={{ background: "var(--bg-elevated)", marginBottom: "20px", borderRadius: "var(--radius)" }}>
        <b style={{ color: "var(--text-muted)", textTransform: "uppercase", fontSize: "12px" }}>Issue Description</b><br />
        <div style={{ marginTop: "8px", fontSize: "15px", lineHeight: "1.6", whiteSpace: 'pre-wrap' }}>{req.description}</div>
        {req.image_url && <div style={{ marginTop: "16px" }}><img src={`/api${req.image_url}`} alt="Issue Photo" style={{ maxWidth: "100%", borderRadius: "8px", border: "1px solid var(--border)" }} /></div>}
      </div>

      <h3 style={{ marginTop: "40px" }}>Order Timeline</h3>
      <div className="timeline">
        {evts.map(e => (
          <div key={e.id} className={`timeline-item ${e.event_type}`}>
            <div className="timeline-header">
              <b>{e.user_name || "System"}</b> &bull; <span className="muted">{new Date(e.created_at).toLocaleString()}</span>
            </div>
            <div className="timeline-body">{e.message}</div>
          </div>
        ))}
      </div>

      {req.status !== "Done" && req.status !== "Cancelled" && (
        <form onSubmit={handleComment} style={{ display: "flex", flexDirection: "column", gap: "10px", marginBottom: "20px" }}>
          <textarea value={comment} onChange={e=>setComment(e.target.value)} placeholder="Type a comment or note..." required rows="2" className="form input" style={{ width: "100%" }}></textarea>
          <button type="submit" className="btn btn--primary" style={{ alignSelf: "end" }}>Add Comment</button>
        </form>
      )}

      {can("viewRequests") && req.status !== "Done" && (
        <form onSubmit={handleStatusUpdate} className="form" style={{ background: "var(--bg-hover)", padding: "16px", borderRadius: "12px", marginTop: "20px" }}>
          <h4>🔧 Admin/Tech Controls</h4>
          <div style={{ display: "flex", gap: "10px", alignItems: "end", flexWrap: "wrap" }}>
            <div style={{ flex: 1, minWidth: "200px" }}>
              <label>Update Status</label>
              <select name="new_status">
                <option value="">-- No Change --</option>
                <option value="Assigned">Assigned</option>
                <option value="In Progress">In Progress</option>
                <option value="Done">Done</option>
                <option value="Cancelled">Cancelled</option>
              </select>
            </div>
            {can("admin") && (
              <div style={{ flex: 1, minWidth: "200px" }}>
                <label>Assign to Tech ID</label>
                <input type="number" name="assign_to" placeholder="Tech User ID" />
              </div>
            )}
            <button type="submit" className="btn btn--danger">Apply Changes</button>
          </div>
        </form>
      )}
    </PageCard>
  );
}
