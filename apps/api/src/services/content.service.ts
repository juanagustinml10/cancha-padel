import type { Faq, GalleryImage, Promotion } from '@padel/shared';
import { prisma } from '@/infra/prisma';

export async function getFaqs(): Promise<Faq[]> {
  const faqs = await prisma.faq.findMany({
    where: { isActive: true },
    orderBy: { sortOrder: 'asc' },
  });
  return faqs.map((faq) => ({
    id: faq.id,
    question: faq.question,
    answer: faq.answer,
  }));
}

export async function getGallery(): Promise<GalleryImage[]> {
  const images = await prisma.galleryImage.findMany({ orderBy: { sortOrder: 'asc' } });
  return images.map((image) => ({
    id: image.id,
    url: image.url,
    alt: image.alt ?? '',
    sortOrder: image.sortOrder,
  }));
}

export async function getPromotions(): Promise<Promotion[]> {
  const promotions = await prisma.promotion.findMany({
    where: { isActive: true },
    orderBy: { sortOrder: 'asc' },
  });
  return promotions.map((promotion) => ({
    id: promotion.id,
    title: promotion.title,
    description: promotion.description,
    badge: promotion.badge ?? undefined,
    isActive: promotion.isActive,
  }));
}
