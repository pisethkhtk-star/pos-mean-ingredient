import { Router } from "express";
import { prisma } from "../lib/prisma";
import { authenticateUser, requireManagerOrAdmin, AuthRequest } from "../middleware/auth";

const router = Router();

// GET /api/inventory
router.get("/", authenticateUser, async (req: AuthRequest, res) => {
  try {
    const logs = await prisma.inventoryLog.findMany({
      include: {
        product: {
          select: { name: true, code: true, stock: true },
        },
        ingredient: {
          select: { name: true, code: true, stock: true, unit: true },
        },
        user: {
          select: { name: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return res.json(logs);
  } catch (error) {
    console.error("Inventory logs GET error:", error);
    return res.status(500).json({ error: "Failed to fetch inventory logs" });
  }
});

// POST /api/inventory - Manual stock adjustment for product or ingredient
router.post("/", authenticateUser, requireManagerOrAdmin, async (req: AuthRequest, res) => {
  const user = req.user!;
  try {
    const { productId, ingredientId, type, quantity, note } = req.body;

    if ((!productId && !ingredientId) || !type || quantity === undefined) {
      return res.status(400).json({
        error: "Missing required fields: productId or ingredientId, type, and quantity are required",
      });
    }

    if (type !== "IN" && type !== "OUT" && type !== "ADJUST" && type !== "ADJUSTMENT" && type !== "PURCHASE_IN" && type !== "ORDER_OUT") {
      return res.status(400).json({ error: "Invalid adjustment type" });
    }

    const parsedQty = parseFloat(quantity);
    if (isNaN(parsedQty) || parsedQty <= 0) {
      return res.status(400).json({
        error: "Quantity must be a positive number greater than 0",
      });
    }

    // Handle Ingredient Adjustment
    if (ingredientId) {
      const ingId = parseInt(ingredientId);
      const updatedIngredient = await prisma.$transaction(async (tx) => {
        const ingredient = await tx.ingredient.findUnique({ where: { id: ingId } });
        if (!ingredient) {
          throw new Error("Ingredient not found");
        }

        const oldStock = Number(ingredient.stock);
        let newStock = oldStock;

        if (type === "IN" || type === "PURCHASE_IN") {
          newStock = oldStock + parsedQty;
        } else if (type === "OUT" || type === "ORDER_OUT" || type === "ADJUST" || type === "ADJUSTMENT") {
          newStock = oldStock - parsedQty;
        }

        if (newStock < 0) {
          throw new Error(`Insufficient ingredient stock. Current stock is ${oldStock} ${ingredient.unit}, cannot deduct ${parsedQty}`);
        }

        newStock = Number(newStock.toFixed(2));

        const updated = await tx.ingredient.update({
          where: { id: ingId },
          data: { stock: newStock },
        });

        await tx.inventoryLog.create({
          data: {
            ingredientId: ingId,
            type: type === "ADJUST" ? "ADJUSTMENT" : type,
            quantity: parsedQty,
            beforeQty: oldStock,
            afterQty: newStock,
            note: note || `Manual ingredient stock adjustment (${type})`,
            userId: user.id,
          },
        });

        return updated;
      });

      return res.json(updatedIngredient);
    }

    // Handle Product Adjustment
    if (productId) {
      const prodId = parseInt(productId);
      const updatedProduct = await prisma.$transaction(async (tx) => {
        const product = await tx.product.findUnique({ where: { id: prodId } });
        if (!product) {
          throw new Error("Product not found");
        }

        const oldStock = product.stock;
        let newStock = oldStock;

        if (type === "IN" || type === "PURCHASE_IN") {
          newStock = oldStock + Math.round(parsedQty);
        } else if (type === "OUT" || type === "ORDER_OUT" || type === "ADJUST" || type === "ADJUSTMENT") {
          newStock = oldStock - Math.round(parsedQty);
        }

        if (newStock < 0) {
          throw new Error(`Insufficient stock. Current stock is ${oldStock}, cannot deduct ${parsedQty}`);
        }

        const updated = await tx.product.update({
          where: { id: prodId },
          data: { stock: newStock },
        });

        await tx.inventoryLog.create({
          data: {
            productId: prodId,
            type,
            quantity: parsedQty,
            beforeQty: oldStock,
            afterQty: newStock,
            note: note || `Manual stock adjustment (${type})`,
            userId: user.id,
          },
        });

        return updated;
      });

      return res.json(updatedProduct);
    }
  } catch (error: any) {
    console.error("Inventory POST error:", error);
    return res.status(500).json({ error: error.message || "Failed to adjust inventory" });
  }
});

export default router;
