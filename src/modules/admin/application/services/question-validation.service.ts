/* eslint-disable no-case-declarations */
/* eslint-disable no-useless-escape */
/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
// import { Injectable } from '@nestjs/common';
// import { ValidationRule } from 'src/shared/enums';
// import { QuestionType } from 'src/modules/assessment/enums/question-type.enum';

// @Injectable()
// export class QuestionValidationService {
//   /**
//    * ✅ FIXED: Enhanced auto-detection with better pattern matching
//    */
//   detectValidationRule(questionText: string): ValidationRule {
//     // const questionLower = questionText.toLowerCase().trim();
//     const questionLower = questionText
//       .replace(/[’‘]/g, "'")
//       .trim()
//       .toLowerCase();

//     // ✅ 0. SKIP NON-VALIDATION PHRASES (add this block)
//     if (
//       /\bnot\s*applicable\b|\bnone\s*of\s*the\s*above\b/i.test(questionLower)
//     ) {
//       return ValidationRule.NONE;
//     }

//     // ✅ PRIORITY ORDER MATTERS - More specific patterns first!

//     // 1. EMAIL DETECTION (most specific first)
//     const emailPatterns = [
//       /\bemail\s*address\b/i,
//       /\be-mail\s*address\b/i,
//       /\belectronic\s*mail\b/i,
//       /\bmail\s*address\b/i,
//       /\bemail\s*id\b/i,
//       /\be-?mail\b/i,
//     ];

//     if (emailPatterns.some((pattern) => pattern.test(questionLower))) {
//       return ValidationRule.EMAIL;
//     }

//     // 2. PHONE DETECTION (before number detection!)
//     const phonePatterns = [
//       /\bphone\s*number\b/i,
//       /\bmobile\s*number\b/i,
//       /\btelephone\s*number\b/i,
//       /\bcontact\s*number\b/i,
//       /\bcell\s*number\b/i,
//       /\bcellphone\b/i,
//       /\bwhatsapp\s*number\b/i,
//       /\bphone\b/i,
//       /\bmobile\b/i,
//       /\btelephone\b/i,
//       /\bcall\s*number\b/i,
//     ];

//     if (phonePatterns.some((pattern) => pattern.test(questionLower))) {
//       return ValidationRule.PHONE;
//     }

//     // 3. URL/WEBSITE DETECTION (before generic patterns)
//     const urlPatterns = [
//       /\bwebsite\s*url\b/i,
//       /\bweb\s*address\b/i,
//       /\bsite\s*url\b/i,
//       /\bhomepage\b/i,
//       /\bportfolio\s*link\b/i,
//       /\bwebsite\b/i,
//       /\burl\b/i,
//       /\blink\b/i,
//       /\blinkedin\s*profile\b/i,
//       /\bgithub\s*profile\b/i,
//       /\bsocial\s*media\s*link\b/i,
//     ];

//     if (urlPatterns.some((pattern) => pattern.test(questionLower))) {
//       return ValidationRule.URL;
//     }

//     // 4. ALPHABETIC DETECTION (names, countries, cities - NOT generic fields)
//     const alphabeticPatterns = [
//       /\b(first|last|full|middle|contact|person|business|organization|company)\s*name\b/i,
//       /\bcountry\b/i, // ✅ Changed from "country name" to just "country"
//       /\bcity\s*name\b/i,
//       /\bstate\s*name\b/i,
//       /\bnationality\b/i,
//     ];

//     if (alphabeticPatterns.some((pattern) => pattern.test(questionLower))) {
//       return ValidationRule.ALPHABETS_ONLY;
//     }

//     // 5. AGE/NUMERIC DETECTION (specific age/numeric questions)
//     const numberPatterns = [
//       /\bage\b/i,
//       /\byears?\s*old\b/i,
//       /\bhow\s*old\b/i,
//       /\bnumber\s*of\s*(years|months|days|items|employees|staff|branches|members)\b/i,
//       /\bhow\s*many\s*(years|months|employees|staff|items|branches|members)\b/i,
//       /\bquantity\b/i,
//       /\bamount\b/i,
//       /\bcount\s*of\b/i,
//       /\btotal\b/i,
//       /\bscore\b/i,
//       /\brating\b/i,
//       /(foundation|founding|established|founded|started|registration)['’]?\s*year/i,
//       /\byear\s*(of\s*)?(foundation|founding|established|founded|started|registration)/i,
//     ];

