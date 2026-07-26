export default function CustomerDashboard() {
  return (
    <div className="customer-workspace">
      <section className="customer-mentor-area">
        <div className="chat-card">
          <div className="chat-empty">Start the conversation</div>
          <div className="chat-composer">
            <input placeholder="Type your message..." />
            <button type="button">Send</button>
          </div>
        </div>
      </section>
    </div>
  );
}
