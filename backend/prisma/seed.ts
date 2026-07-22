import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";
import dotenv from "dotenv";
import bcrypt from "bcrypt";

dotenv.config();

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("Seeding started...");

  // 1. Seed Admin User
  const adminEmail = "admin@pos.com";
  const hashedPassword = bcrypt.hashSync("Admin@123", 10);
  const adminUser = await prisma.user.upsert({
    where: { email: adminEmail },
    update: {},
    create: {
      name: "Admin User",
      email: adminEmail,
      password: hashedPassword,
      role: "ADMIN",
    },
  });
  console.log(`Seeded admin user: ${adminUser.email}`);

  // 2. Seed Categories
  const categoriesData = [
    { name: "Beverages", icon: "Coffee" },
    { name: "Snacks", icon: "Cookie" },
    { name: "Main Course", icon: "Utensils" },
    { name: "Desserts", icon: "IceCream" },
    { name: "Merchandise", icon: "Shirt" },
  ];

  const categories = [];
  for (const cat of categoriesData) {
    const created = await prisma.category.upsert({
      where: { name: cat.name },
      update: {},
      create: cat,
    });
    categories.push(created);
  }
  console.log(`Seeded ${categories.length} product categories.`);

  // 3. Seed Suppliers
  const suppliersData = [
    { name: "Global Beverage Distrib", contact: "John Smith", phone: "099111222", email: "john@globalbev.com", address: "Phnom Penh, Cambodia" },
    { name: "Sweet Delight Bakery Supplies", contact: "Jane Doe", phone: "088222333", email: "jane@sweetdelight.com", address: "Siem Reap, Cambodia" },
  ];

  for (const sup of suppliersData) {
    const existing = await prisma.supplier.findFirst({ where: { name: sup.name } });
    if (!existing) {
      await prisma.supplier.create({ data: sup });
    }
  }
  console.log("Seeded sample suppliers.");

  // 4. Seed Raw Ingredients
  console.log("Seeding ingredients...");
  const ingredientsData = [
    { name: "Espresso Beans", code: "ING-001", unit: "g", stock: 10000.00, minStock: 1000.00, cost: 0.02 },
    { name: "Whole Milk", code: "ING-002", unit: "ml", stock: 20000.00, minStock: 2000.00, cost: 0.003 },
    { name: "Sugar Syrup", code: "ING-003", unit: "ml", stock: 5000.00, minStock: 500.00, cost: 0.005 },
    { name: "Matcha Powder", code: "ING-004", unit: "g", stock: 2000.00, minStock: 300.00, cost: 0.08 },
    { name: "Wheat Flour", code: "ING-005", unit: "g", stock: 15000.00, minStock: 2000.00, cost: 0.002 },
    { name: "Unsalted Butter", code: "ING-006", unit: "g", stock: 5000.00, minStock: 500.00, cost: 0.01 },
    { name: "Chocolate Chips", code: "ING-007", unit: "g", stock: 3000.00, minStock: 500.00, cost: 0.015 },
    { name: "Jasmine Rice", code: "ING-008", unit: "g", stock: 25000.00, minStock: 3000.00, cost: 0.001 },
    { name: "Beef Patty", code: "ING-009", unit: "pcs", stock: 200.00, minStock: 30.00, cost: 1.20 },
    { name: "Cheese Slices", code: "ING-010", unit: "pcs", stock: 300.00, minStock: 50.00, cost: 0.25 },
    { name: "Toast Bread", code: "ING-011", unit: "pcs", stock: 400.00, minStock: 60.00, cost: 0.15 },
  ];

  const ingredientMap: Record<string, any> = {};
  for (const ing of ingredientsData) {
    const created = await prisma.ingredient.upsert({
      where: { code: ing.code },
      update: {
        stock: ing.stock,
        cost: ing.cost,
        minStock: ing.minStock,
      },
      create: ing,
    });
    ingredientMap[ing.name] = created;

    // Log initial ingredient stock
    await prisma.inventoryLog.create({
      data: {
        ingredientId: created.id,
        type: "IN",
        quantity: ing.stock,
        beforeQty: 0,
        afterQty: ing.stock,
        note: "Initial ingredient stock via system seed",
        userId: adminUser.id,
      },
    });
  }

  // 5. Seed Products & Associate Recipes
  const categoryMap = categories.reduce((acc, cat) => {
    acc[cat.name] = cat.id;
    return acc;
  }, {} as Record<string, number>);

  const productsData = [
    // Beverages
    { name: "Iced Latte", code: "BEV-001", price: 3.50, cost: 0.89, categoryId: categoryMap["Beverages"], recipe: [{ ing: "Espresso Beans", qty: 18 }, { ing: "Whole Milk", qty: 150 }, { ing: "Sugar Syrup", qty: 15 }] },
    { name: "Hot Americano", code: "BEV-002", price: 2.50, cost: 0.36, categoryId: categoryMap["Beverages"], recipe: [{ ing: "Espresso Beans", qty: 18 }] },
    { name: "Green Tea Frappe", code: "BEV-003", price: 4.00, cost: 1.56, categoryId: categoryMap["Beverages"], recipe: [{ ing: "Matcha Powder", qty: 15 }, { ing: "Whole Milk", qty: 120 }, { ing: "Sugar Syrup", qty: 10 }] },
    { name: "Coca Cola Canned", code: "BEV-004", price: 1.50, cost: 0.60, categoryId: categoryMap["Beverages"], recipe: [] },
    { name: "Mineral Water", code: "BEV-005", price: 1.00, cost: 0.30, categoryId: categoryMap["Beverages"], recipe: [] },
    
    // Snacks
    { name: "Chocolate Chip Cookie", code: "SNA-001", price: 2.00, cost: 0.70, categoryId: categoryMap["Snacks"], recipe: [{ ing: "Wheat Flour", qty: 50 }, { ing: "Unsalted Butter", qty: 20 }, { ing: "Chocolate Chips", qty: 25 }] },
    { name: "Potato Chips", code: "SNA-002", price: 1.80, cost: 0.90, categoryId: categoryMap["Snacks"], recipe: [] },

    // Main Course
    { name: "Club Sandwich", code: "FOD-001", price: 5.50, cost: 1.05, categoryId: categoryMap["Main Course"], recipe: [{ ing: "Toast Bread", qty: 3 }, { ing: "Cheese Slices", qty: 2 }] },
    { name: "Beef Burger", code: "FOD-002", price: 6.50, cost: 1.75, categoryId: categoryMap["Main Course"], recipe: [{ ing: "Beef Patty", qty: 1 }, { ing: "Cheese Slices", qty: 1 }, { ing: "Toast Bread", qty: 2 }] },
    { name: "Chicken Fried Rice", code: "FOD-004", price: 5.00, cost: 0.50, categoryId: categoryMap["Main Course"], recipe: [{ ing: "Jasmine Rice", qty: 200 }, { ing: "Unsalted Butter", qty: 15 }] },

    // Desserts
    { name: "New York Cheesecake", code: "DES-001", price: 4.50, cost: 0.95, categoryId: categoryMap["Desserts"], recipe: [{ ing: "Wheat Flour", qty: 40 }, { ing: "Unsalted Butter", qty: 30 }, { ing: "Whole Milk", qty: 100 }] },
    { name: "Chocolate Fudge Cake", code: "DES-002", price: 4.50, cost: 1.10, categoryId: categoryMap["Desserts"], recipe: [{ ing: "Wheat Flour", qty: 50 }, { ing: "Chocolate Chips", qty: 30 }] },

    // Merchandise
    { name: "Logo Mug Black", code: "MER-001", price: 12.00, cost: 5.00, categoryId: categoryMap["Merchandise"], recipe: [] },
    { name: "Logo T-Shirt White", code: "MER-002", price: 18.00, cost: 7.50, categoryId: categoryMap["Merchandise"], recipe: [] },
  ];

  for (const prod of productsData) {
    const hasRecipeToggle = Boolean(prod.recipe && prod.recipe.length > 0);
    let totalCost = 0;
    if (hasRecipeToggle) {
      for (const item of prod.recipe) {
        const ing = ingredientMap[item.ing];
        if (ing) {
          totalCost += item.qty * Number(ing.cost);
        }
      }
    }
    const finalCost = hasRecipeToggle && totalCost > 0 ? Number(totalCost.toFixed(2)) : prod.cost;

    const createdProduct = await prisma.product.upsert({
      where: { code: prod.code },
      update: {
        price: prod.price,
        cost: finalCost,
        stock: hasRecipeToggle ? 0 : 100,
        minStock: hasRecipeToggle ? 0 : 10,
        hasRecipe: hasRecipeToggle,
        categoryId: prod.categoryId,
      },
      create: {
        name: prod.name,
        code: prod.code,
        price: prod.price,
        cost: finalCost,
        stock: hasRecipeToggle ? 0 : 100,
        minStock: hasRecipeToggle ? 0 : 10,
        hasRecipe: hasRecipeToggle,
        categoryId: prod.categoryId,
      },
    });

    // Create recipe links
    if (prod.recipe && prod.recipe.length > 0) {
      for (const item of prod.recipe) {
        const ing = ingredientMap[item.ing];
        if (ing) {
          await prisma.productIngredient.upsert({
            where: {
              productId_ingredientId: {
                productId: createdProduct.id,
                ingredientId: ing.id,
              },
            },
            update: { quantity: item.qty },
            create: {
              productId: createdProduct.id,
              ingredientId: ing.id,
              quantity: item.qty,
            },
          });
        }
      }
    }
  }
  console.log("Seeded sample products with recipe ingredients.");

  // 6. Seed Customers
  const customersData = [
    { name: "Sok Dara", phone: "012345678", email: "dara@email.com", address: "Phnom Penh", points: 120 },
    { name: "Chan Leakhena", phone: "098765432", email: "leakhena@email.com", address: "Siem Reap", points: 340 },
    { name: "Keo Sophea", phone: "087654321", email: "sophea@email.com", address: "Battambang", points: 50 },
  ];

  for (const cust of customersData) {
    await prisma.customer.upsert({
      where: { phone: cust.phone },
      update: {},
      create: cust,
    });
  }
  console.log("Seeded sample customers.");

  // 7. Seed Discounts
  const discountsData = [
    { name: "Grand Opening (10% Off)", type: "PERCENT" as const, value: 10.00, minPurchase: 10.00, startDate: new Date("2026-06-01"), endDate: new Date("2026-12-31"), isActive: true },
    { name: "$5 Off Mega Deal", type: "FIXED" as const, value: 5.00, minPurchase: 30.00, startDate: new Date("2026-06-01"), endDate: new Date("2026-12-31"), isActive: true },
    { name: "Expired Summer Promo", type: "PERCENT" as const, value: 15.00, minPurchase: 15.00, startDate: new Date("2025-06-01"), endDate: new Date("2025-08-31"), isActive: false },
  ];

  for (const disc of discountsData) {
    const existing = await prisma.discount.findFirst({ where: { name: disc.name } });
    if (!existing) {
      await prisma.discount.create({ data: disc });
    }
  }
  console.log("Seeded active and expired discounts.");

  // 8. Seed Role Permissions
  console.log("Seeding role permissions...");
  const adminPages = ["/", "/pos", "/products", "/categories", "/ingredients", "/discounts", "/inventory", "/purchases", "/suppliers", "/customers", "/orders", "/reports", "/users", "/settings", "/roles"];
  const managerPages = ["/", "/pos", "/products", "/categories", "/ingredients", "/discounts", "/inventory", "/purchases", "/suppliers", "/customers", "/orders"];
  const cashierPages = ["/pos"];

  const rolePermissions = [
    { role: "ADMIN" as const, pages: adminPages },
    { role: "MANAGER" as const, pages: managerPages },
    { role: "CASHIER" as const, pages: cashierPages },
  ];

  for (const rp of rolePermissions) {
    await prisma.rolePermission.upsert({
      where: { role: rp.role },
      update: { pages: rp.pages },
      create: rp,
    });
  }
  console.log("Seeded role permissions.");

  console.log("Seeding completed successfully.");
}

main()
  .catch((e) => {
    console.error("Seeding error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
