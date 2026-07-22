import "dotenv/config";
import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import path from "path";

// Initialize express app
const app = express();
const PORT = process.env.PORT || 5000;

// Enable CORS
app.use(
  cors({
    origin: ["http://localhost:3000"],
    credentials: true,
  })
);

// Built-in body parsers and cookie parser
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));
app.use(cookieParser());

// Serve static uploaded files
app.use("/uploads", express.static(path.join(process.cwd(), "public", "uploads")));

// Import all routers
import authRouter from "./routes/auth";
import categoryRouter from "./routes/categories";
import productRouter from "./routes/products";
import ingredientRouter from "./routes/ingredients";
import customerRouter from "./routes/customers";
import discountRouter from "./routes/discounts";
import inventoryRouter from "./routes/inventory";
import khqrRouter from "./routes/khqr";
import orderRouter from "./routes/orders";
import purchaseRouter from "./routes/purchases";
import reportRouter from "./routes/reports";
import roleRouter from "./routes/roles";
import settingsRouter from "./routes/settings";
import supplierRouter from "./routes/suppliers";
import telegramRouter from "./routes/telegram";
import uploadRouter from "./routes/upload";
import userRouter from "./routes/users";

// Mount routers under /api
app.use("/api/auth", authRouter);
app.use("/api/categories", categoryRouter);
app.use("/api/products", productRouter);
app.use("/api/ingredients", ingredientRouter);
app.use("/api/customers", customerRouter);
app.use("/api/discounts", discountRouter);
app.use("/api/inventory", inventoryRouter);
app.use("/api/khqr", khqrRouter);
app.use("/api/orders", orderRouter);
app.use("/api/purchases", purchaseRouter);
app.use("/api/reports", reportRouter);
app.use("/api/roles", roleRouter);
app.use("/api/settings", settingsRouter);
app.use("/api/suppliers", supplierRouter);
app.use("/api/telegram", telegramRouter);
app.use("/api/upload", uploadRouter);
app.use("/api/users", userRouter);

// Default test route
app.get("/health", (req, res) => {
  res.json({ status: "ok", service: "pos-backend", timestamp: new Date() });
});

// Start listening
app.listen(PORT, () => {
  console.log(`🚀 POS Backend Server is running on http://localhost:${PORT}`);
});
