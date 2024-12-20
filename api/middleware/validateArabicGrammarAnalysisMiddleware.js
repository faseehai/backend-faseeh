const checkArabicGrammar = require("../utils/checkArabicGrammarForGrammarAnalysis");
const arabicRegex =
  /^[\u0600-\u06FF\s\u0750-\u077F\u08A0-\u08FF\u0660-\u0669.,؟،؛!(){}[\]«»"'\u064B-\u0652]*$/;
const WatsonXService = require("../services/watsonxService");
const MAX_CHAR_LIMIT = 150;
function extendInput(input) {
  return input.length < 10 ? input.repeat(2) : input;
}

// Helper function to apply corrections based on suggestions
function applyCorrections(text, suggestions) {
  let correctedText = text;
  // Sort suggestions by offset in descending order to avoid conflicts in index adjustment
  suggestions.sort((a, b) => b.offset - a.offset);

  suggestions.forEach((suggestion) => {
    if (suggestion.replacements && suggestion.replacements.length > 0) {
      // Use the first replacement suggestion for simplicity
      const replacement = suggestion.replacements[0];

      // Apply replacement in the text
      correctedText =
        correctedText.slice(0, suggestion.offset) +
        replacement +
        correctedText.slice(suggestion.offset + suggestion.length);
    }
  });

  return correctedText;
}

async function validateArabicGrammarAnalysisMiddleware(req, res, next) {
  try {
    const { content } = req.body;

    console.log("Received Grammar Analysis Input:", content);

    if (!content || content.trim() === "") {
      return res.status(200).json({
        status: "error",
        generated_text: "النص المدخل فارغ. الرجاء إدخال نص صالح.",
      });
    }
    if (content.length > MAX_CHAR_LIMIT) {
      return res.status(200).json({
        status: "error",
        generated_text: `النص المدخل طويل جدًا. يجب ألا يزيد عن ${MAX_CHAR_LIMIT} حرفًا.`,
      });
    }
    if (/^\d+$/.test(content.trim())) {
      return res.status(200).json({
        status: "error",
        generated_text: "الإدخال ليس نصًا. الرجاء إدخال نص صالح.",
      });
    }

    const isShortText =
      content.trim().split(/\s+/).length < 3 || content.length < 10;
    let isArabic;

    if (isShortText) {
      isArabic = arabicRegex.test(content);
    } else {
      const { franc } = await import("franc-all");
      const processedText = extendInput(content);
      const detectedLang = franc(processedText);
      isArabic = detectedLang === "arb";
    }

    if (!isArabic) {
      return res.status(200).json({
        status: "error",
        generated_text: "الإدخال المقدم ليس باللغة العربية.",
      });
    }

    if (!arabicRegex.test(content)) {
      return res.status(200).json({
        status: "error",
        generated_text: "النص يحتوي على رموز أو أحرف غير مسموح بها.",
      });
    }

    // Perform grammar and spelling check
    const {
      valid,
      suggestions,
      completenessIssues,
      diacriticIssues,
      verbSubjectIssues,
      wordOrderIssues,
    } = await checkArabicGrammar(content);

    if (!valid) {
      const correctedText = applyCorrections(content, suggestions);

      return res.status(200).json({
        status: "success",
        generated_text: correctedText,
        issues: {
          completenessIssues,
          diacriticIssues,
          verbSubjectIssues,
          wordOrderIssues,
        },
        suggestions: suggestions.map((s) => ({
          message: s.message,
          incorrect_text: s.incorrect_text,
          offset: s.offset,
          replacements:
            s.replacements.length > 0
              ? s.replacements
              : ["No suggestions available"],
        })),
      });
    }

    const generatedResult =
      await WatsonXService.generateGrammaticalAnalysisText({
        content,
      });

    return res.status(200).json({
      status: "success",
      generated_text: generatedResult.generated_text,
    });
  } catch (error) {
    console.error("Error in validateArabicGrammarAnalysisMiddleware:", error);
    return res.status(500).json({
      status: "error",
      generated_text: "حدث خطأ أثناء معالجة الطلب. الرجاء المحاولة لاحقًا.",
    });
  }
}

module.exports = validateArabicGrammarAnalysisMiddleware;
