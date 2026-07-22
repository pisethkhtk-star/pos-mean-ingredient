import { Router } from "express";
import { prisma } from "../lib/prisma";
import { authenticateUser, requireManagerOrAdmin, AuthRequest } from "../middleware/auth";

const router = Router();

// GET /api/suppliers
router.get("/", authenticateUser, async (req: AuthRequest, res) => {
  const search = (req.query.search as string) || "";

  try {
    const where: any = {};

    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { contact: { contains: search, mode: "insensitive" } },
        { phone: { contains: search, mode: "insensitive" } },
        { email: { contains: search, mode: "insensitive" } },
      ];
    }

    const suppliers = await prisma.supplier.findMany({
      where,
      orderBy: { createdAt: "desc" },
    });

    return res.json(suppliers);
  } catch (error) {
    console.error("Suppliers GET error:", error);
    return res.status(500).json({ error: "Failed to fetch suppliers" });
  }
});

// POST /api/suppliers
router.post("/", authenticateUser, requireManagerOrAdmin, async (req: AuthRequest, res) => {
  try {
    const { name, contact, phone, email, address } = req.body;

    if (!name) {
      return res.status(400).json({ error: "Supplier name is required" });
    }

    const supplier = await prisma.supplier.create({
      data: {
        name,
        contact: contact || null,
        phone: phone || null,
        email: email || null,
        address: address || null,
      },
    });

    return res.status(201).json(supplier);
  } catch (error) {
    console.error("Supplier POST error:", error);
    return res.status(500).json({ error: "Failed to create supplier" });
  }
});

// GET /api/suppliers/:id
router.get("/:id", authenticateUser, async (req: AuthRequest, res) => {
  try {
    const id = parseInt(req.params.id);
    const supplier = await prisma.supplier.findUnique({ where: { id } });
    if (!supplier) {
      return res.status(404).json({ error: "Supplier not found" });
    }
    return res.json(supplier);
  } catch (error) {
    console.error("Supplier GET detail error:", error);
    return res.status(500).json({ error: "Failed to fetch supplier" });
  }
});

// PUT /api/suppliers/:id
router.put("/:id", authenticateUser, requireManagerOrAdmin, async (req: AuthRequest, res) => {
  try {
    const id = parseInt(req.params.id);
    const { name, contact, phone, email, address } = req.body;

    if (!name) {
      return res.status(400).json({ error: "Supplier name is required" });
    }

    const existing = await prisma.supplier.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ error: "Supplier not found" });
    }

    const updated = await prisma.supplier.update({
      where: { id },
      data: {
        name,
        contact: contact || null,
        phone: phone || null,
        email: email || null,
        address: address || null,
      },
    });

    return res.json(updated);
  } catch (error) {
    console.error("Supplier PUT error:", error);
    return res.status(500).json({ error: "Failed to update supplier" });
  }
});

// DELETE /api/suppliers/:id
router.delete("/:id", authenticateUser, requireManagerOrAdmin, async (req: AuthRequest, res) => {
  try {
    const id = parseInt(req.params.id);

    const existing = await prisma.supplier.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ error: "Supplier not found" });
    }

    await prisma.supplier.delete({ where: { id } });
    return res.json({ success: true });
  } catch (error) {
    console.error("Supplier DELETE error:", error);
    return res.status(500).json({ error: "Failed to delete supplier" });
  }
});

export default router;