//     if (numberPatterns.some((pattern) => pattern.test(questionLower))) {
//       return ValidationRule.NUMBER_ONLY;
//     }

//     // ✅ DEFAULT: No validation if pattern doesn't match
//     return ValidationRule.NONE;
//     ('');
//     // Default rule
//     // const detectedRule = ValidationRule.NONE;

//     // return detectedRule;
//   }

//   /**
//    * ✅ FIXED: Enhanced validation with better regex and error messages
//    */
//   generateFrontendValidation(question: any): any {
//     const validationRule =
//       question.manual_validation ||
//       question.auto_validation ||
//       ValidationRule.NONE;
//     const params = question.validation_params || {};

//     const validation: any = {
//       required: question.is_required || false,
//       rules: [],
//     };

//     // Type-specific validations
//     switch (question.type) {
//       case QuestionType.MODULE_TITLE:
//         if (question.is_required) {
//           validation.rules.push({
//             type: 'required_selection',
//             message: 'Please select an option',
//           });
//         }
//         break;

//       case QuestionType.CHECKBOX:
//         if (question.is_required) {
//           validation.rules.push({
//             type: 'required_selection',
//             message: 'Please select at least one option',
//           });
//         }
//         if (question.min_selections && question.min_selections > 0) {
//           validation.rules.push({
//             type: 'min_selections',
//             value: question.min_selections,
//             message: `Please select at least ${question.min_selections} option(s)`,
//           });
//         }
//         break;

//       case QuestionType.DROPDOWN:
//         if (question.is_required) {
//           validation.rules.push({
//             type: 'required_selection',
//             message: 'Please select an option from the dropdown',
//           });
//         }
//         break;

//       case QuestionType.MULTIPLE_CHOICE_GRID:
//         if (question.is_required) {
//           validation.rules.push({
//             type: 'required_grid',
//             message: 'Please answer all rows in the grid',
//             gridRows: question.grid_rows?.map((row) => row.id) || [],
//           });
//         }
//         break;

//       case QuestionType.FILE_UPLOAD:
//         if (question.is_required) {
//           validation.rules.push({
//             type: 'required_file',
//             message: 'Please upload a file',
//           });
//         }
//         if (question.accepted_file_types?.length > 0) {
//           validation.rules.push({
//             type: 'file_type',
//             value: question.accepted_file_types,
//             message: `Only ${question.accepted_file_types.join(', ')} files are allowed`,
//           });
//         }
//         break;
//     }

//     // ✅ FIXED: Text-based validation rules with enhanced regex and messages
//     if (
//       question.type === QuestionType.SHORT_TEXT ||
//       question.type === QuestionType.LONG_TEXT
//     ) {
//       switch (validationRule) {
//         case ValidationRule.EMAIL:
//           validation.rules.push({
//             type: 'email',
//             message:
//               params.error_message ||
//               'Please enter a valid email address (e.g., user@example.com)',
//             pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
//           });
//           break;

//         case ValidationRule.PHONE:
//           validation.rules.push({
//             type: 'phone',
//             message:
//               params.error_message ||
//               'Please enter a valid phone number (e.g., +2348012345678 or 08012345678)',
//             // ✅ FIXED: Enhanced regex to support Nigerian and international formats
//             pattern: /^(\+?\d{1,4}[\s-]?)?(\(?\d{1,4}\)?[\s-]?)?\d{7,15}$/,
//           });
//           break;

//         case ValidationRule.URL:
//           validation.rules.push({
//             type: 'url',
//             message:
//               params.error_message ||
//               'Please enter a valid website URL (e.g., https://example.com or www.example.com)',
//             // ✅ FIXED: More flexible URL regex
//             pattern:
//               /^(https?:\/\/)?(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)$/,
//           });
//           break;

//         case ValidationRule.NUMBER_ONLY:
//           validation.rules.push({
//             type: 'number',
//             message:
//               params.error_message ||
//               'Please enter numbers only (e.g., 25, 1000)',
//             pattern: /^\d+$/,
//           });
//           break;

//         case ValidationRule.ALPHABETS_ONLY:
//           validation.rules.push({
//             type: 'alphabets',
//             message:
//               params.error_message ||
//               'Please enter letters only (no numbers or special characters)',
//             // ✅ FIXED: Allow spaces and basic punctuation
//             pattern: /^[a-zA-Z\s'-]+$/,
//           });
//           break;
//       }

