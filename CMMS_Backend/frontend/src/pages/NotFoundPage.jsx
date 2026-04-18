import React from "react";
import PageCard from "../components/PageCard";
import { Link } from "react-router-dom";

export default function NotFoundPage() {
  return (
    <PageCard title="Not found">
      <p className="muted">Page not found.</p>
      <Link to="/" className="btn btn--primary" style={{marginTop: "16px"}}>Go Home</Link>
    </PageCard>
  );
}
