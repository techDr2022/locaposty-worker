import { prisma } from "./prisma";
import { ReplyTone, ReplyLength } from "./generated/prisma";

interface CreateDefaultTemplateParams {
  userId: string;
  locationId?: string;
  name?: string;
}

/**
 * Creates a default AI reply template with sensible defaults
 */
export async function createDefaultAITemplate({
  userId,
  locationId,
  name = "Default Auto Reply Template",
}: CreateDefaultTemplateParams) {
  const defaultTemplate = await prisma.aIReplyTemplate.create({
    data: {
      userId,
      locationId: locationId || null,
      name,
      tone: ReplyTone.PROFESSIONAL,
      language: "en",
      replyLength: ReplyLength.MEDIUM,
      customInstructions: `Generate professional and friendly replies to customer reviews. 
- Keep responses genuine and personalized
- Address specific points mentioned in the review
- Maintain a professional yet warm tone
- Show appreciation for feedback`,
      brandVoice: "Professional, friendly, and customer-focused",
      positiveResponseStyle: `Express genuine gratitude. Highlight specific details from the review. Invite them to return and offer to go above and beyond in future visits.`,
      negativeResponseStyle: `Acknowledge the concern sincerely. Apologize for the experience. Offer to make things right. Provide a direct way to reach out privately. Focus on resolution and improvement.`,
      isDefault: true, // Always true since there's only one template per location
    },
  });

  return defaultTemplate;
}

/**
 * Ensure default global reply settings exist for a user
 */
export async function ensureDefaultGlobalSettings(userId: string) {
  const existingSettings = await prisma.locationReplySettings.findFirst({
    where: {
      userId,
      isGlobal: true,
    },
  });

  if (!existingSettings) {
    const defaultSettings = await prisma.locationReplySettings.create({
      data: {
        userId,
        locationId: null,
        autoReplyEnabled: false, // OFF by default
        autoReplyDelayMins: 0,
        minStarReply: 5,
        maxStarReply: 5,
        isGlobal: true,
      },
    });

    console.log(`Created default global settings for user ${userId}`);
    return defaultSettings;
  }

  return existingSettings;
}

/**
 * Ensure default global AI template exists for a user
 */
export async function ensureDefaultGlobalTemplate(userId: string) {
  const existingTemplate = await prisma.aIReplyTemplate.findFirst({
    where: {
      userId,
      locationId: null,
      isDefault: true,
    },
  });

  if (!existingTemplate) {
    const defaultTemplate = await createDefaultAITemplate({
      userId,
      locationId: undefined, // Global template
      name: "Default Auto Reply Template",
    });

    console.log(`Created default global AI template for user ${userId}`);
    return defaultTemplate;
  }

  return existingTemplate;
}
