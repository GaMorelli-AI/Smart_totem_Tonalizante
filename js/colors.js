// Fonte de verdade da INTERFACE para os tonalizantes Bio Extratus.
// Baseado em "Catálogo Tonalizantes.pdf" (19 tonalizantes) e na paleta
// visual de "Cartela_de_Cores_atualizada.pdf".
//
// IMPORTANTE: isto é usado apenas para desenhar a interface (nome, imagem,
// categoria). A cor final aplicada pela IA é sempre resolvida no backend
// (api/generate.js), que possui sua própria whitelist e nunca confia no
// nome enviado pelo frontend.

export const CATEGORIES = [
  { id: 'todos', label: 'Todos' },
  { id: 'naturais', label: 'Naturais' },
  { id: 'acinzentados', label: 'Acinzentados' },
  { id: 'chocolate-dourados', label: 'Chocolate e Dourados' },
  { id: 'vermelhos-acobreados', label: 'Vermelhos e Acobreados' },
  { id: 'especiais', label: 'Especiais' },
];

export const TONALIZANTES = [
  { code: '10', name: 'Preto', category: 'naturais' },
  { code: '111', name: 'Preto Azulado', category: 'naturais' },
  { code: '30', name: 'Castanho Escuro', category: 'naturais' },
  { code: '40', name: 'Castanho Médio', category: 'naturais' },
  { code: '50', name: 'Castanho Claro', category: 'naturais' },
  { code: '60', name: 'Louro Escuro', category: 'naturais' },
  { code: '70', name: 'Louro Médio', category: 'naturais' },
  { code: '80', name: 'Louro Claro', category: 'naturais' },
  { code: '90', name: 'Louro Muito Claro', category: 'naturais' },
  { code: '61', name: 'Louro Escuro Acinzentado', category: 'acinzentados' },
  { code: '71', name: 'Louro Médio Acinzentado', category: 'acinzentados' },
  { code: '81', name: 'Louro Claro Acinzentado', category: 'acinzentados' },
  { code: '67', name: 'Louro Escuro Chocolate', category: 'chocolate-dourados' },
  { code: '77', name: 'Louro Médio Chocolate', category: 'chocolate-dourados' },
  { code: '63', name: 'Louro Escuro Dourado', category: 'chocolate-dourados' },
  { code: '466', name: 'Castanho Médio Vermelho Intenso', category: 'vermelhos-acobreados' },
  { code: '84', name: 'Louro Claro Acobreado', category: 'vermelhos-acobreados' },
  { code: '666', name: 'Louro Escuro Vermelho Intenso', category: 'vermelhos-acobreados' },
  { code: '626', name: 'Marsala', category: 'especiais' },
].map((item) => ({
  ...item,
  productImage: `assets/products/${item.code}.webp`,
}));

export function getTonalizanteByCode(code) {
  return TONALIZANTES.find((item) => item.code === code) || null;
}

export function getTonalizantesByCategory(categoryId) {
  if (!categoryId || categoryId === 'todos') return TONALIZANTES;
  return TONALIZANTES.filter((item) => item.category === categoryId);
}
