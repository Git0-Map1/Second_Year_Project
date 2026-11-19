import { Link } from "react-router-dom";
import "./PaymentFailed.css";

function PaymentFailed() {
  return (
    <div className="payment-result-page">
      <div className="payment-result-card">
        <div className="payment-result-icon">✕</div>

        <h1>Payment Failed</h1>

        <p>
          Your payment was not completed. Your booking has been
          cancelled, and the property is available again.
        </p>

        <Link to="/properties" className="payment-result-button">
          Browse Properties
        </Link>

        <Link to="/customer-dashboard" className="payment-result-link">
          Go to Dashboard
        </Link>
      </div>
    </div>
  );
}

export default PaymentFailed;