//       // Add length validations for text fields
//       if (params.min_character) {
//         validation.rules.push({
//           type: 'min_character',
//           value: params.min_character,
//           message: `Minimum ${params.min_character} characters required`,
//         });
//       }

//       if (params.max_character) {
//         validation.rules.push({
//           type: 'max_character',
//           value: params.max_character,
//           message: `Maximum ${params.max_character} characters allowed`,
//         });
//       }
//     }

//     return validation;
//   }

//   /**
//    * Get suggested placeholder text based on validation rule
//    */
//   getSuggestedPlaceholder(validationRule: ValidationRule): string {
//     switch (validationRule) {
//       case ValidationRule.EMAIL:
//         return 'e.g., user@example.com';
//       case ValidationRule.PHONE:
//         return 'e.g., +2348012345678 or 08012345678';
//       case ValidationRule.URL:
//         return 'e.g., https://example.com';
//       case ValidationRule.NUMBER_ONLY:
//         return 'e.g., 25';
//       case ValidationRule.ALPHABETS_ONLY:
//         return 'e.g., John Doe';
//       default:
//         return 'Enter your answer here';
//     }
//   }

//   /**
//    * Get suggested instruction text based on validation rule
//    */
//   getSuggestedInstruction(validationRule: ValidationRule): string {
//     switch (validationRule) {
//       case ValidationRule.EMAIL:
//         return 'Enter a valid email address';
//       case ValidationRule.PHONE:
//         return 'Enter phone number with country code (e.g., +234 or 0)';
//       case ValidationRule.URL:
//         return 'Enter website URL (http:// or https:// optional)';
//       case ValidationRule.NUMBER_ONLY:
//         return 'Numbers only, no letters or symbols';
//       case ValidationRule.ALPHABETS_ONLY:
//         return 'Letters only, no numbers or special characters';
//       default:
//         return '';
//     }
//   }

//   /**
//    * ✅ FIXED: Enhanced backend validation with better regex
//    */
//   validateUserInput(
//     value: any,
//     question: any,
//   ): {
//     isValid: boolean;
//     errors: Array<{ type: string; message: string; field: string }>;
//   } {
//     const errors: Array<{ type: string; message: string; field: string }> = [];
//     const field = question.data_key || question.question;

//     // Required field validation based on question type
//     if (question.is_required) {
//       switch (question.type) {
//         case QuestionType.SHORT_TEXT:
//         case QuestionType.LONG_TEXT:
//           if (!value || (typeof value === 'string' && value.trim() === '')) {
//             errors.push({
//               type: 'required',
//               message: 'This field is required',
//               field,
//             });
//             return { isValid: false, errors };
//           }
//           break;

//         case QuestionType.MULTIPLE_CHOICE:
//         case QuestionType.DROPDOWN:
//           if (!value) {
//             errors.push({
//               type: 'required_selection',
//               message: 'Please select an option',
//               field,
//             });
//             return { isValid: false, errors };
//           }
//           break;

//         case QuestionType.CHECKBOX:
//           if (!Array.isArray(value) || value.length === 0) {
//             errors.push({
//               type: 'required_selection',
//               message: 'Please select at least one option',
//               field,
//             });
//             return { isValid: false, errors };
//           }
//           break;

//         case QuestionType.MULTIPLE_CHOICE_GRID:
//           if (!value || typeof value !== 'object') {
//             errors.push({
//               type: 'required_grid',
//               message: 'Please answer all rows in the grid',
//               field,
//             });
//             return { isValid: false, errors };
//           }
//           const requiredRows = question.grid_rows?.map((row) => row.id) || [];
//           const answeredRows = Object.keys(value);
//           const missingRows = requiredRows.filter(
//             (rowId) => !answeredRows.includes(rowId),
//           );
//           if (missingRows.length > 0) {
//             errors.push({
//               type: 'required_grid',
//               message: `Please answer all rows (${missingRows.length} remaining)`,
//               field,
//             });
//             return { isValid: false, errors };
//           }
//           break;

//         case QuestionType.FILE_UPLOAD:
//           if (!value) {
//             errors.push({
//               type: 'required_file',
//               message: 'Please upload a file',
//               field,
//             });
//             return { isValid: false, errors };
//           }
//           break;
//       }
//     }

//     // Skip further validation if empty and not required
//     if (!value || (typeof value === 'string' && value.trim() === '')) {
//       return { isValid: true, errors: [] };
//     }

