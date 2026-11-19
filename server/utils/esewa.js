
const crypto = require("crypto");

const generateEsewaSignature = (totalAmount, transactionUuid, productCode) => {
  const signedFieldNames = "total_amount,transaction_uuid,product_code";

  const message = `total_amount=${totalAmount},transaction_uuid=${transactionUuid},product_code=${productCode}`;

  const secretKey = process.env.ESEWA_SECRET_KEY;

  if (!secretKey) {
    throw new Error("ESEWA_SECRET_KEY is missing");
  }

  const signature = crypto
    .createHmac("sha256", secretKey)
    .update(message)
    .digest("base64");

  return {
    signature,
    signedFieldNames
  };
};

const verifyEsewaSignature = (responseData) => {
  try {
    const secretKey = process.env.ESEWA_SECRET_KEY;

    if (!secretKey || !responseData || typeof responseData !== "object") {
      return false;
    }

    const signedFieldNames = responseData.signed_field_names;
    const receivedSignature = responseData.signature;

    if (
      typeof signedFieldNames !== "string" ||
      typeof receivedSignature !== "string" ||
      !signedFieldNames ||
      !receivedSignature
    ) {
      return false;
    }

    const fields = signedFieldNames.split(",");

    // Required fields in eSewa's successful response
    const requiredFields = [
      "transaction_code",
      "status",
      "total_amount",
      "transaction_uuid",
      "product_code",
      "signed_field_names"
    ];

    // Reject duplicate fields
    if (new Set(fields).size !== fields.length) {
      return false;
    }

    // Check that all required fields are signed
    if (!requiredFields.every(field => fields.includes(field))) {
      return false;
    }

    // Check that every signed field has a value
    for (const field of fields) {
      if (
        !Object.prototype.hasOwnProperty.call(responseData, field) ||
        responseData[field] === null ||
        responseData[field] === undefined
      ) {
        return false;
      }
    }

    // Reconstruct the signed message in the exact field order
    const message = fields
      .map(field => `${field}=${responseData[field]}`)
      .join(",");

    const expectedSignature = crypto
      .createHmac("sha256", secretKey)
      .update(message)
      .digest("base64");

    const expected = Buffer.from(expectedSignature, "base64");
    const received = Buffer.from(receivedSignature, "base64");

    if (expected.length !== received.length) {
      return false;
    }

    return crypto.timingSafeEqual(expected, received);

  } catch (error) {
    console.error("eSewa Signature Verification Error:", error);
    return false;
  }
};

module.exports = {
  generateEsewaSignature,
  verifyEsewaSignature
};
