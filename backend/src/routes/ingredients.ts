import { Router } from "express";
import { prisma } from "../lib/prisma";
import { authenticateUser, requireManagerOrAdmin, requireAdmin, AuthRequest } from "../middleware/auth";

const router = Router();

// GET /api/ingredients
router.get("/", authenticateUser, async (req: AuthRequest, res) => {
  const query = (req.query.query || req.query.search || "") as string;
  const lowStock = req.query.lowStock === "true";

  try {
    const where: any = {};

    if (query) {
      where.OR = [
        { name: { contains: query, mode: "insensitive" } },
        { code: { contains: query, mode: "insensitive" } },
      ];
    }

    const ingredients = await prisma.ingredient.findMany({
      where,
      include: {
        _count: {
          select: { productItems: true, purchaseItems: true },
        },
      },
      orderBy: { name: "asc" },
    });

    let results = ingredients;
    if (lowStock) {
      results = ingredients.filter((ing) => Number(ing.stock) <= Number(ing.minStock));
    }

    return res.json(results);
  } catch (error) {
    console.error("Ingredients GET error:", error);
    return res.status(500).json({ error: "Failed to fetch ingredients" });
  }
});

// POST /api/ingredients
router.post("/", authenticateUser, requireManagerOrAdmin, async (req: AuthRequest, res) => {
  const user = req.user!;
  try {
    const { name, code, unit, stock, minStock, cost } = req.body;

    if (!name || !unit) {
      return res.status(400).json({ error: "Missing required fields: name and unit are required" });
    }

    let finalCode = (code || "").trim();

    if (!finalCode) {
      // Auto-generate ingredient code: ING-XXX
      const count = await prisma.ingredient.count();
      finalCode = `ING-${(count + 1).toString().padStart(3, "0")}`;
    }

    const exists = await prisma.ingredient.findUnique({
      where: { code: finalCode },
    });

    if (exists) {
      return res.status(400).json({ error: "Ingredient code already exists" });
    }

    const parsedStock = parseFloat(stock) || 0;
    const parsedMinStock = parseFloat(minStock) || 5;
    const parsedCost = parseFloat(cost) || 0;

    const ingredient = await prisma.$transaction(async (tx) => {
      const created = await tx.ingredient.create({
        data: {
          name: name.trim(),
          code: finalCode,
          unit: unit.trim(),
          stock: parsedStock,
          minStock: parsedMinStock,
          cost: parsedCost,
        },
      });

      if (parsedStock > 0) {
        await tx.inventoryLog.create({
          data: {
            ingredientId: created.id,
            type: "PURCHASE_IN",
            quantity: parsedStock,
            beforeQty: 0,
            afterQty: parsedStock,
            note: `Initial ingredient stock set by ${user.name}`,
            userId: user.id,
          },
        });
      }

      return created;
    });

    return res.status(201).json(ingredient);
  } catch (error: any) {
    console.error("Ingredient POST error:", error);
    return res.status(500).json({ error: error.message || "Failed to create ingredient" });
  }
});

// GET /api/ingredients/:id
router.get("/:id", authenticateUser, async (req: AuthRequest, res) => {
  try {
    const id = parseInt(req.params.id);
    const ingredient = await prisma.ingredient.findUnique({
      where: { id },
      include: {
        productItems: {
          include: {
            product: {
              select: { id: true, name: true, code: true, price: true },
            },
          },
        },
        inventoryLogs: {
          take: 20,
          orderBy: { createdAt: "desc" },
          include: {
            user: { select: { name: true } },
          },
        },
      },
    });

    if (!ingredient) {
      return res.status(404).json({ error: "Ingredient not found" });
    }

    return res.json(ingredient);
  } catch (error) {
    console.error("Ingredient GET detail error:", error);
    return res.status(500).json({ error: "Failed to fetch ingredient detail" });
  }
});

