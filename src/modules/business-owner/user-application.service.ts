import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { UserSubmission } from './user-submission.schema';
import { SubmissionDto } from './submission.dto';
import { ApplicationForm } from '../admin/application/schemas/application-form.schema';
import { FormListItemDto } from './form-list-item.dto';
import { Service } from '../admin/services/schemas/service.schema';
import { ApplicationStatus } from 'src/shared/enums';
import {
  applicationAdminEmail,
  applicationUserEmail,
} from '../mailer/mailer.constants';
import { Repositories } from '../../shared/enums/db.enum';
import { BaseRepository } from '../repository/base.repository';
import { User } from '../user/user.schema';
import { MailerService } from '../mailer/mailer.service';
import { NotificationService } from '../notification/notification.service';
import {
  NotificationPriority,
  NotificationType,
} from '../notification/schemas/notification.schema';

type FormProjection = {
  _id: string;
  welcome_title: string;
  welcome_description?: string;
  slug?: string;
};

@Injectable()
export class UserApplicationService {
  private readonly logger = new Logger(UserApplicationService.name);

  constructor(
    @InjectModel(ApplicationForm.name)
    private applicationFormModel: Model<ApplicationForm>,
    @InjectModel(UserSubmission.name)
    private submissionModel: Model<UserSubmission>,
    @InjectModel(Service.name)
    private serviceModel: Model<Service>,
    @Inject(Repositories.UserRepository)
    private readonly userRepository: BaseRepository<User>,
    private readonly mailService: MailerService,
    private readonly notificationService: NotificationService,
  ) {}

  private transformUserSubmissions(submissions: any[]): any[] {
    return submissions.map((submission) => {
      const firstName = submission.responses['first_name'] || 'N/A';
      const lastName = submission.responses['last_name'] || '';
      const name = `${firstName} ${lastName}`.trim();

      const submissionTime = new Date(submission.createdAt).toLocaleString();

      const startDate = submission.start_date
        ? new Date(submission.start_date).toLocaleString()
        : null;

      const endDate = submission.end_date
        ? new Date(submission.end_date).toLocaleString()
        : null;

      const serviceInfo = submission.serviceDetails || {};

      return {
        _id: submission._id,
        name,
        email: submission.responses['email'] || 'N/A',
        service: submission.service,
        service_type: submission.service_type,
        service_image: serviceInfo.image || null,
        payment_amount: submission.payment_amount || null,
        status: submission.status,
        payment_status: submission.payment_status,
        submission_time: submissionTime,
        start_date: startDate,
        end_date: endDate,
        timetable_url: submission.timetable_url || null,
      };
    });
  }

  async getLiveFormsList(): Promise<FormListItemDto[]> {
    const forms = await this.applicationFormModel
      .find({ isLive: true })
      .select('slug welcome_title welcome_description')
      .exec();

    return forms.map((form) => {
      const projectedForm = form.toObject() as FormProjection;
      if (!projectedForm.slug) {
        throw new Error('Form is missing a required slug.');
      }
      return {
        id: projectedForm.slug,
        welcome_title: projectedForm.welcome_title,
        welcome_description: projectedForm.welcome_description || '',
      };
    });
  }

  async getFormBySlug(slug: string): Promise<ApplicationForm> {
    const form = await this.applicationFormModel
      .findOne({
        slug: slug,
        isLive: true,
      })
      .exec();

    if (!form) {
      throw new NotFoundException('Application form not found or is not live.');
    }

    return form;
  }

  // async submitApplication(
  //   slug: string,
  //   submissionDto: SubmissionDto,
  //   userId: string,
  // ): Promise<UserSubmission> {
  //   const { responses, service } = submissionDto;

  //   const form = await this.applicationFormModel.findOne({
  //     slug,
  //     isLive: true,
  //   });
  //   if (!form) {
  //     throw new NotFoundException('Application form not found or is not live.');
  //   }

  //   const selectedService = await this.serviceModel.findOne({ name: service });
  //   if (!selectedService) {
  //     throw new NotFoundException('Selected service not found.');
  //   }

  //   const formQuestions = new Map();
  //   form.questions.forEach((question) => {
  //     if (question.data_key) {
  //       formQuestions.set(question.data_key, {
  //         isRequired: question.is_required,
  //         question: question.question,
  //       });
  //     }
  //   });

  //   const submittedResponsesKeys = new Set(Object.keys(responses));

  //   form.questions.forEach((question) => {
  //     if (
  //       question.is_required &&
  //       question.data_key &&
  //       !submittedResponsesKeys.has(question.data_key)
  //     ) {
  //       throw new BadRequestException(
  //         `The required question '${question.question}' (data_key: '${question.data_key}') was not provided in the submission.`,
  //       );
  //     }
  //   });

