import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import PageCard from "../components/PageCard";
import Modal from "../components/Modal";
import { api } from "../api/client";
import { useAuth } from "../context/AuthContext";

export default function RequestsPage() {
  const { isAdmin } = useAuth();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const fetchRequests = async () => {
    try {
      const res = await api("/api/maintenance-requests");
      const json = await res.json();
      setRequests(json);
    } catch (err) {
      setError("Failed to load requests data.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await api(`/api/maintenance-requests/${deleteTarget}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete request.");
      setRequests(prev => prev.filter(r => r.id !== deleteTarget));
    } catch (err) {
      alert(err.message);
    } finally {
      setDeleting(false);
      setDeleteTarget(null);
    }
  };

  if (loading) return <PageCard title="Tasks Queue"><div className="muted"><span className="spinner"></span> Loading requests...</div></PageCard>;
  if (error) return <PageCard title="Tasks Queue"><p className="error">{error}</p></PageCard>;

  return (
    <>
      <PageCard title="Tasks Queue">
        {requests.length === 0 ? (
          <p className="muted">No requests found.</p>
        ) : (
          <div className="tableWrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Code</th>
                  <th>Asset</th>
                  <th>Description</th>
                  <th>Priority</th>
                  <th>Status</th>
                  <th>Assigned To</th>
                  {isAdmin() && <th>Actions</th>}
                </tr>
              </thead>
              <tbody>
                {requests.map(r => (
                  <tr key={r.id}>
                    <td><Link to={`/track/${r.request_code}`} style={{ color: "var(--primary)", fontWeight: "bold" }}>{r.request_code}</Link></td>
                    <td>{r.asset_name || "-"}</td>
                    <td>{r.description.substring(0, 30)}{r.description.length > 30 ? "..." : ""}</td>
                    <td><span className={r.priority?.toLowerCase() === "critical" ? "text-danger" : "text-muted"}>{r.priority}</span></td>
                    <td><span className={`pill ${r.status === 'New' ? 'text-danger' : r.status === 'Done' ? 'text-success' : 'pill--soft'}`} style={r.status === 'New' ? { fontWeight: 'bold' } : {}}>{r.status}</span></td>
                    <td className="muted">{r.assigned_to || "Unassigned"}</td>
                    {isAdmin() && (
                      <td>
                        <button 
                          className="btn btn--danger" 
                          style={{ padding: '4px 8px', fontSize: '12px' }}
                          onClick={() => setDeleteTarget(r.id)}
                        >
                          🗑️ Delete
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </PageCard>

      {deleteTarget && (
        <Modal
          title="Delete Request?"
          description="This action will permanently remove this maintenance request and all its history. This cannot be undone."
          onCancel={() => setDeleteTarget(null)}
          onConfirm={handleDelete}
          confirmText={deleting ? "Deleting..." : "Confirm Delete"}
        />
      )}
    </>
  );
}
