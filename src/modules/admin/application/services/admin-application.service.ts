import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  ApplicationForm,
  EmbeddedModule,
  EmbeddedQuestion,
} from '../schemas/application-form.schema';
import { GetApplicationsDto } from '../dtos/get-applications.dto';
import {
  CreateApplicationFormDto,
  UpdateApplicationFormDto,
} from '../dtos/create-application-form.dto';
import { QuestionValidationService } from './question-validation.service';
import { QuestionDataKeyService } from './question-data-key.service';
import {
  ApplicationStatus,
  PaymentStatus,
  ValidationRule,
  Repositories,
} from 'src/shared/enums';
import { UserSubmission } from 'src/modules/business-owner/user-submission.schema';
import { Service } from '../../services/schemas/service.schema';
import { UploadService } from 'src/modules/cloudinary/cloudinary.service';
import { UpdateTrainingDetailsDto } from '../dtos/update-training-details.dto';
import { BaseRepository } from 'src/modules/repository/base.repository';
import { UserAssessment } from 'src/modules/assessment/schemas/user-assessment.schema';
import { NotificationService } from 'src/modules/notification/notification.service';
import { User } from 'src/modules/user/user.schema';
import {
  NotificationPriority,
  NotificationType,
} from 'src/modules/notification/schemas/notification.schema';
import { UserApplicationService } from 'src/modules/business-owner/user-application.service';

interface PopulatedSubmission {
  _id: any;
  responses: Record<string, any>;
  service: string;
  service_type: string;
  payment_amount?: number;
  // userId: string;
  userId: {
    _id: Types.ObjectId;
    first_name: string;
    last_name: string;
    email: string;
  };
  status: ApplicationStatus;
  payment_status: PaymentStatus;
  createdAt: Date;
  formId: {
    _id: Types.ObjectId;
    welcome_title: string;
    slug: string;
    questions: EmbeddedQuestion[];
  };
}

@Injectable()
export class AdminApplicationService {
  private readonly logger = new Logger(UserApplicationService.name);

  constructor(
    @InjectModel(ApplicationForm.name)
    private applicationFormModel: Model<ApplicationForm>,
    @InjectModel(UserSubmission.name)
    private submissionModel: Model<UserSubmission>,
    @Inject(Repositories.UserSubmissionRepository)
    private readonly userSubmissionRepository: BaseRepository<UserSubmission>,
    @Inject(Repositories.UserAssessmentRepository)
    private readonly userAssessmentRepository: BaseRepository<UserAssessment>,
    @InjectModel(Service.name)
    private serviceModel: Model<Service>,
    private questionValidationService: QuestionValidationService,
    private questionDataKeyService: QuestionDataKeyService,
    private readonly uploadService: UploadService,
    private readonly notificationService: NotificationService,
    @Inject(Repositories.UserRepository)
    private readonly userRepository: BaseRepository<User>,
  ) {}

  private processSingleQuestion(
    question: any,
    existingDataKeys: string[],
    isNewQuestion: boolean,
  ): any {
    const processedQuestion = { ...question };

    // ✅ ADD THIS VALIDATION
    if (question.type === 'checkbox') {
      const min = question.min_selections;
      const max = question.max_selections;

      if (min != null && max != null && min > max) {
        throw new BadRequestException(
          `Checkbox question "${question.question}": min_selections (${min}) cannot exceed max_selections (${max})`,
        );
      }
    }

    // Set active to true by default for new questions
    if (isNewQuestion && processedQuestion.active === undefined) {
      processedQuestion.active = true;
    }

    if (isNewQuestion || !processedQuestion.data_key) {
      processedQuestion.data_key = this.questionDataKeyService.generate(
        question.question,
        existingDataKeys,
      );

      existingDataKeys.push(processedQuestion.data_key);
    }

    if (
      isNewQuestion &&
      (question.type === 'short_text' || question.type === 'long_text') &&
      !question.manual_validation
    ) {
      const autoValidation =
        this.questionValidationService.detectValidationRule(question.question);
      processedQuestion.auto_validation = autoValidation;

      if (!question.placeholder && autoValidation !== ValidationRule.NONE) {
        processedQuestion.placeholder =
          this.questionValidationService.getSuggestedPlaceholder(
            autoValidation,
          );
      }

      if (!question.instruction && autoValidation !== ValidationRule.NONE) {
        processedQuestion.instruction =
          this.questionValidationService.getSuggestedInstruction(
            autoValidation,
          );
      }
    }

    return processedQuestion;
  }

