import "dotenv/config";
import { connectDatabase, disconnectDatabase } from "../config/db.js";
import { CategoryModel } from "../features/categories/category.model.js";

const CATEGORIES = [
  { slug: "elderly-care", icon: "heart-plus", name: { en: "Elderly Care", de: "Altenpflege", es: "Cuidado de mayores", fr: "Soins aux personnes âgées" } },
  { slug: "gastronomy", icon: "utensils", name: { en: "Gastronomy", de: "Gastronomie", es: "Gastronomía", fr: "Gastronomie" } },
  { slug: "pets", icon: "paw", name: { en: "Pets & Animals", de: "Haustiere & Co.", es: "Mascotas y animales", fr: "Animaux de compagnie" } },
  { slug: "beauty", icon: "sparkle", name: { en: "Beauty", de: "Kosmetik", es: "Belleza", fr: "Beauté" } },
  { slug: "assistance", icon: "bag", name: { en: "Assistance", de: "Unterstützung", es: "Asistencia", fr: "Assistance" } },
  { slug: "education", icon: "graduation-cap", name: { en: "Education", de: "Bildung", es: "Educación", fr: "Éducation" } },
  { slug: "transport", icon: "truck", name: { en: "Transport", de: "Transport", es: "Transporte", fr: "Transport" } },
  { slug: "entertainment", icon: "headphones", name: { en: "Entertainment", de: "Unterhaltung", es: "Entretenimiento", fr: "Divertissement" } },
  { slug: "cleaning", icon: "spray", name: { en: "Cleaning", de: "Reinigung", es: "Limpieza", fr: "Nettoyage" } },
  { slug: "security", icon: "shield", name: { en: "Security", de: "Sicherheit", es: "Seguridad", fr: "Sécurité" } },
  { slug: "repair", icon: "wrench", name: { en: "Repair", de: "Reperatur", es: "Reparación", fr: "Réparation" } },
  { slug: "it", icon: "flag", name: { en: "IT", de: "IT", es: "TI", fr: "Informatique" } },
  { slug: "gardening", icon: "plant", name: { en: "Gardening", de: "Gartenpflege", es: "Jardinería", fr: "Jardinage" } },
  { slug: "childcare", icon: "hand-heart", name: { en: "Childcare & Babysitting", de: "Kind- & Babysitting", es: "Cuidado infantil", fr: "Garde d'enfants et baby-sitting" } },
  { slug: "handyman", icon: "tools", name: { en: "Handyman", de: "Handwerk", es: "Manitas", fr: "Bricolage" } },
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
