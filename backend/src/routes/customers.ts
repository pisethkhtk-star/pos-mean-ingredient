import { Router } from "express";
import { prisma } from "../lib/prisma";
import { authenticateUser, requireManagerOrAdmin, AuthRequest } from "../middleware/auth";

const router = Router();

// GET /api/customers
router.get("/", authenticateUser, async (req: AuthRequest, res) => {
  const search = (req.query.search as string) || "";

  try {
    const where: any = {};

    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { phone: { contains: search, mode: "insensitive" } },
        { email: { contains: search, mode: "insensitive" } },
      ];
    }

    const customers = await prisma.customer.findMany({
      where,
      orderBy: { createdAt: "desc" },
    });

    return res.json(customers);
  } catch (error) {
    console.error("Customers GET error:", error);
    return res.status(500).json({ error: "Failed to fetch customers" });
  }
});

// POST /api/customers
router.post("/", authenticateUser, async (req: AuthRequest, res) => {
  try {
    const { name, phone, email, address } = req.body;

    if (!name) {
      return res.status(400).json({ error: "Customer name is required" });
    }

    // Unique phone verification
    if (phone) {
      const exists = await prisma.customer.findUnique({
        where: { phone },
      });
      if (exists) {
        return res.status(400).json({ error: "Phone number already exists" });
      }
    }

    const customer = await prisma.customer.create({
      data: {
        name,
        phone: phone || null,
        email: email || null,
        address: address || null,
        points: 0,
      },
    });

    return res.status(201).json(customer);
  } catch (error) {
    console.error("Customer POST error:", error);
    return res.status(500).json({ error: "Failed to create customer" });
  }
});

// GET /api/customers/:id
router.get("/:id", authenticateUser, async (req: AuthRequest, res) => {
  try {
    const id = parseInt(req.params.id);
    const customer = await prisma.customer.findUnique({
      where: { id },
      include: {
        orders: {
          orderBy: { createdAt: "desc" },
          include: {
            user: {
              select: { name: true },
            },
          },
        },
      },
    });

    if (!customer) {
      return res.status(404).json({ error: "Customer not found" });
    }

    return res.json(customer);
  } catch (error) {
    console.error("Customer GET detail error:", error);
    return res.status(500).json({ error: "Failed to fetch customer profile" });
  }
});

// PUT /api/customers/:id
router.put("/:id", authenticateUser, requireManagerOrAdmin, async (req: AuthRequest, res) => {
  try {
    const id = parseInt(req.params.id);
    const { name, phone, email, address, points } = req.body;

    const existingCustomer = await prisma.customer.findUnique({
      where: { id },
    });

    if (!existingCustomer) {
      return res.status(404).json({ error: "Customer not found" });
    }

    // Phone uniqueness check
    if (phone && phone !== existingCustomer.phone) {
      const phoneConflict = await prisma.customer.findUnique({
        where: { phone },
      });
      if (phoneConflict) {
        return res.status(400).json({ error: "Phone number already registered by another customer" });
      }
    }

    const updated = await prisma.customer.update({
      where: { id },
      data: {
        name: name || existingCustomer.name,
        phone: phone !== undefined ? phone : existingCustomer.phone,
        email: email !== undefined ? email : existingCustomer.email,
        address: address !== undefined ? address : existingCustomer.address,
        points: points !== undefined ? parseInt(points) : existingCustomer.points,
      },
    });

    return res.json(updated);
  } catch (error) {
    console.error("Customer PUT error:", error);
    return res.status(500).json({ error: "Failed to update customer" });
  }
});

export default router;
