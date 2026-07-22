import { Router, Response } from "express";
import { prisma } from "../lib/prisma";
import { authenticateUser, requireManagerOrAdmin, AuthRequest } from "../middleware/auth";

const router = Router();

// GET /api/categories
router.get("/", authenticateUser, async (req: AuthRequest, res) => {
  try {
    const categories = await prisma.category.findMany({
      orderBy: { name: "asc" },
      include: {
        _count: {
          select: { products: true },
        },
      },
    });
    return res.json(categories);
  } catch (error) {
    console.error("Categories GET error:", error);
    return res.status(500).json({ error: "Failed to fetch categories" });
  }
});

// POST /api/categories
router.post("/", authenticateUser, requireManagerOrAdmin, async (req: AuthRequest, res) => {
  try {
    const { name, icon } = req.body;

    if (!name) {
      return res.status(400).json({ error: "Category name is required" });
    }

    const exists = await prisma.category.findUnique({
      where: { name },
    });

    if (exists) {
      return res.status(400).json({ error: "Category name already exists" });
    }

    const category = await prisma.category.create({
      data: { name, icon },
    });

    return res.status(201).json(category);
  } catch (error) {
    console.error("Category POST error:", error);
    return res.status(500).json({ error: "Failed to create category" });
  }
});

// PUT /api/categories/:id
router.put("/:id", authenticateUser, requireManagerOrAdmin, async (req: AuthRequest, res) => {
  try {
    const id = parseInt(req.params.id);
    const { name, icon } = req.body;

    if (!name) {
      return res.status(400).json({ error: "Category name is required" });
    }

    const existingCategory = await prisma.category.findUnique({
      where: { id },
    });

    if (!existingCategory) {
      return res.status(404).json({ error: "Category not found" });
    }

    if (name !== existingCategory.name) {
      const conflict = await prisma.category.findUnique({
        where: { name },
      });
      if (conflict) {
        return res.status(400).json({ error: "Category name already exists" });
      }
    }

    const updated = await prisma.category.update({
      where: { id },
      data: { name, icon },
    });

    return res.json(updated);
  } catch (error) {
    console.error("Category PUT error:", error);
    return res.status(500).json({ error: "Failed to update category" });
  }
});

// DELETE /api/categories/:id
router.delete("/:id", authenticateUser, requireManagerOrAdmin, async (req: AuthRequest, res) => {
  try {
    const id = parseInt(req.params.id);

    const existingCategory = await prisma.category.findUnique({
      where: { id },
    });

    if (!existingCategory) {
      return res.status(404).json({ error: "Category not found" });
    }

    // Check if category has products
    const productsCount = await prisma.product.count({
      where: { categoryId: id },
    });

    if (productsCount > 0) {
      return res.status(400).json({
        error: "Cannot delete category that contains products. Please reassign or delete the products first.",
      });
    }

    await prisma.category.delete({
      where: { id },
    });

    return res.json({ success: true });
  } catch (error) {
    console.error("Category DELETE error:", error);
    return res.status(500).json({ error: "Failed to delete category" });
  }
});

export default router;