  //   submittedResponsesKeys.forEach((key) => {
  //     if (!formQuestions.has(key)) {
  //       throw new BadRequestException(
  //         `The submitted field '${key}' does not correspond to a question in the form.`,
  //       );
  //     }
  //   });

  //   const newSubmission = new this.submissionModel({
  //     responses,
  //     service,
  //     userId,
  //     service_type: selectedService.service_type,
  //     formId: form._id,
  //     payment_amount: selectedService.price,
  //   });

  //   try {
  //     const savedSubmission = await newSubmission.save();

  //     // ✅ Fetch user details
  //     const user = await this.userRepository.findById(userId);

  //     // 📧 Send confirmation email to user
  //     if (user?.email) {
  //       const userMailBody = applicationUserEmail(
  //         user,
  //         service,
  //         responses,
  //         formQuestions,
  //       );

  //       await this.mailService.sendMail({
  //         to: user.email,
  //         subject: `Application Submitted - ${service}`,
  //         html: userMailBody,
  //       });
  //     }

  //     // 📧 Send notification email to admin
  //     const adminEmail = process.env.ADMIN_EMAIL || 'admin@digiplus.com';
  //     const adminMailBody = applicationAdminEmail(
  //       user,
  //       service,
  //       responses,
  //       formQuestions,
  //       selectedService.price,
  //     );

  //     await this.mailService.sendMail({
  //       to: adminEmail,
  //       subject: `New Application - ${service}`,
  //       html: adminMailBody,
  //     });

  //     // 🔔 Send in-app notification to user
  //     if (user) {
  //       try {
  //         await this.notificationService.create({
  //           user_id: user._id.toString(),
  //           title: 'Application Submitted Successfully',
  //           message: `Your application for "${service}" has been submitted successfully. We'll review it and get back to you soon.`,
  //           type: NotificationType.APPLICATION_SUBMITTED,
  //           priority: NotificationPriority.MEDIUM,
  //           metadata: {
  //             application_id: savedSubmission._id,
  //             service_name: service,
  //             service_type: selectedService.service_type,
  //             action_url: '',
  //           },
  //           expires_in_days: 60,
  //         });
  //         this.logger.log(
  //           `✅ Application submission notification sent to user ${user._id}`,
  //         );
  //       } catch (error) {
  //         this.logger.error(
  //           `❌ Failed to send application notification to user ${user._id}`,
  //           error,
  //         );
  //       }
  //     }

  //     return savedSubmission;
  //   } catch (error) {
  //     console.error('Failed to save submission:', error.message);
  //     throw error;
  //   }
  // }

  // user-application.service.ts

