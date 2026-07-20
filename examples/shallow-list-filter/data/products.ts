export interface Product {
  id: string;
  name: string;
  category: 'fruit' | 'veg' | 'grain';
  price: number;
}

const PRODUCTS: Product[] = [
  { id: '1', name: 'Apple', category: 'fruit', price: 3 },
  { id: '2', name: 'Banana', category: 'fruit', price: 2 },
  { id: '3', name: 'Cherry', category: 'fruit', price: 8 },
  { id: '4', name: 'Carrot', category: 'veg', price: 1 },
  { id: '5', name: 'Broccoli', category: 'veg', price: 4 },
  { id: '6', name: 'Spinach', category: 'veg', price: 5 },
  { id: '7', name: 'Rice', category: 'grain', price: 6 },
  { id: '8', name: 'Oats', category: 'grain', price: 3 },
  { id: '9', name: 'Barley', category: 'grain', price: 7 },
];

/** Simulated network latency so the initial loader is visibly a real load. */
export async function fetchProducts(): Promise<Product[]> {
  await new Promise((resolve) => setTimeout(resolve, 500));
  return PRODUCTS;
}
