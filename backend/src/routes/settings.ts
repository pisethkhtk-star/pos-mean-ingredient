import { Router } from "express";
import { authenticateUser, requireAdmin, AuthRequest } from "../middleware/auth";
import fs from "fs";
import path from "path";

const router = Router();
const SETTINGS_FILE_PATH = path.join(process.cwd(), "store-settings.json");

function readSettings() {
  try {
    if (fs.existsSync(SETTINGS_FILE_PATH)) {
      const data = fs.readFileSync(SETTINGS_FILE_PATH, "utf-8");
      return JSON.parse(data);
    }
  } catch (err) {
    console.error("Error reading settings file:", err);
  }
  return {
    storeName: "My POS System",
    storeAddress: "123 Main Street, Phnom Penh",
    storePhone: "012-345-678",
    taxRate: 10,
    receiptHeader: "Thank you for shopping with us!",
    receiptFooter: "Please come again!",
  };
}

function writeSettings(settings: any) {
  try {
    fs.writeFileSync(SETTINGS_FILE_PATH, JSON.stringify(settings, null, 2), "utf-8");
    return true;
  } catch (err) {
    console.error("Error writing settings file:", err);
    return false;
  }
}

// GET /api/settings
router.get("/", authenticateUser, async (req: AuthRequest, res) => {
  const settings = readSettings();
  return res.json(settings);
});

// POST /api/settings
router.post("/", authenticateUser, requireAdmin, async (req: AuthRequest, res) => {
  try {
    const { storeName, storeAddress, storePhone, taxRate, receiptHeader, receiptFooter } = req.body;

    const currentSettings = readSettings();

    const newSettings = {
      storeName: storeName || currentSettings.storeName,
      storeAddress: storeAddress !== undefined ? storeAddress : currentSettings.storeAddress,
      storePhone: storePhone !== undefined ? storePhone : currentSettings.storePhone,
      taxRate: taxRate !== undefined ? parseFloat(taxRate) : currentSettings.taxRate,
      receiptHeader: receiptHeader !== undefined ? receiptHeader : currentSettings.receiptHeader,
      receiptFooter: receiptFooter !== undefined ? receiptFooter : currentSettings.receiptFooter,
    };

    const success = writeSettings(newSettings);
    if (!success) {
      return res.status(500).json({ error: "Failed to save settings" });
    }

    return res.json(newSettings);
  } catch (error) {
    console.error("Settings POST error:", error);
    return res.status(500).json({ error: "Failed to update store settings" });
  }
});

export default router;