  private transformTrainingsList(
    submissions: any[],
    servicePriceMap: any,
  ): any[] {
    return submissions.map((submission) => {
      // ✅ FIXED: Get name and email from populated user instead of responses
      const firstName = submission.userId?.first_name || 'N/A';
      const lastName = submission.userId?.last_name || '';
      const email = submission.userId?.email || 'N/A';
      const name = `${firstName} ${lastName}`.trim();
      const paymentStatus = submission.payment_status || 'Not Paid';
      const specificService = submission.service;
      const paymentAmount = servicePriceMap[specificService] || 'N/A';
      const startDate = submission.start_date
        ? new Date(submission.start_date).toLocaleString()
        : null;
      const endDate = submission.end_date
        ? new Date(submission.end_date).toLocaleString()
        : null;

      return {
        application_id: submission._id,
        name,
        email,
        service_type: submission.service_type,
        service: specificService,
        status: submission.status,
        submission_time: new Date(submission.createdAt).toLocaleString(),
        payment_status: paymentStatus,
        payment_amount: paymentAmount,
        timetable_url: submission.timetable_url || null,
        start_date: startDate,
        end_date: endDate,
      };
    });
  }

  private transformSubmissionsForList(
    submissions: PopulatedSubmission[],
    formsMap: Map<string, any>,
  ): any[] {
    return submissions.map((submission) => {
      // Get name and email from the populated user object instead of responses
      const firstName = submission.userId?.first_name || 'N/A';
      const lastName = submission.userId?.last_name || '';
      const email = submission.userId?.email || 'N/A';
      const specificService = submission.service;
      const paymentStatus = submission.payment_status || 'Not Paid';
      const name = `${firstName} ${lastName}`.trim();
      // Get form details from the map
      const formDetails =
        formsMap.get(submission.formId?._id?.toString() || '') || {};
      // Transform responses into question-answer pairs
      const formQuestions = formDetails.questions || [];
      const questionAnswerPairs = formQuestions
        .map((question: any) => {
          const dataKey = question.data_key;
          const answer = submission.responses[dataKey];

          // Only include questions that have answers
          if (answer !== undefined && answer !== null && answer !== '') {
            return {
              question: question.question,
              data_key: dataKey,
              answer: answer,
              type: question.type,
            };
          }
          return null;
        })
        .filter(Boolean); // Remove null entries

      return {
        _id: submission._id,
        form_title: formDetails.welcome_title || 'N/A',
        form_slug: formDetails.slug || null,
        name,
        email,
        service: specificService,
        service_type: submission.service_type,
        status: submission.status,
        timestamp: new Date(submission.createdAt).toLocaleString(),
        payment_status: paymentStatus,
        responses: questionAnswerPairs,
      };
    });
  }

  async createForm(dto: CreateApplicationFormDto): Promise<ApplicationForm> {
    const existingDataKeys: string[] = [];

    // Validate that all modules referenced in questions exist
    if (dto.questions && dto.questions.length > 0) {
      const moduleTempIds = new Set(dto.modules?.map((m) => m.temp_id) || []);

      const invalidQuestions = dto.questions.filter(
        (q) => q.module_ref && !moduleTempIds.has(q.module_ref),
      );

      if (invalidQuestions.length > 0) {
        const invalidRefs = invalidQuestions
          .map(
            (q) =>
              `Question "${q.question}" references non-existent module "${q.module_ref}"`,
          )
          .join('; ');

        throw new BadRequestException(
          `Cannot create form. The following questions reference modules that don't exist: ${invalidRefs}`,
        );
      }
    }

    const processedQuestions =
      dto.questions?.map((question) => {
        // Pass true for isNewQuestion during initial creation
        return this.processSingleQuestion(question, existingDataKeys, true);
      }) || [];

    const welcomeTitle = dto.welcome_title || 'new-form';
    let newSlug = this.questionDataKeyService.generateSlug(welcomeTitle);

    let slugExists = await this.applicationFormModel.findOne({ slug: newSlug });
    let counter = 1;
    while (slugExists) {
      newSlug = `${this.questionDataKeyService.generateSlug(welcomeTitle)}-${counter}`;
      slugExists = await this.applicationFormModel.findOne({ slug: newSlug });
      counter++;
    }

    const processedDto = {
      ...dto,
      questions: processedQuestions,
      slug: newSlug,
    };

    const newForm = new this.applicationFormModel({
      ...processedDto,
      isLive: false,
    });

    const savedForm = await newForm.save();
    return savedForm.toObject() as ApplicationForm;
  }

