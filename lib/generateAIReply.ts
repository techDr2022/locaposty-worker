import OpenAI from "openai";
import { prisma } from "./prisma";
import { SentimentType } from "./generated/prisma";
import {
  ensureDefaultGlobalSettings,
  ensureDefaultGlobalTemplate,
} from "./createDefaultAITemplate";

// Initialize OpenAI
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/**
 * Generate AI reply for a review based on template settings
 * @param reviewId - The review ID to generate a reply for
 * @returns Promise<{success: boolean, replyId?: string, content?: string, error?: string}>
 */
export async function generateAIReply(
  reviewId: string,
  userId: string,
): Promise<{
  success: boolean;
  replyId?: string;
  content?: string;
  error?: string;
}> {
  try {
    console.log(`Generating AI reply for review: ${reviewId}`);

    // Fetch the review with location and user
    const review = await prisma.review.findUnique({
      where: { id: reviewId },
      include: {
        location: {
          include: {
            aiTemplates: true,
            googleAccount: {
              include: {
                user: true,
              },
            },
          },
        },
        replies: true, // Check if reply already exists
      },
    });

    if (!review) {
      throw new Error(`Review ${reviewId} not found`);
    }

    if (!userId) {
      throw new Error("User ID is required to generate AI reply");
    }

    // Find applicable AI template
    let template = null;

    // First, try to find a location-specific template owned by this user
    const locationTemplates = review.location.aiTemplates.filter(
      (t) => t.userId === userId,
    );
    if (locationTemplates.length > 0) {
      template =
        locationTemplates.find((t) => t.isDefault) || locationTemplates[0];
    }

    // If no location-specific template, use default global template
    if (!template) {
      template = await ensureDefaultGlobalTemplate(userId);
    }

    console.log(
      `Using template: ${template.name} (${template.locationId ? "location-specific" : "global"})`,
    );

    // Fetch reply settings for this location
    let replySettings = await prisma.locationReplySettings.findFirst({
      where: {
        userId,
        locationId: review.location.id,
      },
    });

    // If no location-specific settings, ensure default global settings exist
    if (!replySettings) {
      replySettings = await ensureDefaultGlobalSettings(userId);
    }

    console.log(
      `Using reply settings: ${replySettings.isGlobal ? "global" : "location-specific"}`,
    );

    // Note: Auto-reply enabled and rating threshold checks are now handled
    // in the route handler before calling postReplyToGoogle, not here.
    // This allows replies to be generated even if auto-post is disabled,
    // giving users the option to manually review and post them.

    // Determine sentiment if not already set
    let sentiment = review.sentiment;
    if (!sentiment && review.comment) {
      try {
        const sentimentAnalysis = await openai.chat.completions.create({
          model: "gpt-4o",
          messages: [
            {
              role: "system",
              content:
                "You analyze the sentiment of customer reviews. Respond with POSITIVE, NEUTRAL, or NEGATIVE only.",
            },
            {
              role: "user",
              content: `Analyze the sentiment of this review: "${review.comment}"`,
            },
          ],
        });

        const sentimentResult = sentimentAnalysis.choices[0].message.content
          ?.trim()
          .toUpperCase();
        sentiment = (sentimentResult as SentimentType) || SentimentType.NEUTRAL;

        // Update the review with the sentiment
        await prisma.review.update({
          where: { id: reviewId },
          data: { sentiment },
        });

        console.log(`Determined sentiment: ${sentiment}`);
      } catch (error) {
        console.error("Error determining sentiment:", error);
        sentiment = SentimentType.NEUTRAL; // Default fallback
      }
    }

    // Build the complete prompt with template settings
    const toneInstruction = template.tone
      ? `Tone: ${template.tone.toLowerCase()}`
      : "Tone: professional";
    const lengthInstruction = template.replyLength
      ? `Length: ${template.replyLength.toLowerCase()}`
      : "Length: medium";
    const languageInstruction = template.language
      ? `Language: ${template.language}`
      : "Language: English";

    // Select appropriate response style based on sentiment
    let responseStyle = template.customInstructions || "";
    if (
      sentiment === SentimentType.POSITIVE &&
      template.positiveResponseStyle
    ) {
      responseStyle = template.positiveResponseStyle;
    } else if (
      sentiment === SentimentType.NEGATIVE &&
      template.negativeResponseStyle
    ) {
      responseStyle = template.negativeResponseStyle;
    }
    // Build the complete prompt
    let fullPrompt = `
${responseStyle}

Instructions:
- reply only the reply text, no other text or markdown
- ${toneInstruction}
 - ${lengthInstruction == "Length: short" ? "Keep it concise: 2-3 sentences focusing on the key point." : lengthInstruction == "Length: medium" ? "Aim for 4-5 sentences with context and a clear next step." : "Provide 6–7 sentences with details, empathy, and specific next steps."}
- ${languageInstruction}
- Keep the reply professional and authentic
- Do not repeat the exact review content back to the customer
- Base your reply tone on the customer's comment sentiment (${sentiment || SentimentType.NEUTRAL}), NOT the star rating — the star rating and comment may conflict
- For negative reviews, be empathetic and offer solutions
- For positive reviews, express gratitude
`;

    // Add brand voice if available
    if (template.brandVoice) {
      fullPrompt += `\nBrand Voice: ${template.brandVoice}`;
    }

    fullPrompt += `

Review details:
Business: ${review.location.gmbLocationName || review.location.name}
Rating: ${review.rating}/5
Comment: "${review.comment || "No comment provided"}"
    `.trim();

    console.log("Full prompt:", fullPrompt);

    // Generate the reply using OpenAI
    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "user",
          content: fullPrompt,
        },
      ],
      max_tokens: 500,
      temperature: 0.7,
    });

    const generatedContent = completion.choices[0].message.content?.trim();
    if (!generatedContent) {
      throw new Error("Failed to generate reply content");
    }

    console.log(
      `Generated reply content: ${generatedContent.substring(0, 100)}...`,
    );

    // Upsert emulation (types may not include new unique yet): updateMany then create if none
    const updateResult = await prisma.reviewReply.updateMany({
      where: { reviewId: review.id },
      data: {
        content: generatedContent,
        source: "AI_GENERATED",
        isPublished: false,
        aiTemplateId: template.id,
        updatedAt: new Date(),
      },
    });

    if (updateResult.count === 0) {
      await prisma.reviewReply.create({
        data: {
          reviewId: review.id,
          content: generatedContent,
          source: "AI_GENERATED",
          isPublished: false,
          aiTemplateId: template.id,
        },
      });
    }

    const finalReply = await prisma.reviewReply.findFirst({
      where: { reviewId: review.id },
      orderBy: { createdAt: "desc" },
    });

    if (!finalReply) throw new Error("Failed to upsert review reply");

    console.log(`Upserted reply record: ${finalReply.id}`);

    return {
      success: true,
      replyId: finalReply.id,
      content: generatedContent,
    };
  } catch (error) {
    console.error(`Error generating AI reply for review ${reviewId}:`, error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Generate AI reply with custom template
 * @param reviewId - The review ID to generate a reply for
 * @param templateId - Custom template ID to use
 * @returns Promise<{success: boolean, replyId?: string, content?: string, error?: string}>
 */
export async function generateAIReplyWithTemplate(
  reviewId: string,
  templateId: string,
  userId: string,
): Promise<{
  success: boolean;
  replyId?: string;
  content?: string;
  error?: string;
}> {
  try {
    console.log(
      `Generating AI reply for review: ${reviewId} with template: ${templateId}`,
    );

    // Fetch the review with location
    const review = await prisma.review.findUnique({
      where: { id: reviewId },
      include: {
        location: {
          include: {
            googleAccount: {
              include: {
                user: true,
              },
            },
          },
        },
      },
    });

    if (!review) {
      throw new Error(`Review ${reviewId} not found`);
    }

    if (!userId) {
      throw new Error("User ID is required to generate AI reply");
    }

    // Fetch the specific template (owned by the user)
    const template = await prisma.aIReplyTemplate.findFirst({
      where: {
        id: templateId,
        userId,
      },
    });

    if (!template) {
      throw new Error("Template not found or access denied");
    }

    // Determine sentiment if not already set
    let sentiment = review.sentiment;
    if (!sentiment && review.comment) {
      try {
        const sentimentAnalysis = await openai.chat.completions.create({
          model: "gpt-4o",
          messages: [
            {
              role: "system",
              content:
                "You analyze the sentiment of customer reviews. Respond with POSITIVE, NEUTRAL, or NEGATIVE only.",
            },
            {
              role: "user",
              content: `Analyze the sentiment of this review: "${review.comment}"`,
            },
          ],
        });

        const sentimentResult = sentimentAnalysis.choices[0].message.content
          ?.trim()
          .toUpperCase();
        sentiment = (sentimentResult as SentimentType) || SentimentType.NEUTRAL;

        await prisma.review.update({
          where: { id: reviewId },
          data: { sentiment },
        });
      } catch (error) {
        console.error("Error determining sentiment:", error);
        sentiment = SentimentType.NEUTRAL;
      }
    }

    // Build the complete prompt with template settings
    const toneInstruction = template.tone
      ? `Tone: ${template.tone.toLowerCase()}`
      : "Tone: professional";
    const lengthInstruction = template.replyLength
      ? `Length: ${template.replyLength.toLowerCase()}`
      : "Length: medium";
    const languageInstruction = template.language
      ? `Language: ${template.language}`
      : "Language: English";

    let responseStyle = template.customInstructions || "";
    if (
      sentiment === SentimentType.POSITIVE &&
      template.positiveResponseStyle
    ) {
      responseStyle = template.positiveResponseStyle;
    } else if (
      sentiment === SentimentType.NEGATIVE &&
      template.negativeResponseStyle
    ) {
      responseStyle = template.negativeResponseStyle;
    }

    let fullPrompt = `
${responseStyle}

Instructions:
- reply only the reply text, no other text or markdown
- ${toneInstruction}
 - ${lengthInstruction == "Length: short" ? "Keep it concise: 2-3 sentences focusing on the key point." : lengthInstruction == "Length: medium" ? "Aim for 4-6 sentences with context and a clear next step." : "Provide 7-8 sentences with details, empathy, and specific next steps."}
- ${languageInstruction}
- Keep the reply professional and authentic
- Do not repeat the exact review content back to the customer
- Base your reply tone on the customer's comment sentiment (${sentiment || SentimentType.NEUTRAL}), NOT the star rating — the star rating and comment may conflict
- For negative reviews, be empathetic and offer solutions
- For positive reviews, express gratitude and invite them back
`.trim();

    if (template.brandVoice) {
      fullPrompt += `\nBrand Voice: ${template.brandVoice}`;
    }

    fullPrompt += `

Review details:
Business: ${review.location.gmbLocationName || review.location.name}
Rating: ${review.rating}/5
Comment: "${review.comment || "No comment provided"}"
    `.trim();

    // Generate the reply
    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "user",
          content: fullPrompt,
        },
      ],
      max_tokens: 500,
      temperature: 0.7,
    });

    const generatedContent = completion.choices[0].message.content?.trim();
    if (!generatedContent) {
      throw new Error("Failed to generate reply content");
    }

    // Upsert reply for this review
    const updateResult = await prisma.reviewReply.updateMany({
      where: { reviewId: review.id },
      data: {
        content: generatedContent,
        source: "AI_GENERATED",
        isPublished: false,
        aiTemplateId: template.id,
        updatedAt: new Date(),
      },
    });

    if (updateResult.count === 0) {
      await prisma.reviewReply.create({
        data: {
          reviewId: review.id,
          content: generatedContent,
          source: "AI_GENERATED",
          isPublished: false,
          aiTemplateId: template.id,
        },
      });
    }

    const finalReply = await prisma.reviewReply.findFirst({
      where: { reviewId: review.id },
      orderBy: { createdAt: "desc" },
    });

    if (!finalReply)
      throw new Error("Failed to upsert review reply with template");

    return {
      success: true,
      replyId: finalReply.id,
      content: generatedContent,
    };
  } catch (error) {
    console.error(
      `Error generating AI reply with template for review ${reviewId}:`,
      error,
    );
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}