//     // Checkbox minimum selections
//     if (question.type === QuestionType.CHECKBOX && question.min_selections) {
//       if (!Array.isArray(value) || value.length < question.min_selections) {
//         errors.push({
//           type: 'min_selections',
//           message: `Please select at least ${question.min_selections} option(s)`,
//           field,
//         });
//       }
//     }

//     // File type validation
//     if (
//       question.type === QuestionType.FILE_UPLOAD &&
//       question.accepted_file_types
//     ) {
//       const fileName = typeof value === 'string' ? value : value?.name || '';
//       const fileExt = fileName
//         .substring(fileName.lastIndexOf('.'))
//         .toLowerCase();
//       if (!question.accepted_file_types.includes(fileExt)) {
//         errors.push({
//           type: 'file_type',
//           message: `Only ${question.accepted_file_types.join(', ')} files are allowed`,
//           field,
//         });
//       }
//     }

//     // ✅ FIXED: Text-based validations with enhanced regex
//     if (
//       (question.type === QuestionType.SHORT_TEXT ||
//         question.type === QuestionType.LONG_TEXT) &&
//       typeof value === 'string'
//     ) {
//       const validationRule =
//         question.manual_validation ||
//         question.auto_validation ||
//         ValidationRule.NONE;
//       const params = question.validation_params || {};

//       // Apply specific validation rules
//       switch (validationRule) {
//         case ValidationRule.EMAIL:
//           const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
//           if (!emailRegex.test(value)) {
//             errors.push({
//               type: 'email',
//               message:
//                 params.error_message ||
//                 'Please enter a valid email address (e.g., user@example.com)',
//               field,
//             });
//           }
//           break;

//         case ValidationRule.PHONE:
//           // ✅ FIXED: Support Nigerian and international formats
//           // Allows: +2348012345678, 08012345678, +1 234 567 8900, etc.
//           const phoneRegex =
//             /^(\+?\d{1,4}[\s-]?)?(\(?\d{1,4}\)?[\s-]?)?\d{7,15}$/;
//           const cleanedValue = value.replace(/[\s()-]/g, ''); // Remove formatting
//           if (!phoneRegex.test(cleanedValue)) {
//             errors.push({
//               type: 'phone',
//               message:
//                 params.error_message ||
//                 'Please enter a valid phone number (e.g., +2348012345678 or 08012345678)',
//               field,
//             });
//           }
//           break;

//         case ValidationRule.URL:
//           // ✅ FIXED: More flexible URL validation
//           const urlRegex =
//             /^(https?:\/\/)?(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)$/;
//           if (!urlRegex.test(value)) {
//             errors.push({
//               type: 'url',
//               message:
//                 params.error_message ||
//                 'Please enter a valid website URL (e.g., https://example.com or www.example.com)',
//               field,
//             });
//           }
//           break;

//         case ValidationRule.NUMBER_ONLY:
//           const numberRegex = /^\d+$/;
//           if (!numberRegex.test(value)) {
//             errors.push({
//               type: 'number',
//               message:
//                 params.error_message ||
//                 'Please enter numbers only (e.g., 25, 1000)',
//               field,
//             });
//           }
//           break;

//         case ValidationRule.ALPHABETS_ONLY:
//           // ✅ FIXED: Allow spaces, hyphens, and apostrophes for names
//           const alphabetRegex = /^[a-zA-Z\s'-]+$/;
//           if (!alphabetRegex.test(value)) {
//             errors.push({
//               type: 'alphabets',
//               message:
//                 params.error_message ||
//                 'Please enter letters only (no numbers or special characters)',
//               field,
//             });
//           }
//           break;
//       }

//       // Length validations
//       if (params.min_character && value.length < params.min_character) {
//         errors.push({
//           type: 'min_character',
//           message: `Minimum ${params.min_character} characters required`,
//           field,
//         });
//       }

//       if (params.max_character && value.length > params.max_character) {
//         errors.push({
//           type: 'max_character',
//           message: `Maximum ${params.max_character} characters allowed`,
//           field,
//         });
//       }
//     }

//     return { isValid: errors.length === 0, errors };
//   }
// }

import { Injectable } from '@nestjs/common';
import { ValidationRule } from 'src/shared/enums';
import { QuestionType } from 'src/modules/assessment/enums/question-type.enum';

