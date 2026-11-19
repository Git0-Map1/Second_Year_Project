require("dotenv").config();

const { generateEsewaSignature } = require("./utils/esewa");

const result = generateEsewaSignature(
    "100",
    "11-201-13",
    "EPAYTEST"
)

console.log("Generated Signature:", result.signature);
console.log("Signed Fields:",result.signedFieldNames);