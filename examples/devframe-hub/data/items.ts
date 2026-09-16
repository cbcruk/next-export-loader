export interface Item {
  id: string;
  title: string;
  description: string;
}

const ITEMS: Item[] = [
  { id: '1', title: 'Apple', description: 'A crisp, sweet fruit.' },
  { id: '2', title: 'Banana', description: 'A soft, yellow fruit.' },
  { id: '3', title: 'Cherry', description: 'A small, red stone fruit.' },
  { id: '4', title: 'Durian', description: 'A spiky fruit with strong aroma.' },
  { id: '5', title: 'Elderberry', description: 'A tiny, dark purple berry.' },
];

export async function fetchItems(): Promise<Item[]> {
  await new Promise((resolve) => setTimeout(resolve, 500));
  return ITEMS;
}
