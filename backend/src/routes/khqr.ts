import { Router } from "express";
import { authenticateUser } from "../middleware/auth";
const { BakongKHQR, khqrData } = require("bakong-khqr");

const router = Router();

// POST /api/khqr
router.post("/", authenticateUser, async (req, res) => {
  try {
    const { amount, orderId } = req.body;

    const bakongAccountId = process.env.BAKONG_ACCOUNT_ID || "sok.sao@acleda";
    const merchantName = process.env.BAKONG_MERCHANT_NAME || "Sok Sao Shop";
    const merchantCity = process.env.BAKONG_MERCHANT_CITY || "Phnom Penh";

    const optionalData = {
      currency: khqrData.currency.usd,
      amount: amount || 0,
      mobileNumber: "",
      storeLabel: merchantName,
      terminalLabel: "POS-01",
      purposeOfTransaction: orderId ? `Payment for order ${orderId}` : "POS Checkout",
      languageData: {
        languagePreference: "KM",
        merchantNameAlternateLanguage: merchantName,
        merchantCityAlternateLanguage: merchantCity,
      },
    };

    const individualInfo = new khqrData.IndividualInfo(
      bakongAccountId,
      merchantName,
      merchantCity,
      optionalData
    );

    const khqr = new BakongKHQR();
    const response = khqr.generateIndividual(individualInfo);

    if (response && response.data) {
      return res.json({ qrString: response.data.qr, amount, currency: "USD" });
    } else {
      return res.status(500).json({ error: "Failed to generate KHQR" });
    }
  } catch (error: any) {
    console.error("KHQR Generation Error:", error);
    return res.status(500).json({ error: error.message || "Failed to generate KHQR" });
  }
});

export default router;
