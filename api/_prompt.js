// Monta o prompt enviado ao Nano Banana Pro. A regra central nunca muda:
// SÓ ALTERAR O CABELO — tudo o mais da foto original deve ser preservado.

export function buildPrompt(colorName, colorCode) {
  return `Edit the first image using the second image exclusively as a hair-color reference.

Change ONLY the existing hair color of the person in the first image to the Bio Extratus hair shade:

Shade: ${colorName}
Reference code: ${colorCode}

The second image represents the desired hair-color reference only.

Preserve the person's identity exactly.

Do not modify:
- face
- facial proportions
- facial features
- eyes
- eyebrows
- eyelashes
- nose
- mouth
- teeth
- ears
- skin tone
- skin texture
- makeup
- body
- clothes
- jewelry
- background
- camera angle
- image framing

Preserve the existing:
- hairstyle
- hair length
- haircut
- volume
- curls
- waves
- straightness
- hair texture
- parting

Modify only the hair pigmentation.

Apply the requested shade realistically to the person's existing hair.

Preserve individual hair strands, realistic highlights, shadows, reflections, depth, texture and lighting.

The hair should look naturally and professionally tonalized, not digitally painted.

Respect the lighting conditions of the original photograph.

Do not replace the hairstyle.

Do not copy the person, face, hairstyle, pose, background or composition from the reference image.

The reference image is ONLY a color reference.

Maintain photorealism.

The final image must look like the exact same photograph and exact same person, with only their hair pigmentation realistically changed.`;
}
