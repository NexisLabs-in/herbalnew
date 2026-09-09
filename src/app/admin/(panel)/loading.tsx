/** Main-column only — the sidebar lives in the panel layout and stays put. */
export default function AdminPanelLoading() {
  return (
    <div aria-busy="true" aria-live="polite">
      <div className="admin-skel admin-skel--title" />
      <div className="admin-skel admin-skel--sub" />
      <div className="admin-skel-grid">
        <div className="admin-skel admin-skel--card" />
        <div className="admin-skel admin-skel--card" />
        <div className="admin-skel admin-skel--card" />
        <div className="admin-skel admin-skel--card" />
      </div>
      <div className="admin-skel admin-skel--table" />
      <span className="visually-hidden">Loading…</span>
    </div>
  );
}