  async updateForm(
    id: string,
    dto: UpdateApplicationFormDto,
  ): Promise<ApplicationForm> {
    const form = await this.applicationFormModel.findById(id);
    if (!form) {
      throw new NotFoundException('Application form not found.');
    }

    // 1. Update top-level properties (welcome screens, isLive, etc.)
    if (dto.welcome_title !== undefined) form.welcome_title = dto.welcome_title;
    if (dto.welcome_description !== undefined)
      form.welcome_description = dto.welcome_description;
    if (dto.welcome_instruction !== undefined)
      form.welcome_instruction = dto.welcome_instruction;
    if (dto.welcome_button_text !== undefined)
      form.welcome_button_text = dto.welcome_button_text;
    if (dto.isLive !== undefined) form.isLive = dto.isLive;

    // Build a set of all valid module temp_ids (both existing and incoming)
    const allValidModuleTempIds = new Set<string>();

    // Add existing active modules
    form.modules.forEach((m) => {
      if (m.temp_id && m.active !== false) {
        allValidModuleTempIds.add(m.temp_id);
      }
    });

    // Add incoming modules (including new ones)
    if (dto.modules && dto.modules.length > 0) {
      dto.modules.forEach((m) => {
        if (m.temp_id && m.active !== false) {
          allValidModuleTempIds.add(m.temp_id);
        }
      });
    }

    // 2. Questions Update: Add new questions or update existing ones (NO DELETION)
    if (dto.questions && dto.questions.length > 0) {
      // Validate that all questions reference valid modules
      const invalidQuestions = dto.questions.filter(
        (q) =>
          q.module_ref &&
          q.active !== false &&
          !allValidModuleTempIds.has(q.module_ref),
      );

      if (invalidQuestions.length > 0) {
        const invalidRefs = invalidQuestions
          .map(
            (q) =>
              `Question "${q.question}" references non-existent or inactive module "${q.module_ref}"`,
          )
          .join('; ');

        throw new BadRequestException(
          `Cannot update form. The following questions reference modules that don't exist or are inactive: ${invalidRefs}`,
        );
      }

      const existingQuestionsMap = new Map<string, EmbeddedQuestion>();
      const currentDataKeys: string[] = [];

      // Map existing questions by data_key
      for (const question of form.questions) {
        if (question.data_key) {
          existingQuestionsMap.set(question.data_key, question);
          currentDataKeys.push(question.data_key);
        }
      }

      for (const incomingQuestion of dto.questions) {
        const dataKey = incomingQuestion.data_key;

        // Check if this is an update (question with this data_key already exists)
        if (dataKey && existingQuestionsMap.has(dataKey)) {
          // UPDATE EXISTING QUESTION
          const existingQuestion = existingQuestionsMap.get(dataKey)!;
          const updatedQuestion = this.processSingleQuestion(
            incomingQuestion,
            currentDataKeys,
            false, // isNewQuestion = false
          );

          // Handle soft deletion: if active is set to false, mark as inactive
          if (incomingQuestion.active === false) {
            existingQuestion.active = false;
            this.logger.log(
              `Question with data_key "${dataKey}" marked as inactive (soft deleted)`,
            );
          } else {
            Object.assign(existingQuestion, updatedQuestion);
          }
        } else {
          // ADD NEW QUESTION
          const newQuestion = this.processSingleQuestion(
            incomingQuestion,
            currentDataKeys,
            true, // isNewQuestion = true
          );

          // Prevent duplicates: check if data_key was just generated and already exists
          if (
            newQuestion.data_key &&
            !existingQuestionsMap.has(newQuestion.data_key)
          ) {
            form.questions.push(newQuestion as EmbeddedQuestion);
            existingQuestionsMap.set(
              newQuestion.data_key,
              newQuestion as EmbeddedQuestion,
            );
            currentDataKeys.push(newQuestion.data_key);
          }
        }
      }
      // HARD DELETE: Remove questions that are marked as inactive (active === false)
      const originalQuestionsCount = form.questions.length;
      form.questions = form.questions.filter((q) => q.active !== false);
      const deletedQuestionsCount =
        originalQuestionsCount - form.questions.length;

      if (deletedQuestionsCount > 0) {
        this.logger.log(
          `Hard deleted ${deletedQuestionsCount} inactive question(s) from the database`,
        );
      }
    }

    // 3. Modules Update: Add new modules or update existing ones (NO DELETION)
    if (dto.modules && dto.modules.length > 0) {
      const existingModulesMap = new Map<string, EmbeddedModule>();

      // Map existing modules by temp_id
      for (const module of form.modules) {
        if (module.temp_id) {
          existingModulesMap.set(module.temp_id, module);
        }
      }

      for (const incomingModule of dto.modules) {
        const tempId = incomingModule.temp_id;

        if (!tempId) {
          throw new BadRequestException('Module must have a temp_id');
        }

        // Check if this module already exists
        if (existingModulesMap.has(tempId)) {
          // UPDATE EXISTING MODULE
          const existingModule = existingModulesMap.get(tempId)!;
          // Handle soft deletion: if active is set to false, mark as inactive
          if (incomingModule.active === false) {
            // Check if any active questions reference this module
            const questionsUsingModule = form.questions.filter(
              (q) => q.module_ref === tempId && q.active !== false,
            );

            if (questionsUsingModule.length > 0) {
              const questionsList = questionsUsingModule
                .map((q) => `"${q.question}"`)
                .join(', ');

              throw new BadRequestException(
                `Cannot delete module "${existingModule.title}" (${tempId}). The following active question(s) are still using it: ${questionsList}. Please delete or reassign these questions first.`,
              );
            }
            existingModule.active = false;
            this.logger.log(
              `Module with temp_id "${tempId}" marked as inactive (soft deleted)`,
            );
          } else {
            Object.assign(existingModule, incomingModule);
          }
        } else {
          // ADD NEW MODULE (prevent duplicates)
          const newModule = {
            ...incomingModule,
            active: incomingModule.active ?? true,
          };
          form.modules.push(newModule as EmbeddedModule);
          existingModulesMap.set(tempId, newModule as EmbeddedModule);
        }
      }
      // HARD DELETE: Remove modules that are marked as inactive (active === false)
      const originalModulesCount = form.modules.length;
      form.modules = form.modules.filter((m) => m.active !== false);
      const deletedModulesCount = originalModulesCount - form.modules.length;

      if (deletedModulesCount > 0) {
        this.logger.log(
          `Hard deleted ${deletedModulesCount} inactive module(s) from the database`,
        );
      }
    }

    const updatedForm = await form.save();
    return updatedForm.toObject() as ApplicationForm;
  }

