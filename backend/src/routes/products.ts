import { Router, Response } from "express";
import { prisma } from "../lib/prisma";
import { authenticateUser, requireManagerOrAdmin, requireAdmin, AuthRequest } from "../middleware/auth";

const router = Router();

// GET /api/products
router.get("/", authenticateUser, async (req: AuthRequest, res) => {
  const query = (req.query.query as string) || "";
  const categoryIdStr = (req.query.categoryId as string) || "";

  try {
    const where: any = {};

    if (query) {
      where.OR = [
        { name: { contains: query, mode: "insensitive" } },
        { code: { contains: query, mode: "insensitive" } },
      ];
    }

    if (categoryIdStr && categoryIdStr !== "all") {
      where.categoryId = parseInt(categoryIdStr);
    }

    const products = await prisma.product.findMany({
      where,
      include: {
        category: true,
        ingredients: {
          include: {
            ingredient: true,
          },
        },
      },
      orderBy: { name: "asc" },
    });

    return res.json(products);
  } catch (error) {
    console.error("Products GET error:", error);
    return res.status(500).json({ error: "Failed to fetch products" });
  }
});

// POST /api/products/import
router.post("/import", authenticateUser, requireManagerOrAdmin, async (req: AuthRequest, res) => {
  const user = req.user!;
  try {
    const { products } = req.body;

    if (!products || !Array.isArray(products)) {
      return res.status(400).json({ error: "Invalid payload: 'products' array is required" });
    }

    const results = {
      success: 0,
      skipped: 0,
      errors: [] as string[],
    };

    // Cache categories to reduce DB hits
    const categories = await prisma.category.findMany();
    const categoryCache = new Map<string, number>();
    categories.forEach((c) => categoryCache.set(c.name.toLowerCase(), c.id));

    for (const item of products) {
      const { name, code, sku, price, cost, stock, minStock, categoryName } = item;
      const activeCode = String(code || sku || "").trim();

      if (!name || !activeCode || !price || !cost || !categoryName) {
        results.errors.push(`Row with Code ${activeCode || "unknown"}: Missing required columns.`);
        results.skipped++;
        continue;
      }

      if (activeCode.length > 14) {
        results.errors.push(`Code ${activeCode} exceeds the maximum limit of 14 characters, skipped.`);
        results.skipped++;
        continue;
      }

      // Check if Code exists
      const exists = await prisma.product.findUnique({
        where: { code: activeCode },
      });

      if (exists) {
        results.errors.push(`Code ${activeCode} already exists, skipped.`);
        results.skipped++;
        continue;
      }

      // Get or create category
      let categoryId: number;
      const key = String(categoryName).trim().toLowerCase();
      if (categoryCache.has(key)) {
        categoryId = categoryCache.get(key)!;
      } else {
        const cat = await prisma.category.create({
          data: { name: String(categoryName).trim() },
        });
        categoryId = cat.id;
        categoryCache.set(key, categoryId);
      }

      const parsedPrice = parseFloat(price);
      const parsedCost = parseFloat(cost);
      const parsedStock = parseInt(stock) || 0;
      const parsedMinStock = parseInt(minStock) || 5;

      try {
        await prisma.$transaction(async (tx) => {
          const prod = await tx.product.create({
            data: {
              name: String(name).trim(),
              code: activeCode,
              price: parsedPrice,
              cost: parsedCost,
              stock: parsedStock,
              minStock: parsedMinStock,
              hasRecipe: item.hasRecipe !== undefined ? Boolean(item.hasRecipe) : false,
              categoryId,
            },
          });

          if (parsedStock > 0) {
            await tx.inventoryLog.create({
              data: {
                productId: prod.id,
                type: "IN",
                quantity: parsedStock,
                beforeQty: 0,
                afterQty: parsedStock,
                note: "CSV Bulk Import Setup",
                userId: user.id,
              },
            });
          }
        });

        results.success++;
      } catch (txErr: any) {
        results.errors.push(`Code ${activeCode}: Failed to save to database. Error: ${txErr.message}`);
        results.skipped++;
      }
    }

    return res.json({
      message: `Import completed: ${results.success} successfully added, ${results.skipped} skipped.`,
      results,
    });
  } catch (error) {
    console.error("Bulk Import API error:", error);
    return res.status(500).json({ error: "Failed to process import payload" });
  }
});

