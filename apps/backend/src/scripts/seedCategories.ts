import "dotenv/config";
import { connectDatabase, disconnectDatabase } from "../config/db.js";
import { CategoryModel } from "../features/categories/category.model.js";

const CATEGORIES = [
  { slug: "elderly-care", icon: "heart-plus", name: { en: "Elderly Care", de: "Altenpflege", es: "Cuidado de mayores" } },
  { slug: "gastronomy", icon: "utensils", name: { en: "Gastronomy", de: "Gastronomie", es: "Gastronomía" } },
  { slug: "pets", icon: "paw", name: { en: "Pets & Animals", de: "Haustiere & Co.", es: "Mascotas y animales" } },
  { slug: "beauty", icon: "sparkle", name: { en: "Beauty", de: "Kosmetik", es: "Belleza" } },
  { slug: "assistance", icon: "bag", name: { en: "Assistance", de: "Unterstützung", es: "Asistencia" } },
  { slug: "education", icon: "graduation-cap", name: { en: "Education", de: "Bildung", es: "Educación" } },
  { slug: "transport", icon: "truck", name: { en: "Transport", de: "Transport", es: "Transporte" } },
  { slug: "entertainment", icon: "headphones", name: { en: "Entertainment", de: "Unterhaltung", es: "Entretenimiento" } },
  { slug: "cleaning", icon: "spray", name: { en: "Cleaning", de: "Reinigung", es: "Limpieza" } },
  { slug: "security", icon: "shield", name: { en: "Security", de: "Sicherheit", es: "Seguridad" } },
  { slug: "repair", icon: "wrench", name: { en: "Repair", de: "Reperatur", es: "Reparación" } },
  { slug: "it", icon: "flag", name: { en: "IT", de: "IT", es: "TI" } },
  { slug: "gardening", icon: "plant", name: { en: "Gardening", de: "Gartenpflege", es: "Jardinería" } },
  { slug: "childcare", icon: "hand-heart", name: { en: "Childcare & Babysitting", de: "Kind- & Babysitting", es: "Cuidado infantil" } },
  { slug: "handyman", icon: "tools", name: { en: "Handyman", de: "Handwerk", es: "Manitas" } },
] as const;

async function run() {
  await connectDatabase();

  for (const [index, category] of CATEGORIES.entries()) {
    await CategoryModel.updateOne(
      { slug: category.slug },
      { $set: { ...category, order: index } },
      { upsert: true }
    );
  }

  console.log(`[seed] upserted ${CATEGORIES.length} categories`);
  await disconnectDatabase();
}

run().catch((err) => {
  console.error("[seed] failed:", err);
  process.exit(1);
});