  async getSingleForm(formId: string): Promise<ApplicationForm> {
    const form = await this.applicationFormModel.findById(formId).exec();

    if (!form) {
      throw new NotFoundException(
        `Application form with ID "${formId}" not found.`,
      );
    }

    // Filter out inactive questions when returning the form
    const formObject = form.toObject() as ApplicationForm;
    formObject.questions = formObject.questions.filter(
      (q: any) => q.active !== false,
    );
    formObject.modules = formObject.modules.filter(
      (m: any) => m.active !== false,
    );

    return formObject;
  }

  async getAllForms(): Promise<ApplicationForm[]> {
    const forms = await this.applicationFormModel
      .find({ isDeleted: { $ne: true } })
      .exec();

    // Filter out inactive questions from each form
    return forms.map((form) => {
      const formObject = form.toObject() as ApplicationForm;
      formObject.questions = formObject.questions.filter(
        (q: any) => q.active !== false,
      );
      formObject.modules = formObject.modules.filter(
        (m: any) => m.active !== false,
      );
      return formObject;
    });
  }

  async publishForm(id: string, isLive: boolean): Promise<ApplicationForm> {
    const form = await this.applicationFormModel.findById(id).exec();

    if (!form) {
      throw new NotFoundException('Application form not found.');
    }

    // If publishing this form (isLive = true), unpublish all other forms first
    if (isLive) {
      await this.applicationFormModel
        .updateMany(
          { _id: { $ne: id }, isLive: true }, // Find all other live forms
          { $set: { isLive: false } }, // Set them to unpublished
        )
        .exec();

      this.logger.log(
        `Unpublished all other forms before publishing form: ${id}`,
      );
    }
    const updatedForm = await this.applicationFormModel
      .findByIdAndUpdate(id, { $set: { isLive: isLive } }, { new: true })
      .exec();

    if (!updatedForm) {
      throw new NotFoundException('Application form not found.');
    }

    // Filter out inactive questions
    const formObject = updatedForm.toObject() as ApplicationForm;
    formObject.questions = formObject.questions.filter(
      (q: any) => q.active !== false,
    );
    formObject.modules = formObject.modules.filter(
      (m: any) => m.active !== false,
    );

    return formObject;
  }