// POST /api/products
router.post("/", authenticateUser, requireManagerOrAdmin, async (req: AuthRequest, res) => {
  const user = req.user!;
  try {
    const { name, code, sku, price, cost, stock, minStock, image, categoryId, ingredients, hasRecipe } = req.body;
    const isRecipeProduct = hasRecipe !== undefined ? Boolean(hasRecipe) : (Array.isArray(ingredients) && ingredients.length > 0);

    if (!name || price === undefined || categoryId === undefined) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    let finalCode = (code || sku || "").trim();

    if (!finalCode) {
      // Auto-generate 14-digit numeric code
      const existingProducts = await prisma.product.findMany({
        select: { code: true }
      });
      const numericCodes = existingProducts
        .map(p => {
          if (/^\d{14}$/.test(p.code)) {
            return parseInt(p.code, 10);
          }
          return null;
        })
        .filter((val): val is number => val !== null);

      const nextCodeNum = numericCodes.length > 0 ?
        numericCodes.reduce((max, val) => val > max ? val : max, 0) + 1 :
        1;

      finalCode = nextCodeNum.toString().padStart(14, '0');
    }

    if (finalCode.length > 14) {
      return res.status(400).json({ error: "Product code cannot exceed 14 characters" });
    }

    const exists = await prisma.product.findUnique({
      where: { code: finalCode },
    });

    if (exists) {
      return res.status(400).json({ error: "Product code already exists" });
    }

    const parsedPrice = parseFloat(price);
    const parsedCost = parseFloat(cost) || 0;
    const parsedStock = !isRecipeProduct ? (parseInt(stock) || 0) : 0;
    const parsedMinStock = !isRecipeProduct ? (parseInt(minStock) || 0) : 0;
    const parsedCategoryId = parseInt(categoryId);

    const product = await prisma.$transaction(async (tx) => {
      const prod = await tx.product.create({
        data: {
          name: name.trim(),
          code: finalCode,
          price: parsedPrice,
          cost: parsedCost,
          stock: parsedStock,
          minStock: parsedMinStock,
          hasRecipe: isRecipeProduct,
          image: image || null,
          categoryId: parsedCategoryId,
        },
      });

      let totalCalculatedCost = 0;
      if (isRecipeProduct && Array.isArray(ingredients) && ingredients.length > 0) {
        const ingredientMap = new Map<number, number>();
        for (const item of ingredients) {
          const ingId = parseInt(item.ingredientId);
          const qty = parseFloat(item.quantity);
          if (ingId && !isNaN(qty) && qty > 0) {
            ingredientMap.set(ingId, (ingredientMap.get(ingId) || 0) + qty);
          }
        }

        for (const [ingId, qty] of ingredientMap.entries()) {
          const ing = await tx.ingredient.findUnique({ where: { id: ingId } });
          if (ing) {
            totalCalculatedCost += qty * Number(ing.cost);
          }
          await tx.productIngredient.create({
            data: {
              productId: prod.id,
              ingredientId: ingId,
              quantity: qty,
            },
          });
        }
      }

      const finalCost = (isRecipeProduct && totalCalculatedCost > 0) ? Number(totalCalculatedCost.toFixed(2)) : parsedCost;

      await tx.product.update({
        where: { id: prod.id },
        data: { cost: finalCost },
      });

      return prod;
    });

    const fullProduct = await prisma.product.findUnique({
      where: { id: product.id },
      include: {
        category: true,
        ingredients: { include: { ingredient: true } },
      },
    });

    return res.status(201).json(fullProduct);
  } catch (error: any) {
    console.error("Product POST error:", error);
    return res.status(500).json({ error: error.message || "Failed to create product" });
  }
});

