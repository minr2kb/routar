// The store owns its own shapes — the routar services validate the wire format
// independently (schema-first), so the backend isn't coupled to a client type.
type Product = { id: number; name: string; price: number; categoryId: number };
type Category = { id: number; name: string };

// globalThis prevents state reset on Next.js hot-reload in dev.
const g = globalThis as typeof globalThis & {
  __catProducts?: Product[];
  __catCategories?: Category[];
  __catNextId?: number;
};

if (!g.__catProducts) {
  g.__catCategories = [
    { id: 1, name: "Keyboards" },
    { id: 2, name: "Mice" },
    { id: 3, name: "Monitors" },
  ];
  g.__catProducts = [
    { id: 1, name: "Split mechanical keyboard", price: 180, categoryId: 1 },
    { id: 2, name: "Low-profile keyboard", price: 120, categoryId: 1 },
    { id: 3, name: "Vertical ergonomic mouse", price: 70, categoryId: 2 },
    { id: 4, name: "Trackball mouse", price: 90, categoryId: 2 },
    { id: 5, name: "27-inch 4K monitor", price: 450, categoryId: 3 },
    { id: 6, name: "Ultrawide monitor", price: 700, categoryId: 3 },
  ];
  g.__catNextId = 7;
}

const products = g.__catProducts!;
export const categories = g.__catCategories!;

export function listProducts(categoryId?: number): Product[] {
  return categoryId ? products.filter((p) => p.categoryId === categoryId) : products.slice();
}

export function searchProducts(q: string, page = 1, limit = 5): Product[] {
  const hits = products.filter((p) => p.name.toLowerCase().includes(q.toLowerCase()));
  return hits.slice((page - 1) * limit, (page - 1) * limit + limit);
}

export function getProduct(id: number): Product | undefined {
  return products.find((p) => p.id === id);
}

export function createProduct(data: Omit<Product, "id">): Product {
  const product = { id: g.__catNextId!++, ...data };
  products.push(product);
  return product;
}

export function updateProduct(id: number, patch: Partial<Omit<Product, "id">>): Product | null {
  const p = products.find((x) => x.id === id);
  if (!p) return null;
  Object.assign(p, patch);
  return p;
}

export function deleteProduct(id: number): boolean {
  const i = products.findIndex((p) => p.id === id);
  if (i === -1) return false;
  products.splice(i, 1);
  return true;
}
