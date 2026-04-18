import React from "react";

export default function Modal({ title, description, onCancel, onConfirm, confirmText = "Confirm" }) {
  return (
    <div className="modal-overlay active">
      <div className="modal">
        <h3>{title}</h3>
        {description && <p className="muted" style={{ marginBottom: "24px" }}>{description}</p>}
        <div className="modal-actions">
          <button className="btn" style={{ background: "var(--bg-input)" }} onClick={onCancel}>
            Cancel
          </button>
          <button className="btn btn--danger" onClick={onConfirm}>
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