  async deleteForm(id: string): Promise<{ message: string }> {
    const form = await this.applicationFormModel.findById(id).exec();

    if (!form) {
      throw new NotFoundException(
        `Application form with ID "${id}" not found.`,
      );
    }

    // Optional: Check if form is live and prevent deletion
    if (form.isLive) {
      throw new BadRequestException(
        'Cannot delete a live form. Please unpublish it first.',
      );
    }

    // Optional: Check if there are submissions for this form
    const submissionsCount = await this.submissionModel
      .countDocuments({
        form_id: id, // Assuming submissions reference the form
      })
      .exec();

    if (submissionsCount > 0) {
      throw new BadRequestException(
        `Cannot delete form. There are ${submissionsCount} submission(s) associated with this form.`,
      );
    }

    await this.applicationFormModel.findByIdAndDelete(id).exec();

    return {
      message: 'Application form deleted successfully.',
    };
  }

  async getApplicationList(dto: GetApplicationsDto): Promise<any[]> {
    const filter: any = {};
    if (dto.service_type) {
      filter.service_type = new RegExp(dto.service_type.trim(), 'i');
    }

    const submissions = await this.submissionModel
      .find(filter)
      .populate({
        path: 'formId',
        select: 'welcome_title slug questions',
      })
      .populate({
        path: 'userId',
        select: 'first_name last_name email', // Populate user data
      })
      .exec();

    if (submissions.length === 0) {
      throw new NotFoundException(
        'No submissions found.',
      );
    }

    // Create a map of forms for efficient lookup
    const formsMap = new Map<string, any>();
    const typedSubmissions: PopulatedSubmission[] = [];

    submissions.forEach((submission: any) => {
      // Check if formId is populated (not just an ObjectId)
      if (
        submission.formId &&
        typeof submission.formId === 'object' &&
        submission.formId._id
      ) {
        const formId = submission.formId._id.toString();

        // Add to forms map (avoid duplicates)
        if (!formsMap.has(formId)) {
          formsMap.set(formId, {
            welcome_title: submission.formId.welcome_title,
            slug: submission.formId.slug,
            questions: (submission.formId.questions || []).filter(
              (q: any) => q.active !== false,
            ),
          });
        }

        // Check if userId is populated
        if (submission.userId && typeof submission.userId === 'object') {
          // Add to typed submissions array
          typedSubmissions.push({
            _id: submission._id,
            responses: submission.responses,
            service: submission.service,
            service_type: submission.service_type,
            payment_amount: submission.payment_amount,
            userId: {
              _id: submission.userId._id,
              first_name: submission.userId.first_name,
              last_name: submission.userId.last_name,
              email: submission.userId.email,
            },
            status: submission.status,
            payment_status: submission.payment_status,
            createdAt: submission.createdAt,
            formId: {
              _id: submission.formId._id,
              welcome_title: submission.formId.welcome_title,
              slug: submission.formId.slug,
              questions: submission.formId.questions || [],
            },
          });
        }
      }
    });

    return this.transformSubmissionsForList(typedSubmissions, formsMap);
  }

  async updateApplicationStatus(
    id: string,
    status: ApplicationStatus,
  ): Promise<UserSubmission> {
    const updated = await this.submissionModel.findByIdAndUpdate(
      id,
      { status },
      { new: true, runValidators: true },
    );

    if (!updated) {
      throw new NotFoundException('Application not found.');
    }

    return updated;
  }

  async updatePaymentStatus(
    id: string,
    paymentStatus: PaymentStatus,
  ): Promise<UserSubmission> {
    const updated = await this.submissionModel.findByIdAndUpdate(
      id,
      { payment_status: paymentStatus },
      { new: true, runValidators: true },
    );

    if (!updated) {
      throw new NotFoundException('Application not found.');
    }

    return updated;
  }

