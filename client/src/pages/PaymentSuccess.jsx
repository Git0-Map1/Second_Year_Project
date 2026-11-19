
import { Link, useSearchParams } from "react-router-dom";
import "./PaymentSuccess.css";

function PaymentSuccess() {
  const [searchParams] = useSearchParams();

  const latePayment = searchParams.get("latePayment") === "true";

  return (
    <div className="payment-result-page">
      <div className="payment-result-card">
        <div className="payment-success-icon">✓</div>

        <h1>
          {latePayment
            ? "Payment Received!"
            : "Payment Successful!"}
        </h1>

        <p>
          {latePayment
            ? "Your payment was received after your booking expired or was cancelled. Our admin team will review your payment."
            : "Your payment has been completed successfully. Your booking is now awaiting confirmation."}
        </p>

        <Link
          to="/customer-dashboard"
          className="payment-result-button"
        >
          Go to Dashboard
        </Link>

        <Link to="/properties" className="payment-result-link">
          Browse Properties
        </Link>
      </div>
    </div>
  );
}

export default PaymentSuccess;