// GET /api/products/:id
router.get("/:id", authenticateUser, async (req: AuthRequest, res) => {
  try {
    const id = parseInt(req.params.id);
    const product = await prisma.product.findUnique({
      where: { id },
      include: {
        category: true,
        ingredients: {
          include: {
            ingredient: true,
          },
        },
      },
    });

    if (!product) {
      return res.status(404).json({ error: "Product not found" });
    }

    return res.json(product);
  } catch (error) {
    console.error("Product GET details error:", error);
    return res.status(500).json({ error: "Failed to fetch product details" });
  }
});

// PUT /api/products/:id
router.put("/:id", authenticateUser, requireManagerOrAdmin, async (req: AuthRequest, res) => {
  const user = req.user!;
  try {
    const id = parseInt(req.params.id);
    const { name, code, sku, price, cost, stock, minStock, image, categoryId, ingredients, hasRecipe } = req.body;

    const existingProduct = await prisma.product.findUnique({
      where: { id },
    });

    if (!existingProduct) {
      return res.status(404).json({ error: "Product not found" });
    }

    const isRecipeProduct = hasRecipe !== undefined ? Boolean(hasRecipe) : existingProduct.hasRecipe;
    const activeCode = (code !== undefined ? code : sku !== undefined ? sku : undefined)?.trim();

    // Check code unique conflict
    if (activeCode && activeCode !== existingProduct.code) {
      if (activeCode.length > 14) {
        return res.status(400).json({ error: "Product code cannot exceed 14 characters" });
      }
      const codeConflict = await prisma.product.findUnique({
        where: { code: activeCode },
      });
      if (codeConflict) {
        return res.status(400).json({ error: "Product code is already used by another product" });
      }
    }

    const parsedPrice = parseFloat(price);
    const parsedCost = parseFloat(cost);
    const parsedStock = parseInt(stock);
    const parsedMinStock = parseInt(minStock);
    const parsedCategoryId = parseInt(categoryId);

    const updatedProduct = await prisma.$transaction(async (tx) => {
      let totalCalculatedCost = 0;

      if (!isRecipeProduct) {
        // Delete recipe links if product does not use recipe ingredients
        await tx.productIngredient.deleteMany({
          where: { productId: id },
        });
      } else if (Array.isArray(ingredients)) {
        await tx.productIngredient.deleteMany({
          where: { productId: id },
        });

        const ingredientMap = new Map<number, number>();
        for (const item of ingredients) {
          const ingId = parseInt(item.ingredientId);
          const qty = parseFloat(item.quantity);
          if (ingId && !isNaN(qty) && qty > 0) {
            ingredientMap.set(ingId, (ingredientMap.get(ingId) || 0) + qty);
          }
        }

        for (const [ingId, qty] of ingredientMap.entries()) {
          const ing = await tx.ingredient.findUnique({ where: { id: ingId } });
          if (ing) {
            totalCalculatedCost += qty * Number(ing.cost);
          }
          await tx.productIngredient.create({
            data: {
              productId: id,
              ingredientId: ingId,
              quantity: qty,
            },
          });
        }
      }

      const finalCost = (isRecipeProduct && totalCalculatedCost > 0)
        ? Number(totalCalculatedCost.toFixed(2))
        : (!isNaN(parsedCost) ? parsedCost : Number(existingProduct.cost));

      const newStock = !isRecipeProduct ? (!isNaN(parsedStock) ? parsedStock : existingProduct.stock) : 0;
      const newMinStock = !isRecipeProduct ? (!isNaN(parsedMinStock) ? parsedMinStock : existingProduct.minStock) : 0;

      const prod = await tx.product.update({
        where: { id },
        data: {
          name: name || existingProduct.name,
          code: activeCode !== undefined ? activeCode : existingProduct.code,
          price: isNaN(parsedPrice) ? existingProduct.price : parsedPrice,
          cost: finalCost,
          stock: newStock,
          minStock: newMinStock,
          hasRecipe: isRecipeProduct,
          image: image !== undefined ? image : existingProduct.image,
          categoryId: isNaN(parsedCategoryId) ? existingProduct.categoryId : existingProduct.categoryId,
        },
      });

      return prod;
    });

    const fullProduct = await prisma.product.findUnique({
      where: { id: updatedProduct.id },
      include: {
        category: true,
        ingredients: { include: { ingredient: true } },
      },
    });

    return res.json(fullProduct);
  } catch (error: any) {
    console.error("Product PUT error:", error);
    return res.status(500).json({ error: error.message || "Failed to update product" });
  }
});