  async getTrainingParticipants(trainingName?: string): Promise<any[]> {
    const filter: any = {
      status: ApplicationStatus.Approved,
      payment_status: PaymentStatus.Paid,
    };

    if (trainingName && trainingName.trim() !== '') {
      filter.service = new RegExp(trainingName.trim(), 'i');
    } else {
      filter.service_type = new RegExp('Digital Skills & Training', 'i');
    }

    const submissions = await this.submissionModel
      .find(filter)
      .select('+service_type +timetable_url +end_date')
      .populate({
        path: 'userId',
        select: 'first_name last_name email', // ✅ ADD THIS: Populate user data
      })
      .exec();

    if (submissions.length === 0) {
      throw new NotFoundException(
        `No approved and paid participants found for ${trainingName || 'digital skills & training'}.`,
      );
    }

    const services = await this.serviceModel.find().exec();
    const servicePriceMap = services.reduce((map, service) => {
      map[service.name] = service.price;
      return map;
    }, {});

    return this.transformTrainingsList(submissions, servicePriceMap);
  }

  async updateTrainingDetails(
    trainingName: string,
    updateDto: UpdateTrainingDetailsDto,
    file: Express.Multer.File,
  ): Promise<any[]> {
    const updatePayload: any = {};
    let timetable_url: string | undefined;

    if (file) {
      try {
        const sanitizedName = trainingName
          .replace(/[^a-z0-9]/gi, '_')
          .toLowerCase();
        const filename = `${sanitizedName}-timetable-${Date.now()}`;
        const folder = 'training_timetables';

        const uploadResult = await this.uploadService.uploadImage(
          file,
          filename,
          folder,
        );
        timetable_url = uploadResult.secure_url;
      } catch (error) {
        this.logger.error('Cloudinary Upload Error:', error);
        throw new BadRequestException(
          'Failed to upload timetable file to cloud storage.',
        );
      }
    } else if (updateDto.timetable_url) {
      timetable_url = updateDto.timetable_url;
    }

    if (timetable_url) {
      updatePayload.timetable_url = timetable_url;
    }

    if (updateDto.start_date) {
      updatePayload.start_date = new Date(updateDto.start_date);
    }
    if (updateDto.end_date) {
      updatePayload.end_date = new Date(updateDto.end_date);
    }

    if (Object.keys(updatePayload).length === 0) {
      throw new BadRequestException(
        'No valid update fields (file, URL, start date, or end date) were provided.',
      );
    }

    const filter: any = {
      service: new RegExp(trainingName.trim(), 'i'),
      status: ApplicationStatus.Approved,
      payment_status: PaymentStatus.Paid,
    };

    // Get all affected submissions before updating (to get user IDs)
    const affectedSubmissions = await this.submissionModel
      .find(filter)
      .select('+userId +service')
      .exec();

    if (affectedSubmissions.length === 0) {
      throw new NotFoundException(
        `No approved and paid participants found for training "${trainingName}" to update.`,
      );
    }

    // ✅ CORE FUNCTIONALITY: Update training details
    const updateResult = await this.submissionModel
      .updateMany(filter, { $set: updatePayload })
      .exec();

    const updatedSubmissions = await this.submissionModel
      .find(filter)
      .select('+service_type +timetable_url +start_date +end_date')
      .exec();

    const services = await this.serviceModel.find().exec();
    const servicePriceMap = services.reduce((map, service) => {
      map[service.name] = service.price;
      return map;
    }, {});

    // 🔔 OPTIONAL: Send notifications (wrapped in try-catch to not block main flow)
    // This runs asynchronously and won't affect the response
    setImmediate(async () => {
      try {
        this.logger.log(
          `Starting to send notifications to ${affectedSubmissions.length} users for training "${trainingName}"`,
        );

        const notificationPromises = affectedSubmissions.map(
          async (submission) => {
            try {
              const user = await this.userRepository.findById(
                submission.userId.toString(),
              );

              if (!user) {
                this.logger.warn(
                  `User not found for submission ${submission._id}`,
                );
                return;
              }

              // Build notification message based on what was updated
              let message = `Training details for "${trainingName}" have been updated. `;
              const updates: string[] = [];

              if (timetable_url) {
                updates.push('A new timetable has been uploaded');
              }
              if (updateDto.start_date) {
                const formattedDate = new Date(
                  updateDto.start_date,
                ).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                });
                updates.push(`Start date: ${formattedDate}`);
              }
              if (updateDto.end_date) {
                const formattedDate = new Date(
                  updateDto.end_date,
                ).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                });
                updates.push(`End date: ${formattedDate}`);
              }

              if (updates.length > 0) {
                message += updates.join('. ') + '.';
              }

              await this.notificationService.create({
                user_id: user._id.toString(),
                title: `Training Update: ${trainingName}`,
                message,
                type: NotificationType.SYSTEM_ANNOUNCEMENT,
                priority: NotificationPriority.HIGH,
                metadata: {
                  training_name: trainingName,
                  timetable_url,
                  start_date: updateDto.start_date,
                  end_date: updateDto.end_date,
                  submission_id: submission._id,
                  action_url: timetable_url || '/trainings',
                },
                expires_in_days: 90,
              });

              this.logger.log(
                `✅ Training update notification sent to user ${user._id} for ${trainingName}`,
              );
            } catch (notificationError) {
              // Log but don't throw - continue with other notifications
              this.logger.error(
                `❌ Failed to send notification to user ${submission.userId}:`,
                notificationError.message,
              );
            }
          },
        );

