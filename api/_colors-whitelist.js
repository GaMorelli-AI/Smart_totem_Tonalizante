// Whitelist de tonalizantes usada EXCLUSIVAMENTE pelo backend.
//
// Propositalmente separada de js/colors.js (frontend): o servidor nunca
// confia em nome/imagem enviados pelo cliente — apenas no `colorCode`,
// que é resolvido aqui para o nome oficial e a imagem de referência real
// usada pela IA.

export const ALLOWED_COLORS = {
  '10': { name: 'Preto', referenceImage: 'assets/colors/10.webp' },
  '111': { name: 'Preto Azulado', referenceImage: 'assets/colors/111.webp' },
  '30': { name: 'Castanho Escuro', referenceImage: 'assets/colors/30.webp' },
  '40': { name: 'Castanho Médio', referenceImage: 'assets/colors/40.webp' },
  '50': { name: 'Castanho Claro', referenceImage: 'assets/colors/50.webp' },
  '60': { name: 'Louro Escuro', referenceImage: 'assets/colors/60.webp' },
  '70': { name: 'Louro Médio', referenceImage: 'assets/colors/70.webp' },
  '80': { name: 'Louro Claro', referenceImage: 'assets/colors/80.webp' },
  '90': { name: 'Louro Muito Claro', referenceImage: 'assets/colors/90.webp' },
  '61': { name: 'Louro Escuro Acinzentado', referenceImage: 'assets/colors/61.webp' },
  '71': { name: 'Louro Médio Acinzentado', referenceImage: 'assets/colors/71.webp' },
  '81': { name: 'Louro Claro Acinzentado', referenceImage: 'assets/colors/81.webp' },
  '67': { name: 'Louro Escuro Chocolate', referenceImage: 'assets/colors/67.webp' },
  '77': { name: 'Louro Médio Chocolate', referenceImage: 'assets/colors/77.webp' },
  '63': { name: 'Louro Escuro Dourado', referenceImage: 'assets/colors/63.webp' },
  '466': { name: 'Castanho Médio Vermelho Intenso', referenceImage: 'assets/colors/466.webp' },
  '84': { name: 'Louro Claro Acobreado', referenceImage: 'assets/colors/84.webp' },
  '666': { name: 'Louro Escuro Vermelho Intenso', referenceImage: 'assets/colors/666.webp' },
  '626': { name: 'Marsala', referenceImage: 'assets/colors/626.webp' },
};
