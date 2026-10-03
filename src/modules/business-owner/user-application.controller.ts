import {
  Controller,
  Post,
  Body,
  Get,
  UseGuards,
  Param,
  HttpStatus,
  UseFilters,
  Req,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiBody,
} from '@nestjs/swagger';
import { UserApplicationService } from './user-application.service';
import { SubmissionDto } from './submission.dto';
import { UserSubmission } from './user-submission.schema';
import { ApplicationForm } from '../admin/application/schemas/application-form.schema';
import { JwtUserAuthGuard } from '../auth/guards/jwt-user-auth.guard';
import { RolesGuard } from 'src/common/guards/roles.guard';
import { Roles } from 'src/common/decorators/roles.decorator';
import { UserTypes } from 'src/shared/enums';
import { FormListItemDto } from './form-list-item.dto';
import { MongooseExceptionFilter } from 'src/filters/mongoose-exception.filter';
import { MongoExceptionFilter } from 'src/filters/mongo-exception.filter';

@ApiTags('User Applications')
@ApiBearerAuth()
@UseGuards(JwtUserAuthGuard)
@UseFilters(MongoExceptionFilter, MongooseExceptionFilter)
@Controller('user/applications')
export class UserApplicationController {
  constructor(
    private readonly userApplicationService: UserApplicationService,
  ) {}

  @Post(':slug/submit')
  @UseGuards(RolesGuard)
  @Roles(UserTypes.business_owner)
  @ApiOperation({ summary: 'Submit a new application form' })
  @ApiBody({
    type: SubmissionDto,
    examples: {
      a: {
        summary: 'Example submission payload',
        value: {
          responses: {
            company_name: 'DigiPlus Alliance',
            first_name: 'John',
            last_name: 'Doe',
            email: 'johndoe@example.com',
            phone_number: '+2348012345678',
            reason_for_applying: 'I want to join the digital community.',
          },
          service: 'Digital Transformation Advisory',
        },
      },
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Application submitted successfully.',
    schema: {
      example: {
        _id: '654c6a654c6a4654c6a654c6a',
        responses: {
          'company-name': 'DigiPlus Alliance',
          'first-name': 'John',
          'last-name': 'Doe',
          email: 'johndoe@example.com',
          'phone-number': '+2348012345678',
          'reason-for-applying': 'I want to join the digital community.',
        },
        service: 'Digital Transformation Advisory',
        // serviceType: 'Ecosystem Building', // This is populated by the backend//
        status: 'Submitted',
        payment_status: 'Not Paid',
        createdAt: '2025-09-25T10:00:00.000Z',
        updatedAt: '2025-09-25T10:00:00.000Z',
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Bad Request. The request body is invalid.',
  })
  @ApiResponse({
    status: 404,
    description: 'The selected service was not found.',
  })
  async submitApplication(
    @Param('slug') slug: string,
    @Body() submissionDto: SubmissionDto,
    @Req() req: any,
  ): Promise<UserSubmission> {
    const userId = req.user._id;

    return this.userApplicationService.submitApplication(
      slug,
      submissionDto,
      userId,
    );
  }

  @Get()
  @ApiOperation({ summary: 'Get a list of all live application forms' })
  @ApiResponse({
    status: 200,
    description: 'Forms retrieved successfully.',
    type: [FormListItemDto],
    schema: {
      example: [
        {
          id: 'student-admission-form', // Updated example to use slug
          welcome_title: 'Student Admission Form',
          welcome_description: 'This form is for new student admissions.',
        },
      ],
    },
  })
  @ApiResponse({
    status: 200,
    description: 'No active forms were found.',
    schema: {
      example: {
        message: 'No active forms were found.',
        data: [],
      },
    },
  })
  async getLiveForms(): Promise<FormListItemDto[]> {
    return this.userApplicationService.getLiveFormsList();
  }

  @Get('submissions')
  @ApiOperation({
    summary: 'Get a list of all submissions for the authenticated user',
  })
  @ApiResponse({
    status: 200,
    description: 'User submissions retrieved successfully.',
    type: [UserSubmission],
  })
  async getUserSubmissions(@Req() req: any): Promise<UserSubmission[]> {
    const userId = req.user._id;
    return this.userApplicationService.getUserSubmissions(userId);
  }

  @Get('submissions/status-counts')
  @ApiOperation({
    summary:
      'Get the count of user submissions under each status (Submitted, Approved, etc.)',
  })
  @ApiResponse({
    status: 200,
    description: 'Status counts retrieved successfully.',
    schema: {
      example: {
        Submitted: 5,
        'Being Processed': 2,
        Approved: 1,
        Rejected: 0,
        Completed: 0,
      },
    },
  })
  async getSubmissionStatusCounts(
    @Req() req: any,
  ): Promise<Record<string, number>> {
    const userId = req.user._id;
    return this.userApplicationService.getSubmissionStatusCounts(userId);
  }

  // UPDATED: Endpoint to use slug instead of formId
  @Get(':slug/questions')
  @ApiOperation({ summary: 'Get questions for a specific form by slug' })
  @ApiResponse({
    status: 200,
    description: 'Questions retrieved successfully.',
    schema: {
      example: {
        _id: '654c6a654c6a4654c6a654c6a',
        welcome_title: 'Welcome to Our Assessment',
        welcome_description: 'This assessment helps us understand your needs.',
        welcome_instruction:
          'Please read the instructions carefully before proceeding. This will take approximately 10 minutes to complete.',
        questions: [
          {
            type: 'short_text',
            question: 'Company Name',
            data_key: 'companyname',
            is_required: true,
            step: 1,
            module_ref: 'contact-module',
          },
          // ... (other questions)
        ],
        isLive: true,
      },
    },
  })
  @ApiResponse({
    status: 404,
    description:
      'Application form with the provided slug not found or is not live.',
  })
  async getFormQuestions(
    @Param('slug') slug: string,
  ): Promise<ApplicationForm> {
    return this.userApplicationService.getFormBySlug(slug);
  }
}