        // Wait for all notifications (failures won't affect main flow)
        const results = await Promise.allSettled(notificationPromises);

        const successCount = results.filter(
          (r) => r.status === 'fulfilled',
        ).length;
        const failureCount = results.filter(
          (r) => r.status === 'rejected',
        ).length;

        this.logger.log(
          `📧 Notification summary for "${trainingName}": ${successCount} sent successfully, ${failureCount} failed`,
        );
      } catch (error) {
        this.logger.error(
          `❌ Error in notification batch process for training "${trainingName}":`,
          error.message,
        );
      }
    });

    // ✅ Return immediately without waiting for notifications
    return this.transformTrainingsList(updatedSubmissions, servicePriceMap);
  }
  async getTotalApplicationsCount(): Promise<number> {
    return this.userSubmissionRepository.count({});
  }

  async getTotalAssessmentsCompletedCount(): Promise<number> {
    return this.userAssessmentRepository.count({});
  }
  // Add this method to your admin-application.service.ts or wherever getApplicationList is located

  async getApplicationSubmissionStats(year?: number): Promise<any> {
    const currentYear = year || new Date().getFullYear();

    // Filter for applications submitted in the specified year
    const filter: any = {
      createdAt: {
        $gte: new Date(`${currentYear}-01-01T00:00:00.000Z`),
        $lte: new Date(`${currentYear}-12-31T23:59:59.999Z`),
      },
    };

    // Aggregate applications by month
    const stats = await this.submissionModel.aggregate([
      { $match: filter },
      {
        $group: {
          _id: { $month: '$createdAt' },
          totalApplications: { $sum: 1 },
          applicationDetails: {
            $push: {
              _id: '$_id',
              userId: '$userId',
              service_type: '$service_type',
              status: '$status',
              payment_status: '$payment_status',
              created_at: '$createdAt',
            },
          },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    // Fill all 12 months with default 0
    const allMonths = Array.from({ length: 12 }, (_, i) => ({
      month: new Intl.DateTimeFormat('en', { month: 'short' }).format(
        new Date(currentYear, i),
      ),
      month_number: i + 1,
      year: currentYear,
      total_applications: 0,
      application_details: [],
    }));

    // Replace with actual data where it exists
    stats.forEach((s) => {
      const monthIndex = s._id - 1;

      const applicationDetails = s.applicationDetails.map((app: any) => ({
        _id: app._id,
        // userId: app.userId,
        service_type: app.service_type || 'N/A',
        status: app.status,
        payment_status: app.payment_status,
        created_date: new Date(app.created_at).toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        }),
        created_time: new Date(app.created_at).toLocaleTimeString('en-US', {
          hour: '2-digit',
          minute: '2-digit',
          hour12: true,
        }),
      }));

      allMonths[monthIndex] = {
        month: allMonths[monthIndex].month,
        month_number: monthIndex + 1,
        year: currentYear,
        total_applications: s.totalApplications,
        application_details: applicationDetails,
      };
    });

    const totalApplications = stats.reduce(
      (sum, s) => sum + s.totalApplications,
      0,
    );
    const monthsWithActivity = stats.length;
    const averageApplicationsPerMonth =
      monthsWithActivity > 0
        ? Math.round(totalApplications / monthsWithActivity)
        : 0;

    // Get breakdown by status
    const statusBreakdown = await this.submissionModel.aggregate([
      { $match: filter },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
        },
      },
    ]);

    // Get breakdown by service type
    const serviceTypeBreakdown = await this.submissionModel.aggregate([
      { $match: filter },
      {
        $group: {
          _id: '$service_type',
          count: { $sum: 1 },
        },
      },
      { $sort: { count: -1 } },
    ]);

    // Get breakdown by payment status
    const paymentStatusBreakdown = await this.submissionModel.aggregate([
      { $match: filter },
      {
        $group: {
          _id: '$payment_status',
          count: { $sum: 1 },
        },
      },
    ]);

    return {
      success: true,
      message: 'Application submission stats retrieved successfully',
      data: {
        year: currentYear,
        summary: {
          total_applications: totalApplications,
          months_with_submissions: monthsWithActivity,
          average_applications_per_month: averageApplicationsPerMonth,
        },
        monthly_breakdown: allMonths,
        breakdown_by_status: statusBreakdown.map((item) => ({
          status: item._id || 'Unknown',
          count: item.count,
        })),
        breakdown_by_service_type: serviceTypeBreakdown.map((item) => ({
          service_type: item._id || 'Unknown',
          count: item.count,
        })),
        breakdown_by_payment_status: paymentStatusBreakdown.map((item) => ({
          payment_status: item._id || 'Unknown',
          count: item.count,
        })),
        generated_at: new Date().toISOString(),
        generated_date: new Date().toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        }),
        generated_time: new Date().toLocaleTimeString('en-US', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: true,
        }),
      },
    };
  }

  async getApplicationSubmissionYearlyStats(): Promise<any> {
    const currentYear = new Date().getFullYear();
    // Calculate the starting year for the 6-year range (current year - 5)
    const startYear = currentYear - 5;

    // Filter for applications submitted in the last 6 years
    const filter: any = {
      createdAt: {
        $gte: new Date(`${startYear}-01-01T00:00:00.000Z`),
        $lte: new Date(`${currentYear}-12-31T23:59:59.999Z`),
      },
    };

    // 1. Aggregate applications by year
    const stats = await this.submissionModel.aggregate([
      { $match: filter },
      {
        $group: {
          _id: { $year: '$createdAt' }, // Group by year
          totalApplications: { $sum: 1 },
          // Note: applicationDetails are NOT included for yearly stats
        },
      },
      { $sort: { _id: 1 } },
    ]);

    // 2. Fill all 6 years with default 0
    const allYears = Array.from({ length: 6 }, (_, i) => ({
      year: startYear + i,
      total_applications: 0,
    }));

    // 3. Replace with actual data where it exists
    stats.forEach((s) => {
      const yearIndex = s._id - startYear;

      if (yearIndex >= 0 && yearIndex < 6) {
        allYears[yearIndex] = {
          year: s._id,
          total_applications: s.totalApplications,
        };
      }
    });

    const totalApplications = stats.reduce(
      (sum, s) => sum + s.totalApplications,
      0,
    );
    const yearsWithActivity = stats.length;
    const averageApplicationsPerYear =
      yearsWithActivity > 0
        ? Math.round(totalApplications / yearsWithActivity)
        : 0;

    // 4. Get breakdown by status across the 6-year range
    const statusBreakdown = await this.submissionModel.aggregate([
      { $match: filter },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
        },
      },
    ]);

    // 5. Get breakdown by service type across the 6-year range
    const serviceTypeBreakdown = await this.submissionModel.aggregate([
      { $match: filter },
      {
        $group: {
          _id: '$service_type',
          count: { $sum: 1 },
        },
      },
      { $sort: { count: -1 } },
    ]);

    // 6. Get breakdown by payment status across the 6-year range
    const paymentStatusBreakdown = await this.submissionModel.aggregate([
      { $match: filter },
      {
        $group: {
          _id: '$payment_status',
          count: { $sum: 1 },
        },
      },
    ]);

    return {
      success: true,
      message: 'Application submission yearly stats retrieved successfully',
      data: {
        start_year: startYear,
        end_year: currentYear,
        summary: {
          total_applications: totalApplications,
          years_with_submissions: yearsWithActivity,
          average_applications_per_year: averageApplicationsPerYear,
        },
        yearly_breakdown: allYears,
        breakdown_by_status: statusBreakdown.map((item) => ({
          status: item._id || 'Unknown',
          count: item.count,
        })),
        breakdown_by_service_type: serviceTypeBreakdown.map((item) => ({
          service_type: item._id || 'Unknown',
          count: item.count,
        })),
        breakdown_by_payment_status: paymentStatusBreakdown.map((item) => ({
          payment_status: item._id || 'Unknown',
          count: item.count,
        })),
        generated_at: new Date().toISOString(),
      },
    };
  }
}
