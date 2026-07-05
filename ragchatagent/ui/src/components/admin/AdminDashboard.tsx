export default function AdminDashboard() {
  return (
    <div className="guru-dashboard admin-guru-dashboard">
      <h1>Welcome to Admin Dashboard</h1>

      <div className="guru-admin-summary-grid">
        <div className="guru-summary-card">
          <span>Server Status</span>
          <strong>Online</strong>
          <p>Breaks server uptime and core health checks.</p>
        </div>
        <div className="guru-summary-card">
          <span>User Tokens</span>
          <strong>Usage</strong>
          <p>Track how users consume tokens across the platform.</p>
        </div>
        <div className="guru-summary-card">
          <span>Most Used Guruu</span>
          <strong>Report</strong>
          <p>Monitor which Guruu gets the most engagement.</p>
        </div>
      </div>
    </div>
  );
}