@Injectable()
export class QuestionValidationService {
  /**
   * ✅ FIXED: Enhanced auto-detection with better pattern matching
   */
  detectValidationRule(questionText: string): ValidationRule {
    const questionLower = questionText.toLowerCase().trim();

    // ✅ PRIORITY ORDER MATTERS - More specific patterns first!

    // 1. EMAIL DETECTION (most specific first)
    const emailPatterns = [
      /\bemail\s*address\b/i,
      /\be-mail\s*address\b/i,
      /\belectronic\s*mail\b/i,
      /\bmail\s*address\b/i,
      /\bemail\s*id\b/i,
      /\be-?mail\b/i,
    ];

    if (emailPatterns.some((pattern) => pattern.test(questionLower))) {
      return ValidationRule.EMAIL;
    }

    // 2. PHONE DETECTION (before number detection!)
    const phonePatterns = [
      /\bphone\s*number\b/i,
      /\bmobile\s*number\b/i,
      /\btelephone\s*number\b/i,
      /\bcontact\s*number\b/i,
      /\bcell\s*number\b/i,
      /\bcellphone\b/i,
      /\bwhatsapp\s*number\b/i,
      /\bphone\b/i,
      /\bmobile\b/i,
      /\btelephone\b/i,
      /\bcall\s*number\b/i,
    ];

    if (phonePatterns.some((pattern) => pattern.test(questionLower))) {
      return ValidationRule.PHONE;
    }

    // 3. URL/WEBSITE DETECTION (before generic patterns)
    const urlPatterns = [
      /\bwebsite\s*url\b/i,
      /\bweb\s*address\b/i,
      /\bsite\s*url\b/i,
      /\bhomepage\b/i,
      /\bportfolio\s*link\b/i,
      /\bwebsite\b/i,
      /\burl\b/i,
      /\blink\b/i,
     /\bhyperlink\b/i,
      /\blinkedin\s*(profile|link|url)\b/i,
      /\bgithub\s*(profile|link|url)\b/i,
      /\bsocial\s*media\s*(link|url|profile)\b/i,
      /\bfacebook\s*(link|url|profile)\b/i,
      /\btwitter\s*(link|url|profile)\b/i,
      /\binstagram\s*(link|url|profile)\b/i,
      /\bprofile\s*(link|url)\b/i,
      /\bshare.*link\b/i,
      /\bprovide.*link\b/i,
    ];

    if (urlPatterns.some((pattern) => pattern.test(questionLower))) {
      return ValidationRule.URL;
    }

    // 4. ALPHABETIC DETECTION (BEFORE number detection - this is critical!)
    // Questions about locations, names that might contain the word "number" or "year"
    const alphabeticPatterns = [
      /\b(first|last|full|middle|contact|person)\s*name\b/i,
      /\bcountry\b(?!\s*code)/i, // Country but not "country code"
      /\bcity\b/i,
      /\bstate\b(?!\s*registration)/i, // State but not "state registration"
      /\bnationality\b/i,
      /\btown\b/i,
      /\bvillage\b/i,
      /\blocality\b/i,
      /\bregion\b/i,
      /\bdistrict\b/i,
    ];

    if (alphabeticPatterns.some((pattern) => pattern.test(questionLower))) {
      return ValidationRule.ALPHABETS_ONLY;
    }

    // 5. AGE/NUMERIC DETECTION (AFTER alphabetic detection)
    // ✅ CRITICAL FIX: More specific patterns that won't match location questions
    const numberPatterns = [
      /\bage\b/i,
      /\byears?\s*old\b/i,
      /\bhow\s*old\b/i,
      /\bnumber\s*of\s*(years|months|days|items|employees|staff|branches)\b/i,
      /\bhow\s*many\s*(years|months|employees|staff|items|branches)\b/i,
      /\bquantity\b/i,
      /\bamount\b/i,
      /\bcount\s*of\b/i,
      /\btotal\b/i,
      /\bscore\b/i,
      /\brating\b/i,
      // ✅ FIXED: More specific year patterns that won't match "year" in other contexts
      /\b(foundation|founding|established|founded|started|registration)\s*year\b/i,
      /\byear\s*(of\s*)?(foundation|founding|establishment|incorporation|registration)\b/i,
    ];

    if (numberPatterns.some((pattern) => pattern.test(questionLower))) {
      return ValidationRule.NUMBER_ONLY;
    }

    // ✅ DEFAULT: No validation if pattern doesn't match
    return ValidationRule.NONE;
  }