  async submitApplication(
    slug: string,
    submissionDto: SubmissionDto,
    userId: string,
  ): Promise<UserSubmission> {
    const { responses, service } = submissionDto;

    const form = await this.applicationFormModel.findOne({
      slug,
      isLive: true,
    });
    if (!form) {
      throw new NotFoundException('Application form not found or is not live.');
    }

    const selectedService = await this.serviceModel.findOne({ name: service });
    if (!selectedService) {
      throw new NotFoundException('Selected service not found.');
    }

    const formQuestions = new Map();
    form.questions.forEach((question) => {
      if (question.data_key) {
        formQuestions.set(question.data_key, {
          isRequired: question.is_required,
          question: question.question,
        });
      }
    });

    const submittedResponsesKeys = new Set(Object.keys(responses));

    form.questions.forEach((question) => {
      if (
        question.is_required &&
        question.data_key &&
        !submittedResponsesKeys.has(question.data_key)
      ) {
        throw new BadRequestException(
          `The required question '${question.question}' (data_key: '${question.data_key}') was not provided in the submission.`,
        );
      }
    });

    submittedResponsesKeys.forEach((key) => {
      if (!formQuestions.has(key)) {
        throw new BadRequestException(
          `The submitted field '${key}' does not correspond to a question in the form.`,
        );
      }
    });

    const newSubmission = new this.submissionModel({
      responses,
      service,
      userId,
      service_type: selectedService.service_type,
      formId: form._id,
      payment_amount: selectedService.price,
    });

    try {
      const savedSubmission = await newSubmission.save();

      // ✅ Fetch user details
      const user = await this.userRepository.findById(userId);

      // 📧 Send emails and notifications in background (non-blocking)
      setImmediate(async () => {
        try {
          // Email to user
          const userEmailPromise = user?.email
            ? this.mailService.sendMail({
                to: user.email,
                subject: `Application Submitted - ${service}`,
                html: applicationUserEmail(
                  user,
                  service,
                  responses,
                  formQuestions,
                ),
              })
            : Promise.resolve();

          // Email to admin
          const adminEmail = process.env.ADMIN_EMAIL || 'admin@digiplus.com';
          const adminEmailPromise = this.mailService.sendMail({
            to: adminEmail,
            subject: `New Application - ${service}`,
            html: applicationAdminEmail(
              user,
              service,
              responses,
              formQuestions,
              selectedService.price,
            ),
          });

          // User notification
          const userNotificationPromise = user
            ? this.notificationService.create({
                user_id: user._id.toString(),
                title: 'Application Submitted Successfully',
                message: `Your application for "${service}" has been submitted successfully. We'll review it and get back to you soon.`,
                type: NotificationType.APPLICATION_SUBMITTED,
                priority: NotificationPriority.MEDIUM,
                metadata: {
                  application_id: savedSubmission._id,
                  service_name: service,
                  service_type: selectedService.service_type,
                  action_url: '',
                },
                expires_in_days: 60,
              })
            : Promise.resolve();

          // ✅ NEW: Admin notification
          const adminNotificationPromise = user
            ? this.notificationService.notifyAdminsNewApplication(
                user._id.toString(),
                `${user.first_name} ${user.last_name}`.trim() || user.email,
                service,
                (savedSubmission._id as Types.ObjectId).toString(),
              )
            : Promise.resolve();

          // Run all concurrently
          const [
            userEmailResult,
            adminEmailResult,
            userNotificationResult,
            adminNotificationResult,
          ] = await Promise.allSettled([
            userEmailPromise,
            adminEmailPromise,
            userNotificationPromise,
            adminNotificationPromise, // ✅ Add this
          ]);

          // Log results
          if (userEmailResult.status === 'fulfilled') {
            this.logger.log(`✅ User email sent to ${user?.email}`);
          } else {
            this.logger.error(
              `❌ Failed to send user email:`,
              userEmailResult.reason?.message,
            );
          }

          if (adminEmailResult.status === 'fulfilled') {
            this.logger.log(`✅ Admin email sent`);
          } else {
            this.logger.error(
              `❌ Failed to send admin email:`,
              adminEmailResult.reason?.message,
            );
          }

          if (userNotificationResult.status === 'fulfilled') {
            this.logger.log(`✅ User notification sent`);
          } else {
            this.logger.error(
              `❌ Failed to send user notification:`,
              userNotificationResult.reason?.message,
            );
          }

          // ✅ NEW: Log admin notification result
          if (adminNotificationResult.status === 'fulfilled') {
            this.logger.log(
              `✅ Admin notifications sent for application ${savedSubmission._id}`,
            );
          } else {
            this.logger.error(
              `❌ Failed to send admin notifications:`,
              adminNotificationResult.reason?.message,
            );
          }
        } catch (error) {
          this.logger.error(`❌ Error in background process:`, error.message);
        }
      });

      // ✅ Return immediately
      return savedSubmission;
    } catch (error) {
      this.logger.error('Failed to save submission:', error.message);
      throw error;
    }
  }
  async getUserSubmissions(userId: string): Promise<any[]> {
    const submissions = await this.submissionModel
      .aggregate([
        {
          $match: { userId: new Types.ObjectId(userId) },
        },

        {
          $lookup: {
            from: 'services',
            localField: 'service',
            foreignField: 'name',
            as: 'serviceDetails',
          },
        },

        {
          $unwind: {
            path: '$serviceDetails',
            preserveNullAndEmptyArrays: true,
          },
        },

        {
          $project: {
            responses: 1,
            service: 1,
            service_type: 1,
            payment_amount: 1,
            status: 1,
            payment_status: 1,
            start_date: 1,
            end_date: 1,
            timetable_url: 1,
            createdAt: 1,
            serviceDetails: {
              image: '$serviceDetails.image',
              images: '$serviceDetails.images',
              price: '$serviceDetails.price',
              discounted_price: '$serviceDetails.discounted_price',
              pricing_unit: '$serviceDetails.pricing_unit',
            },
          },
        },
      ])
      .exec();

    return this.transformUserSubmissions(submissions);
  }

  async getSubmissionStatusCounts(
    userId: string,
  ): Promise<Record<string, number>> {
    const pipeline = [
      {
        $match: {
          userId: new Types.ObjectId(userId),
        },
      },

      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
        },
      },
    ];

    const results = await this.submissionModel.aggregate(pipeline).exec();

    // 3. Initialize the final map with all statuses set to 0
    const finalCounts: Record<string, number> = Object.values(
      ApplicationStatus,
    ).reduce(
      (acc, status) => {
        acc[status] = 0;
        return acc;
      },
      {} as Record<string, number>,
    );

    // 4. Merge aggregation results into the final map
    results.forEach((result) => {
      if (result._id && finalCounts.hasOwnProperty(result._id)) {
        finalCounts[result._id] = result.count;
      }
    });

    return finalCounts;
  }
}