// DELETE /api/products/:id
router.delete("/:id", authenticateUser, requireAdmin, async (req: AuthRequest, res) => {
  try {
    const id = parseInt(req.params.id);

    const orderItemsCount = await prisma.orderItem.count({
      where: { productId: id },
    });

    if (orderItemsCount > 0) {
      return res.status(400).json({
        error: "Cannot delete product because it has associated sales history. Try adjusting stock to 0 instead.",
      });
    }

    // Clean up inventory logs first since they reference the product
    await prisma.inventoryLog.deleteMany({
      where: { productId: id },
    });

    await prisma.product.delete({
      where: { id },
    });

    return res.json({ success: true });
  } catch (error) {
    console.error("Product DELETE error:", error);
    return res.status(500).json({ error: "Failed to delete product" });
  }
});

// GET /api/products/:id/ingredients
router.get("/:id/ingredients", authenticateUser, async (req: AuthRequest, res) => {
  try {
    const productId = parseInt(req.params.id);
    const recipeItems = await prisma.productIngredient.findMany({
      where: { productId },
      include: {
        ingredient: true,
      },
    });

    return res.json(recipeItems);
  } catch (error) {
    console.error("Product recipe ingredients GET error:", error);
    return res.status(500).json({ error: "Failed to fetch recipe ingredients" });
  }
});

// POST /api/products/:id/ingredients - Add or replace product recipe ingredients
router.post("/:id/ingredients", authenticateUser, requireManagerOrAdmin, async (req: AuthRequest, res) => {
  try {
    const productId = parseInt(req.params.id);
    const { ingredients } = req.body; // Array of { ingredientId, quantity }

    const productExists = await prisma.product.findUnique({
      where: { id: productId },
    });

    if (!productExists) {
      return res.status(404).json({ error: "Product not found" });
    }

    if (!Array.isArray(ingredients)) {
      return res.status(400).json({ error: "Payload must include an 'ingredients' array" });
    }

    const updatedIngredients = await prisma.$transaction(async (tx) => {
      // Delete existing recipe links for this product
      await tx.productIngredient.deleteMany({
        where: { productId },
      });

      const ingredientMap = new Map<number, number>();
      for (const item of ingredients) {
        const ingId = parseInt(item.ingredientId);
        const qty = parseFloat(item.quantity);
        if (ingId && !isNaN(qty) && qty > 0) {
          ingredientMap.set(ingId, (ingredientMap.get(ingId) || 0) + qty);
        }
      }

      let totalCalculatedCost = 0;
      const createdItems = [];

      for (const [ingId, qty] of ingredientMap.entries()) {
        const created = await tx.productIngredient.create({
          data: {
            productId,
            ingredientId: ingId,
            quantity: qty,
          },
          include: {
            ingredient: true,
          },
        });
        totalCalculatedCost += qty * Number(created.ingredient?.cost || 0);
        createdItems.push(created);
      }

      await tx.product.update({
        where: { id: productId },
        data: { cost: Number(totalCalculatedCost.toFixed(2)) },
      });

      return createdItems;
    });

    return res.json(updatedIngredients);
  } catch (error: any) {
    console.error("Product recipe ingredients POST error:", error);
    return res.status(500).json({ error: error.message || "Failed to update product recipe" });
  }
});

// DELETE /api/products/:id/ingredients/:ingredientId
router.delete("/:id/ingredients/:ingredientId", authenticateUser, requireManagerOrAdmin, async (req: AuthRequest, res) => {
  try {
    const productId = parseInt(req.params.id);
    const ingredientId = parseInt(req.params.ingredientId);

    await prisma.productIngredient.deleteMany({
      where: {
        productId,
        ingredientId,
      },
    });

    return res.json({ success: true });
  } catch (error) {
    console.error("Product recipe ingredient DELETE error:", error);
    return res.status(500).json({ error: "Failed to delete ingredient from recipe" });
  }
});

export default router;