  /**
   * ✅ FIXED: Enhanced validation with better regex and error messages
   */
  generateFrontendValidation(question: any): any {
    const validationRule =
      question.manual_validation ||
      question.auto_validation ||
      ValidationRule.NONE;
    const params = question.validation_params || {};

    const validation: any = {
      required: question.is_required || false,
      rules: [],
    };

    // Type-specific validations
    switch (question.type) {
      case QuestionType.MODULE_TITLE:
        if (question.is_required) {
          validation.rules.push({
            type: 'required_selection',
            message: 'Please select an option',
          });
        }
        break;

      case QuestionType.CHECKBOX:
        if (question.is_required) {
          validation.rules.push({
            type: 'required_selection',
            message: 'Please select at least one option',
          });
        }
        if (question.min_selections && question.min_selections > 0) {
          validation.rules.push({
            type: 'min_selections',
            value: question.min_selections,
            message: `Please select at least ${question.min_selections} option(s)`,
          });
        }
        break;

      case QuestionType.DROPDOWN:
        if (question.is_required) {
          validation.rules.push({
            type: 'required_selection',
            message: 'Please select an option from the dropdown',
          });
        }
        break;

      case QuestionType.MULTIPLE_CHOICE_GRID:
        if (question.is_required) {
          validation.rules.push({
            type: 'required_grid',
            message: 'Please answer all rows in the grid',
            gridRows: question.grid_rows?.map((row) => row.id) || [],
          });
        }
        break;

     case QuestionType.FILE_UPLOAD:
        const acceptsUrl = question.accepted_file_types?.includes('url');
        
        if (question.is_required) {
          validation.rules.push({
            type: 'required_file',
            message: acceptsUrl 
              ? 'Please upload a file or provide a URL link'
              : 'Please upload a file',
          });
        }


         
        // If URLs are accepted, add URL validation
        if (acceptsUrl) {
          validation.rules.push({
            type: 'file_or_url',
            message: 'Please provide either a valid file upload or a URL link',
            acceptsUrl: true,
          });
        }


        if (question.accepted_file_types?.length > 0) {
          // Filter out 'url' for file type validation message
          const fileTypes = question.accepted_file_types.filter(type => type !== 'url');
          if (fileTypes.length > 0) {
            validation.rules.push({
              type: 'file_type',
              value: fileTypes,
              message: acceptsUrl
                ? `Accepted file types: ${fileTypes.join(', ')} or provide a URL`
                : `Only ${fileTypes.join(', ')} files are allowed`,
            });
          }
        }
        break;
    }

    // ✅ FIXED: Text-based validation rules with enhanced regex and messages
    if (
      question.type === QuestionType.SHORT_TEXT ||
      question.type === QuestionType.LONG_TEXT
    ) {
      switch (validationRule) {
        case ValidationRule.EMAIL:
          validation.rules.push({
            type: 'email',
            message:
              params.error_message ||
              'Please enter a valid email address (e.g., user@example.com)',
            pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
          });
          break;

        case ValidationRule.PHONE:
          validation.rules.push({
            type: 'phone',
            message:
              params.error_message ||
              'Please enter a valid phone number (e.g., +2348012345678 or 08012345678)',
            // ✅ FIXED: Enhanced regex to support Nigerian and international formats
            pattern: /^(\+?\d{1,4}[\s-]?)?(\(?\d{1,4}\)?[\s-]?)?\d{7,15}$/,
          });
          break;

        case ValidationRule.URL:
          validation.rules.push({
            type: 'url',
            message:
              params.error_message ||
             'Please enter a valid URL/link (e.g., https://example.com or www.example.com)',
            // ✅ FIXED: More flexible URL regex
            pattern:
              /^(https?:\/\/)?(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)$/,
          });

        case ValidationRule.NUMBER_ONLY:
          validation.rules.push({
            type: 'number',
            message:
              params.error_message ||
              'Please enter numbers only (e.g., 25, 1000)',
            pattern: /^\d+$/,
          });
          break;

        case ValidationRule.ALPHABETS_ONLY:
          validation.rules.push({
            type: 'alphabets',
            message:
              params.error_message ||
              'Please enter letters only (no numbers or special characters)',
            // ✅ FIXED: Allow spaces and basic punctuation
            pattern: /^[a-zA-Z\s'-]+$/,
          });
          break;
      }

      // Add length validations for text fields
      if (params.min_character) {
        validation.rules.push({
          type: 'min_character',
          value: params.min_character,
          message: `Minimum ${params.min_character} characters required`,
        });
      }

      if (params.max_character) {
        validation.rules.push({
          type: 'max_character',
          value: params.max_character,
          message: `Maximum ${params.max_character} characters allowed`,
        });
      }
    }

    return validation;
  }

  /**
   * Get suggested placeholder text based on validation rule
   */
  getSuggestedPlaceholder(validationRule: ValidationRule): string {
    switch (validationRule) {
      case ValidationRule.EMAIL:
        return 'e.g., user@example.com';
      case ValidationRule.PHONE:
        return 'e.g., +2348012345678 or 08012345678';
        case ValidationRule.URL:
        return 'e.g., https://example.com or www.linkedin.com/in/username';
      case ValidationRule.NUMBER_ONLY:
        return 'e.g., 25';
      case ValidationRule.ALPHABETS_ONLY:
        return 'e.g., John Doe';
      default:
        return 'Enter your answer here';
    }
  }

  /**
   * Get suggested instruction text based on validation rule
   */
  getSuggestedInstruction(validationRule: ValidationRule): string {
    switch (validationRule) {
      case ValidationRule.EMAIL:
        return 'Enter a valid email address';
      case ValidationRule.PHONE:
        return 'Enter phone number with country code (e.g., +234 or 0)';
 case ValidationRule.URL:
        return 'Enter a valid URL or link (http:// or https:// optional)';
      case ValidationRule.NUMBER_ONLY:
        return 'Numbers only, no letters or symbols';
      case ValidationRule.ALPHABETS_ONLY:
        return 'Letters only, no numbers or special characters';
      default:
        return '';
    }
  }

  /**
   * ✅ FIXED: Enhanced backend validation with better regex
   */
  validateUserInput(
    value: any,
    question: any,
  ): {
    isValid: boolean;
    errors: Array<{ type: string; message: string; field: string }>;
  } {
    const errors: Array<{ type: string; message: string; field: string }> = [];
    const field = question.data_key || question.question;

    // Required field validation based on question type
    if (question.is_required) {
      switch (question.type) {
        case QuestionType.SHORT_TEXT:
        case QuestionType.LONG_TEXT:
          if (!value || (typeof value === 'string' && value.trim() === '')) {
            errors.push({
              type: 'required',
              message: 'This field is required',
              field,
            });
            return { isValid: false, errors };
          }
          break;

        case QuestionType.MULTIPLE_CHOICE:
        case QuestionType.DROPDOWN:
          if (!value) {
            errors.push({
              type: 'required_selection',
              message: 'Please select an option',
              field,
            });
            return { isValid: false, errors };
          }
          break;

        case QuestionType.CHECKBOX:
          if (!Array.isArray(value) || value.length === 0) {
            errors.push({
              type: 'required_selection',
              message: 'Please select at least one option',
              field,
            });
            return { isValid: false, errors };
          }
          break;

        case QuestionType.MULTIPLE_CHOICE_GRID:
          if (!value || typeof value !== 'object') {
            errors.push({
              type: 'required_grid',
              message: 'Please answer all rows in the grid',
              field,
            });
            return { isValid: false, errors };
          }
          const requiredRows = question.grid_rows?.map((row) => row.id) || [];
          const answeredRows = Object.keys(value);
          const missingRows = requiredRows.filter(
            (rowId) => !answeredRows.includes(rowId),
          );
          if (missingRows.length > 0) {
            errors.push({
              type: 'required_grid',
              message: `Please answer all rows (${missingRows.length} remaining)`,
              field,
            });
            return { isValid: false, errors };
          }
          break;


        case QuestionType.FILE_UPLOAD:
          if (!value) {
            const acceptsUrl = question.accepted_file_types?.includes('url');
            errors.push({
              type: 'required_file',
              message: acceptsUrl 
                ? 'Please upload a file or provide a URL link'
                : 'Please upload a file',
              field,
            });
            return { isValid: false, errors };
          }
          break;
      }
    }

    // Skip further validation if empty and not required
    if (!value || (typeof value === 'string' && value.trim() === '')) {
      return { isValid: true, errors: [] };
    }

    // Checkbox minimum selections
    if (question.type === QuestionType.CHECKBOX && question.min_selections) {
      if (!Array.isArray(value) || value.length < question.min_selections) {
        errors.push({
          type: 'min_selections',
          message: `Please select at least ${question.min_selections} option(s)`,
          field,
        });
      }
    }

    // File type validation
   // File type validation
    if (
      question.type === QuestionType.FILE_UPLOAD &&
      question.accepted_file_types
    ) {
      const acceptsUrl = question.accepted_file_types.includes('url');
      
      // Check if value is a URL (string starting with http/https) or a file
      const isUrl = typeof value === 'string' && /^https?:\/\//i.test(value);
      
      if (isUrl) {
        // If it's a URL, check if URLs are accepted
        if (!acceptsUrl) {
          errors.push({
            type: 'url_not_accepted',
            message: 'URL links are not accepted for this upload. Please upload a file.',
            field,
          });
        } else {
          // Validate URL format
          const urlRegex =
            /^(https?:\/\/)?(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)$/;
          if (!urlRegex.test(value)) {
            errors.push({
              type: 'invalid_url',
              message: 'Please provide a valid URL (e.g., https://example.com/document.pdf)',
              field,
            });
          }
        }
      } else {
        // Validate file extension (excluding 'url' from the list)
        const fileTypes = question.accepted_file_types.filter(type => type !== 'url');
        if (fileTypes.length > 0) {
          const fileName = typeof value === 'string' ? value : value?.name || '';
          const fileExt = fileName
            .substring(fileName.lastIndexOf('.'))
            .toLowerCase();
          if (!fileTypes.includes(fileExt)) {
            errors.push({
              type: 'file_type',
              message: acceptsUrl
                ? `Accepted file types: ${fileTypes.join(', ')} or provide a URL`
                : `Only ${fileTypes.join(', ')} files are allowed`,
              field,
            });
          }
        }
      }
    }

    // ✅ FIXED: Text-based validations with enhanced regex
    if (
      (question.type === QuestionType.SHORT_TEXT ||
        question.type === QuestionType.LONG_TEXT) &&
      typeof value === 'string'
    ) {
      const validationRule =
        question.manual_validation ||
        question.auto_validation ||
        ValidationRule.NONE;
      const params = question.validation_params || {};

      // Apply specific validation rules
      switch (validationRule) {
        case ValidationRule.EMAIL:
          const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
          if (!emailRegex.test(value)) {
            errors.push({
              type: 'email',
              message:
                params.error_message ||
                'Please enter a valid email address (e.g., user@example.com)',
              field,
            });
          }
          break;

        case ValidationRule.PHONE:
          // ✅ FIXED: Support Nigerian and international formats
          // Allows: +2348012345678, 08012345678, +1 234 567 8900, etc.
          const phoneRegex =
            /^(\+?\d{1,4}[\s-]?)?(\(?\d{1,4}\)?[\s-]?)?\d{7,15}$/;
          const cleanedValue = value.replace(/[\s()-]/g, ''); // Remove formatting
          if (!phoneRegex.test(cleanedValue)) {
            errors.push({
              type: 'phone',
              message:
                params.error_message ||
                'Please enter a valid phone number (e.g., +2348012345678 or 08012345678)',
              field,
            });
          }
          break;

        case ValidationRule.URL:
          // ✅ FIXED: More flexible URL validation
          const urlRegex =
            /^(https?:\/\/)?(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)$/;
          if (!urlRegex.test(value)) {
            errors.push({
              type: 'url',
              message:
              params.error_message ||
                'Please enter a valid URL/link (e.g., https://example.com or www.example.com)',
              field,
            });
          }
          break;

        case ValidationRule.NUMBER_ONLY:
          const numberRegex = /^\d+$/;
          if (!numberRegex.test(value)) {
            errors.push({
              type: 'number',
              message:
                params.error_message ||
                'Please enter numbers only (e.g., 25, 1000)',
              field,
            });
          }
          break;

        case ValidationRule.ALPHABETS_ONLY:
          // ✅ FIXED: Allow spaces, hyphens, and apostrophes for names
          const alphabetRegex = /^[a-zA-Z\s'-]+$/;
          if (!alphabetRegex.test(value)) {
            errors.push({
              type: 'alphabets',
              message:
                params.error_message ||
                'Please enter letters only (no numbers or special characters)',
              field,
            });
          }
          break;
      }

      // Length validations
      if (params.min_character && value.length < params.min_character) {
        errors.push({
          type: 'min_character',
          message: `Minimum ${params.min_character} characters required`,
          field,
        });
      }

      if (params.max_character && value.length > params.max_character) {
        errors.push({
          type: 'max_character',
          message: `Maximum ${params.max_character} characters allowed`,
          field,
        });
      }
    }

    return { isValid: errors.length === 0, errors };
  }
}
