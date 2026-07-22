import { Router } from "express";
import { prisma } from "../lib/prisma";
import { authenticateUser, requireManagerOrAdmin, AuthRequest } from "../middleware/auth";

const router = Router();

// GET /api/purchases
router.get("/", authenticateUser, requireManagerOrAdmin, async (req: AuthRequest, res) => {
  try {
    const purchases = await prisma.purchase.findMany({
      include: {
        supplier: true,
        user: { select: { name: true } },
        items: {
          include: {
            ingredient: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return res.json(purchases);
  } catch (error) {
    console.error("Purchases GET error:", error);
    return res.status(500).json({ error: "Failed to fetch purchases" });
  }
});

// POST /api/purchases - Stock IN raw ingredients
router.post("/", authenticateUser, requireManagerOrAdmin, async (req: AuthRequest, res) => {
  const user = req.user!;
  try {
    const { supplierId, note, items } = req.body;

    if (!supplierId || !items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: "Invalid purchase data: supplierId and items array are required" });
    }

    const reference = "PO-" + Date.now();
    let totalAmount = 0;

    for (const item of items) {
      const qty = parseFloat(item.quantity) || 0;
      const cost = parseFloat(item.cost) || 0;
      totalAmount += qty * cost;
    }
    totalAmount = Number(totalAmount.toFixed(2));

    const purchase = await prisma.$transaction(async (tx) => {
      // 1. Create Purchase record
      const createdPurchase = await tx.purchase.create({
        data: {
          reference,
          supplierId: parseInt(supplierId),
          userId: user.id,
          totalAmount,
          note,
          items: {
            create: items.map((item: any) => ({
              ingredientId: parseInt(item.ingredientId),
              quantity: Number(parseFloat(item.quantity).toFixed(2)),
              cost: Number(parseFloat(item.cost).toFixed(2)),
              subtotal: Number((parseFloat(item.quantity) * parseFloat(item.cost)).toFixed(2)),
            })),
          },
        },
        include: {
          items: {
            include: { ingredient: true },
          },
        },
      });

      // 2. Increment Stock and create InventoryLogs for each ingredient
      for (const item of createdPurchase.items) {
        const ingredient = await tx.ingredient.findUnique({ where: { id: item.ingredientId } });
        if (!ingredient) continue;

        const oldStock = Number(ingredient.stock);
        const addedQty = Number(item.quantity);
        const newStock = Number((oldStock + addedQty).toFixed(2));

        await tx.ingredient.update({
          where: { id: ingredient.id },
          data: { stock: newStock },
        });

        await tx.inventoryLog.create({
          data: {
            ingredientId: ingredient.id,
            type: "PURCHASE_IN",
            quantity: addedQty,
            beforeQty: oldStock,
            afterQty: newStock,
            note: note || `Purchased via Ref #${reference}`,
            userId: user.id,
          },
        });
      }

      return createdPurchase;
    });

    return res.status(201).json(purchase);
  } catch (error: any) {
    console.error("Purchase POST error:", error);
    return res.status(500).json({ error: error.message || "Failed to create purchase" });
  }
});

export default router;
