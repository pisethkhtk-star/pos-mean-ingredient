import { Router } from "express";
import { prisma } from "../lib/prisma";
import { authenticateUser, requireManagerOrAdmin, AuthRequest } from "../middleware/auth";

const router = Router();

// GET /api/discounts
router.get("/", authenticateUser, async (req: AuthRequest, res) => {
  try {
    const discounts = await prisma.discount.findMany({
      orderBy: { id: "asc" },
    });
    return res.json(discounts);
  } catch (error) {
    console.error("Discounts GET error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// POST /api/discounts
router.post("/", authenticateUser, requireManagerOrAdmin, async (req: AuthRequest, res) => {
  try {
    const { name, type, value, minPurchase, startDate, endDate, isActive } = req.body;

    if (!type || value === undefined || minPurchase === undefined) {
      return res.status(400).json({ error: "Type, value, and minPurchase are required" });
    }

    const discount = await prisma.discount.create({
      data: {
        name: name || null,
        type,
        value: Number(value),
        minPurchase: Number(minPurchase),
        startDate: startDate ? new Date(startDate) : null,
        endDate: endDate ? new Date(endDate) : null,
        isActive: isActive !== undefined ? isActive : true,
      },
    });

    return res.json(discount);
  } catch (error) {
    console.error("Discount POST error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// PUT /api/discounts/:id
router.put("/:id", authenticateUser, requireManagerOrAdmin, async (req: AuthRequest, res) => {
  const discountId = parseInt(req.params.id);

  try {
    const { name, type, value, minPurchase, startDate, endDate, isActive } = req.body;

    const current = await prisma.discount.findUnique({
      where: { id: discountId },
    });

    if (!current) {
      return res.status(404).json({ error: "Discount not found" });
    }

    const updated = await prisma.discount.update({
      where: { id: discountId },
      data: {
        name: name !== undefined ? name : current.name,
        type: type !== undefined ? type : current.type,
        value: value !== undefined ? Number(value) : current.value,
        minPurchase: minPurchase !== undefined ? Number(minPurchase) : current.minPurchase,
        startDate: startDate !== undefined ? (startDate ? new Date(startDate) : null) : current.startDate,
        endDate: endDate !== undefined ? (endDate ? new Date(endDate) : null) : current.endDate,
        isActive: isActive !== undefined ? isActive : current.isActive,
      },
    });

    return res.json(updated);
  } catch (error) {
    console.error("Discount PUT error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// DELETE /api/discounts/:id
router.delete("/:id", authenticateUser, requireManagerOrAdmin, async (req: AuthRequest, res) => {
  const discountId = parseInt(req.params.id);

  try {
    const current = await prisma.discount.findUnique({
      where: { id: discountId },
    });

    if (!current) {
      return res.status(404).json({ error: "Discount not found" });
    }

    await prisma.discount.delete({
      where: { id: discountId },
    });

    return res.json({ message: "Discount deleted successfully" });
  } catch (error) {
    console.error("Discount DELETE error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