// PUT /api/ingredients/:id
router.put("/:id", authenticateUser, requireManagerOrAdmin, async (req: AuthRequest, res) => {
  const user = req.user!;
  try {
    const id = parseInt(req.params.id);
    const { name, code, unit, stock, minStock, cost } = req.body;

    const existing = await prisma.ingredient.findUnique({
      where: { id },
    });

    if (!existing) {
      return res.status(404).json({ error: "Ingredient not found" });
    }

    if (code && code.trim() !== existing.code) {
      const codeConflict = await prisma.ingredient.findUnique({
        where: { code: code.trim() },
      });
      if (codeConflict) {
        return res.status(400).json({ error: "Ingredient code is already used" });
      }
    }

    const parsedStock = stock !== undefined ? parseFloat(stock) : Number(existing.stock);
    const parsedMinStock = minStock !== undefined ? parseFloat(minStock) : Number(existing.minStock);
    const parsedCost = cost !== undefined ? parseFloat(cost) : Number(existing.cost);
    const oldStock = Number(existing.stock);

    const updated = await prisma.$transaction(async (tx) => {
      const result = await tx.ingredient.update({
        where: { id },
        data: {
          name: name ? name.trim() : existing.name,
          code: code ? code.trim() : existing.code,
          unit: unit ? unit.trim() : existing.unit,
          stock: parsedStock,
          minStock: parsedMinStock,
          cost: parsedCost,
        },
      });

      if (!isNaN(parsedStock) && parsedStock !== oldStock) {
        const diff = parsedStock - oldStock;
        await tx.inventoryLog.create({
          data: {
            ingredientId: id,
            type: "ADJUSTMENT",
            quantity: Math.abs(diff),
            beforeQty: oldStock,
            afterQty: parsedStock,
            note: `Manual stock adjustment by ${user.name}`,
            userId: user.id,
          },
        });
      }

      if (!isNaN(parsedCost) && parsedCost !== Number(existing.cost)) {
        const linkedRecipes = await tx.productIngredient.findMany({
          where: { ingredientId: id },
          select: { productId: true },
        });

        const productIds = Array.from(new Set(linkedRecipes.map((r: any) => r.productId)));

        for (const pid of productIds) {
          const recipeItems = await tx.productIngredient.findMany({
            where: { productId: pid },
            include: { ingredient: true },
          });

          let totalCost = 0;
          for (const item of recipeItems) {
            const ingCost = item.ingredientId === id ? parsedCost : Number(item.ingredient.cost);
            totalCost += Number(item.quantity) * ingCost;
          }

          await tx.product.update({
            where: { id: pid },
            data: { cost: Number(totalCost.toFixed(2)) },
          });
        }
      }

      return result;
    });

    return res.json(updated);
  } catch (error: any) {
    console.error("Ingredient PUT error:", error);
    return res.status(500).json({ error: error.message || "Failed to update ingredient" });
  }
});

// DELETE /api/ingredients/:id
router.delete("/:id", authenticateUser, requireAdmin, async (req: AuthRequest, res) => {
  try {
    const id = parseInt(req.params.id);

    const recipeCount = await prisma.productIngredient.count({
      where: { ingredientId: id },
    });

    if (recipeCount > 0) {
      return res.status(400).json({
        error: "Cannot delete ingredient: it is currently used in product recipes. Remove it from recipes first.",
      });
    }

    const purchaseCount = await prisma.purchaseItem.count({
      where: { ingredientId: id },
    });

    if (purchaseCount > 0) {
      return res.status(400).json({
        error: "Cannot delete ingredient: it has associated purchase history.",
      });
    }

    await prisma.inventoryLog.deleteMany({
      where: { ingredientId: id },
    });

    await prisma.ingredient.delete({
      where: { id },
    });

    return res.json({ success: true });
  } catch (error) {
    console.error("Ingredient DELETE error:", error);
    return res.status(500).json({ error: "Failed to delete ingredient" });
  }
});

export default router;
