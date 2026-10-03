/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  Request,
  Patch,
  Logger,
  Query,
  Delete,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBody,
  ApiParam,
  ApiQuery,
  ApiOkResponse,
} from '@nestjs/swagger';
import { AssessmentService } from './assessment.service';
import {
  CreateAssessmentDto,
  CreateAssessmentResDto,
} from './dto/create-assessment.dto';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserTypes } from '../../shared/enums';
import { JwtUserAuthGuard } from '../auth/guards/jwt-user-auth.guard';
import {
  UpdateAssessmentDto,
  UpdateAssessmentResDto,
} from './dto/update-assessment.dto';
import {
  SubmitAssessmentDto,
  SubmitAssessmentResDto,
} from './dto/submit-assessment.dto';
import {
  GetUserStatsParamsDto,
  GetUserStatsQueryDto,
} from './dto/get-user-stats.dto';
import { BadRequestException } from 'src/exceptions';
import { PublishAssessmentDto } from './dto/publish-assessment.dto';
import { UserStatsResponseDto } from './dto/user-stats-response.dto';

@ApiTags('Assessments')
@Controller('api/assessments')
@UseGuards(JwtUserAuthGuard)
@ApiBearerAuth()
export class AssessmentController {
  constructor(private readonly assessmentService: AssessmentService) {}
  private readonly logger = new Logger(AssessmentController.name);

  // Admin Routes
  @Post()
  @UseGuards(RolesGuard)
  @Roles(UserTypes.admin)
  @ApiOperation({
    summary: 'Create Assessment with Questions',
    description:
      'Create a comprehensive assessment with modules and questions of different types. Each question type has specific requirements and properties.',
  })
  @ApiBody({
    type: CreateAssessmentDto,
    description: 'Assessment creation with different question type examples',
    examples: {
      'Welcome Screen Only': {
        summary: 'Assessment with Welcome Screen',
        description: 'Simple assessment starting with a welcome screen',
        value: {
          title: 'Digital Readiness Assessment',
          description: 'Evaluate your digital transformation readiness',
          instruction: 'Please complete all sections honestly',
          modules: [
            {
              temp_id: 'intro-module',
              title: 'Introduction',
              description: 'Welcome and overview',
              order: 1,
            },
          ],
          questions: [
            {
              type: 'welcome_screen',
              question: 'Assessment Welcome',
              welcome_title: 'Digital Readiness Assessment',
              welcome_description:
                'Welcome! This assessment will help us understand your current digital capabilities and provide personalized recommendations. It takes about 10-15 minutes to complete.',
              welcome_instruction:
                'Click the button below to begin your digital transformation assessment journey.',
              step: 1,
              module_ref: 'intro-module',
              is_active: true,
            },
          ],
          is_active: true,
        },
      },
      'Multiple Choice Assessment': {
        summary: 'Assessment with Multiple Choice Questions',
        description: 'Assessment focusing on multiple choice questions',
        value: {
          title: 'Digital Skills Evaluation',
          description: 'Assess your digital skill levels',
          modules: [
            {
              temp_id: 'skills-module',
              title: 'Digital Skills',
              description: 'Evaluate current digital capabilities',
              order: 1,
            },
          ],
          questions: [
            {
              type: 'module_title',
              question: 'Module Introduction',
              module_title: 'Digital Skills Assessment',
              module_description:
                'In this section, we will evaluate your familiarity with digital tools and technologies.',
              step: 1,
              module_ref: 'skills-module',
            },
            {
              type: 'multiple_choice',
              question:
                'What best describes your current level of digital tool usage?',
              description:
                'Select the option that most accurately reflects your situation',
              instruction: 'Choose only one option',
              options: [
                {
                  id: 'opt-1',
                  text: 'Minimal - Basic email and web browsing',
                  points: 1,
                },
                {
                  id: 'opt-2',
                  text: 'Basic - Office applications and simple online tools',
                  points: 2,
                },
                {
                  id: 'opt-3',
                  text: 'Intermediate - Multiple digital tools for business',
                  points: 3,
                },
                {
                  id: 'opt-4',
                  text: 'Advanced - Integrated digital solutions',
                  points: 4,
                },
                {
                  id: 'opt-5',
                  text: 'Expert - Leading digital transformation',
                  points: 5,
                },
              ],
              is_required: true,
              step: 2,
              module_ref: 'skills-module',
            },
          ],
        },
      },
      'Checkbox Assessment': {
        summary: 'Assessment with Checkbox Questions',
        description:
          'Assessment using checkbox questions for multiple selections',
        value: {
          title: 'Current Tools Assessment',
          modules: [
            {
              temp_id: 'tools-module',
              title: 'Current Digital Tools',
              order: 1,
            },
          ],
          questions: [
            {
              type: 'checkbox',
              question:
                'Which digital tools do you currently use in your business?',
              description: 'Select all tools that you actively use',
              instruction: 'You can select multiple options',
              options: [
                {
                  id: 'opt-1',
                  text: 'Email marketing tools (Mailchimp, Constant Contact)',
                  points: 1,
                },
                {
                  id: 'opt-2',
                  text: 'Social media management (Hootsuite, Buffer)',
                  points: 1,
                },
                {
                  id: 'opt-3',
                  text: 'Customer relationship management (CRM)',
                  points: 1,
                },
                {
                  id: 'opt-4',
                  text: 'E-commerce platforms (Shopify, WooCommerce)',
                  points: 1,
                },
                {
                  id: 'opt-5',
                  text: 'Accounting software (QuickBooks, Xero)',
                  points: 1,
                },
                {
                  id: 'opt-6',
                  text: 'Project management tools (Trello, Asana)',
                  points: 1,
                },
              ],
              min_selections: 1,
              max_selections: 6,
              is_required: true,
              step: 1,
              module_ref: 'tools-module',
            },
          ],
        },
      },
      'Text Input Assessment': {
        summary: 'Assessment with Text Questions',
        description: 'Assessment using short and long text input questions',
        value: {
          title: 'Business Information Assessment',
          modules: [
            {
              temp_id: 'business-module',
              title: 'Business Information',
              order: 1,
            },
          ],
          questions: [
            {
              type: 'short_text',
              question: 'What is the name of your business?',
              description: 'Please enter your business or organization name',
              placeholder: 'e.g., ABC Marketing Solutions',
              max_character: 100,
              min_character: 2,
              is_required: true,
              step: 1,
              module_ref: 'business-module',
            },
            {
              type: 'long_text',
              question:
                'Describe your biggest challenges with digital transformation',
              description:
                'Please provide specific examples from your experience',
              instruction:
                'Write at least 3-4 sentences with specific examples',
              placeholder:
                'e.g., Our team struggles with adopting new software because of limited training time...',
              max_character: 1000,
              min_character: 50,
              rows: 5,
              is_required: true,
              step: 2,
              module_ref: 'business-module',
            },
          ],
        },
      },
      'Grid Assessment': {
        summary: 'Assessment with Grid Questions',
        description: 'Assessment using multiple choice grid questions',
        value: {
          title: 'Digital Maturity Grid Assessment',
          modules: [
            {
              temp_id: 'maturity-module',
              title: 'Digital Maturity Evaluation',
              order: 1,
            },
          ],
          questions: [
            {
              type: 'multiple_choice_grid',
              question:
                'For each business area below, how would you rate your current digital maturity?',
              description:
                'Rate each area based on your current digital adoption and effectiveness',
              instruction: 'Select one option for each row',
              grid_columns: [
                { id: 'col-1', text: 'Not Digitized', points: 1 },
                { id: 'col-2', text: 'Basic Digital Tools', points: 2 },
                { id: 'col-3', text: 'Integrated Systems', points: 3 },
                { id: 'col-4', text: 'Advanced Analytics', points: 4 },
                { id: 'col-5', text: 'AI-Powered Optimization', points: 5 },
              ],
              grid_rows: [
                { id: 'row-1', text: 'Customer relationship management' },
                { id: 'row-2', text: 'Sales and marketing processes' },
                { id: 'row-3', text: 'Financial management and reporting' },
                { id: 'row-4', text: 'Inventory and supply chain management' },
              ],
              is_required: true,
              step: 1,
              module_ref: 'maturity-module',
            },
          ],
        },
      },
      'Dropdown Assessment': {
        summary: 'Assessment with Dropdown Questions',
        description: 'Assessment using dropdown selection questions',
        value: {
          title: 'Business Profile Assessment',
          modules: [
            {
              temp_id: 'profile-module',
              title: 'Business Profile',
              order: 1,
            },
          ],
          questions: [
            {
              type: 'dropdown',
              question:
                'What industry does your business primarily operate in?',
              description:
                'Select the industry that best matches your business',
              placeholder: 'Select your industry',
              options: [
                { id: 'opt-1', text: 'Technology & Software', points: 1 },
                { id: 'opt-2', text: 'Healthcare & Medical', points: 2 },
                { id: 'opt-3', text: 'Education & Training', points: 3 },
                { id: 'opt-4', text: 'Finance & Banking', points: 4 },
                { id: 'opt-5', text: 'Manufacturing', points: 5 },
                { id: 'opt-6', text: 'Retail & E-commerce', points: 6 },
                { id: 'opt-7', text: 'Professional Services', points: 7 },
                { id: 'opt-8', text: 'Other', points: 8 },
              ],
              is_required: true,
              step: 1,
              module_ref: 'profile-module',
            },
          ],
        },
      },
      'Assessment With File Upload Question': {
        summary: 'Create assessment with file upload question',
        description:
          'Assessment containing a file upload question for document submission',
        value: {
          title: 'Business Verification Assessment',
          description: 'Collect required business documents',
          instruction: 'Upload all required documents clearly',
          modules: [
            {
              temp_id: 'verification-module',
              title: 'Business Verification',
              description: 'Upload business documents',
              order: 1,
            },
          ],
          questions: [
            {
              type: 'file_upload',
              question: 'Upload your business registration certificate',
              description:
                'Provide a clear and valid copy of your business registration',
              upload_instructions:
                'Accepted formats: PDF, JPG, PNG. Maximum size: 5MB',
              allowed_file_types: [
                'application/pdf',
                'image/jpeg',
                'image/png',
              ],
              max_file_size: 5,
              min_files: 1,
              max_files: 3,
              is_required: true,
              max_points: 10,
              step: 1,
              module_ref: 'verification-module',
            },
          ],
          is_active: true,
        },
      },
      'Complete Points-Based Assessment': {
        summary: 'Complete Assessment with Service Recommendations',
        description:
          'Full example showing point-based scoring for service recommendations',
        value: {
          title: 'Digital Maturity Assessment with Service Recommendations',
          description:
            'Comprehensive evaluation with personalized service suggestions',
          instruction:
            'Answer all questions to receive personalized service recommendations',
          modules: [
            {
              temp_id: 'skills-module',
              title: 'Digital Skills Assessment',
              description: 'Evaluate current capabilities',
              order: 1,
              max_points: 25,
            },
            {
              temp_id: 'tools-module',
              title: 'Current Tools Usage',
              description: 'Assess existing digital infrastructure',
              order: 2,
              max_points: 30,
            },
          ],
          questions: [
            {
              type: 'welcome_screen',
              question: 'Welcome',
              welcome_title: 'Digital Maturity Assessment',
              welcome_description:
                'This assessment will recommend the best services for your digital transformation journey.',
              welcome_instruction: 'Begin your personalized assessment now.',
              step: 1,
              module_ref: 'skills-module',
            },
            {
              type: 'multiple_choice',
              question: 'What is your current digital skill level?',
              options: [
                {
                  id: 'skill-1',
                  text: 'Beginner - Learning basics',
                  points: 2,
                  points_description: 'Needs comprehensive support',
                },
                {
                  id: 'skill-2',
                  text: 'Intermediate - Comfortable with tools',
                  points: 5,
                  points_description: 'Ready for moderate solutions',
                },
                {
                  id: 'skill-3',
                  text: 'Advanced - Leading digital initiatives',
                  points: 8,
                  points_description: 'Suitable for complex implementations',
                },
              ],
              max_points: 8,
              scoring_categories: ['digital_literacy', 'leadership_readiness'],
              step: 2,
              module_ref: 'skills-module',
            },
            {
              type: 'checkbox',
              question: 'Which tools do you currently use?',
              options: [
                {
                  id: 'tool-1',
                  text: 'Basic Office Tools',
                  points: 2,
                  points_description: 'Foundation tools',
                },
                {
                  id: 'tool-2',
                  text: 'CRM Systems',
                  points: 4,
                  points_description: 'Customer management',
                },
                {
                  id: 'tool-3',
                  text: 'Advanced Analytics',
                  points: 6,
                  points_description: 'Data-driven insights',
                },
              ],
              scoring_method: 'sum',
              max_points: 12,
              scoring_categories: ['tool_adoption', 'data_maturity'],
              step: 3,
              module_ref: 'tools-module',
            },
            {
              type: 'multiple_choice_grid',
              question: 'Rate your digital maturity in each area',
              grid_columns: [
                {
                  id: 'maturity-1',
                  text: 'Basic',
                  points: 1,
                  points_description: 'Getting started',
                },
                {
                  id: 'maturity-2',
                  text: 'Intermediate',
                  points: 3,
                  points_description: 'Making progress',
                },
                {
                  id: 'maturity-3',
                  text: 'Advanced',
                  points: 5,
                  points_description: 'Leading edge',
                },
              ],
              grid_rows: [
                {
                  id: 'area-1',
                  text: 'Customer Management',
                  weight: 1.5,
                },
                {
                  id: 'area-2',
                  text: 'Data Analytics',
                  weight: 1.2,
                },
              ],
              max_points: 15,
              scoring_categories: ['process_maturity', 'analytics_readiness'],
              step: 4,
              module_ref: 'tools-module',
            },
          ],
          service_recommendations: [
            {
              service_id: 'basic_package',
              service_name: 'Digital Foundation Package',
              description: 'Essential tools and training for digital beginners',
              min_points: 0,
              max_points: 15,
              levels: ['Beginner', 'Foundational'],
            },
            {
              service_id: 'intermediate_package',
              service_name: 'Digital Growth Package',
              description: 'Integrated solutions for growing businesses',
              min_points: 16,
              max_points: 30,
              levels: ['Beginner', 'Foundational'],
            },
            {
              service_id: 'advanced_package',
              service_name: 'Digital Leadership Package',
              description: 'Advanced analytics and AI-powered solutions',
              min_points: 31,
              max_points: 50,
              levels: ['Beginner', 'Foundational'],
            },
          ],
          is_active: true,
        },
      },
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Assessment created successfully',
    type: CreateAssessmentResDto,
  })
  async createAssessment(
    @Body() createAssessmentDto: CreateAssessmentDto,
    @Request() req,
  ): Promise<CreateAssessmentResDto> {
    return this.assessmentService.createAssessment(
      createAssessmentDto,
      req.user.user,
    );
  }

  @Patch(':id/publish')
  @UseGuards(RolesGuard)
  @Roles(UserTypes.admin)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Publish or Unpublish assessment (Admin only)',
    description: 'Toggle assessment publication status with one endpoint',
  })
  @ApiParam({
    name: 'id',
    description: 'Assessment ID',
    type: 'string',
  })
  @ApiResponse({
    status: 200,
    description: 'Assessment publication status updated successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid request',
  })
  @ApiResponse({
    status: 404,
    description: 'Assessment not found',
  })
  async togglePublishAssessment(
    @Param('id') assessmentId: string,
    @Body() body: PublishAssessmentDto,
  ) {
    return await this.assessmentService.togglePublishAssessment(
      assessmentId,
      body.is_published,
    );
  }

  @Get()
  @UseGuards(RolesGuard)
  @Roles(UserTypes.admin)
  @ApiOperation({ summary: 'Get all assessments (Admin only)' })
  @ApiResponse({
    status: 200,
    description: 'Assessments retrieved successfully',
  })
  async getAssessments(@Request() req): Promise<any> {
    return this.assessmentService.getAssessments(req.user.user as string);
  }

  @Get('available')
  @ApiOperation({ summary: 'Get available assessments for users' })
  @ApiResponse({
    status: 200,
    description: 'Available assessments retrieved successfully',
  })
  async getAvailableAssessments(): Promise<any> {
    return this.assessmentService.getAvailableAssessments();
  }

  //added by opeyemi
  @Post('submit')
  @ApiOperation({ summary: 'Submit assessment answers' })
  @ApiResponse({
    status: 200,
    description: 'Assessment submitted successfully',
    type: SubmitAssessmentResDto,
  })
  async submitAssessment(
    @Body() submitAssessmentDto: SubmitAssessmentDto,
    @Request() req, // Assumes req.user.user contains the authenticated user's ID string
  ): Promise<SubmitAssessmentResDto> {
    const { assessment_id, responses, user_id } = submitAssessmentDto; // Destructure the DTO

    // Use the authenticated user's ID as the final argument,
    // falling back to the DTO's user_id if needed, or null/undefined if not present.

    const authUserId = req.user?._id?.toString();
    // Use the ID from auth first, then the body.
    const finalUserId = authUserId || user_id;
    this.logger.log(`Attempting submission with finalUserId: [${finalUserId}]`); // <-- ADD THIS LOG

    // Ensure finalUserId is a non-empty string before calling the service
    if (!finalUserId) {
      throw BadRequestException.BAD_REQUEST(
        'User authentication failed or ID is missing.',
      );
    }

    // ✅ CORRECT CALL: Pass the arguments in the order the Service expects them.
    return this.assessmentService.submitAssessment(
      assessment_id, // Argument 1: string
      responses, // Argument 2: Record<string, any> (object)
      finalUserId, // Argument 3: string | undefined
    );
  }

  @Get('user/submissions')
  @ApiOperation({ summary: 'Get current user assessment submissions' })
  @ApiQuery({
    name: 'startDate',
    required: false,
    example: '2025-09-01',
    description:
      'Filter assessments completed on or after this date (ISO format)',
  })
  @ApiQuery({
    name: 'endDate',
    required: false,
    example: '2025-09-30',
    description:
      'Filter assessments completed on or before this date (ISO format)',
  })
  @ApiQuery({
    name: 'minScore',
    required: false,
    example: 30,
    description: 'Minimum user score',
  })
  @ApiQuery({
    name: 'maxScore',
    required: false,
    example: 80,
    description: 'Maximum user score',
  })
  @ApiResponse({
    status: 200,
    description: 'User assessments retrieved successfully',
    schema: {
      example: {
        success: true,
        message: 'User assessments retrieved successfully',
        data: [
          {
            user_id: '68d76eea50c4b6fd7da5fc05',
            assessment_id: '68d76eea50c4b6fd7da5fc06',
            user_score: 45,
            max_possible_score: 100,
            percentage_score: 45,
            completed_at: '2025-09-15T10:30:00.000Z',
          },
        ],
      },
    },
  })
  async getUserAssessments(
    @Request() req,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('minScore') minScore?: number,
    @Query('maxScore') maxScore?: number,
  ): Promise<any> {
    return this.assessmentService.getUserAssessments(req.user._id, {
      startDate,
      endDate,
      minScore: minScore ? Number(minScore) : undefined,
      maxScore: maxScore ? Number(maxScore) : undefined,
    });
  }

  @Get('stats')
  @UseGuards(RolesGuard)
  @Roles(UserTypes.admin)
  @ApiOperation({
    summary:
      'Admin: Get system-wide assessment submission statistics by month for a specified year',
  })
  @ApiQuery({
    name: 'year',
    required: false,
    type: Number,
    description: 'Year to get stats for (defaults to current year)',
    example: 2025,
  })
  @ApiOkResponse({
    description:
      'System-wide monthly assessment statistics retrieved successfully',
    schema: {
      example: {
        success: true,
        message: 'All assessment submission stats retrieved successfully',
        data: {
          year: 2025,
          summary: {
            total_submissions: 1024,
            overall_average_score: 78,
            months_with_submissions: 10,
          },
          monthly_breakdown: [
            {
              month: 'Jan',
              year: 2025,
              average_score: 80,
              submissions: 120,
              submission_details: [
                {
                  assessment_id: '507f1f77bcf86cd799439011',
                  user_id: '507f1f77bcf86cd799439012',
                  user_score: 40,
                  max_possible_score: 50,
                  percentage_score: 80,
                  completed_date: 'January 15, 2025',
                  completed_time: '10:30 AM',
                },
              ],
            },
          ],
          generated_at: '2025-10-15T14:30:00.000Z',
          generated_date: 'October 15, 2025',
          generated_time: '02:30:00 PM',
        },
      },
    },
  })
  async getAllAssessmentsMonthlyStats(
    @Query('year') year?: number,
  ): Promise<any> {
    return this.assessmentService.getAllAssessmentsMonthlyStats(year);
  }
  @Get('yearlyRangeStats')
  @UseGuards(RolesGuard)
  @Roles(UserTypes.admin)
  @ApiOperation({
    summary:
      'Admin: Get system-wide assessment submission statistics for the last 6 years',
  })
  @ApiOkResponse({
    description:
      'System-wide yearly assessment statistics retrieved successfully for the last 6 years',
    schema: {
      example: {
        success: true,
        message: 'All assessment yearly stats retrieved successfully',
        data: {
          start_year: 2020,
          end_year: 2025,
          summary: {
            total_submissions: 5120,
            years_with_submissions: 6,
          },
          yearly_breakdown: [
            {
              year: 2020,
              average_score: 75,
              submissions: 800,
            },
            {
              year: 2021,
              average_score: 80,
              submissions: 1000,
            },
            {
              year: 2025,
              average_score: 78,
              submissions: 1200,
            },
          ],
          generated_at: '2025-10-15T14:30:00.000Z',
          generated_date: 'October 15, 2025',
          generated_time: '02:30:00 PM',
        },
      },
    },
  })
  async getAllAssessmentsYearlyStats(): Promise<any> {
    return this.assessmentService.getAllAssessmentsYearlyStats();
  }

  @Get('stats/:userId')
  @ApiOkResponse({
    description: 'Monthly user assessment statistics retrieved successfully',
    type: UserStatsResponseDto,
  })
  async getUserStats(
    @Param() params: GetUserStatsParamsDto,
    @Query() query: GetUserStatsQueryDto,
  ): Promise<UserStatsResponseDto> {
    return this.assessmentService.getUserMonthlyStats(
      params.userId,
      query.year ? +query.year : undefined,
    );
  }
  @Get('yearlyStats/:userId')
  @ApiOkResponse({
    description: 'Monthly user assessment statistics retrieved successfully',
    type: UserStatsResponseDto,
  })
  async getUserYearlyStats(
    @Param() params: GetUserStatsParamsDto,
  ): Promise<UserStatsResponseDto> {
    return this.assessmentService.getUserYearlyStats(params.userId);
  }

  @Get('admin/submitted-assessments')
  @UseGuards(RolesGuard)
  @Roles(UserTypes.admin)
  @ApiOperation({
    summary: 'Get all submitted assessments with user details (Admin only)',
  })
  @ApiQuery({
    name: 'page',
    required: false,
    example: 1,
    description: 'Page number for pagination',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    example: 10,
    description: 'Number of items per page',
  })
  @ApiQuery({
    name: 'search',
    required: false,
    example: 'John Doe',
    description: 'Search by user name or email',
  })
  @ApiResponse({
    status: 200,
    description: 'Submitted assessments retrieved successfully',
    schema: {
      example: {
        success: true,
        message: 'Submitted assessments retrieved successfully',
        data: {
          submissions: [
            {
              submission_id: '68d76eea50c4b6fd7da5fc07',
              assessment: {
                _id: '68d76eea50c4b6fd7da5fc06',
                title: 'Mental Health Assessment',
                description: 'Comprehensive mental health evaluation',
                total_possible_points: 100,
                is_published: true,
              },
              user: {
                _id: '68d76eea50c4b6fd7da5fc05',
                first_name: 'John',
                last_name: 'Doe',
                email: 'john.doe@example.com',
                phone_number: '+2348012345678',
                profile_picture: 'https://example.com/profile.jpg',
                organization: 'ABC Corporation',
              },
              scores: {
                user_score: 45,
                max_possible_score: 100,
                percentage_score: 45,
              },
              completed_at: '2025-09-15T10:30:00.000Z',
              completed_date: 'September 15, 2025',
              completed_time: '10:30 AM',
              time_taken_seconds: 1200,
            },
          ],
          pagination: {
            current_page: 1,
            per_page: 10,
            total_items: 50,
            total_pages: 5,
            has_next_page: true,
            has_previous_page: false,
          },
          statistics: {
            total_submissions: 50,
            average_score: 67.5,
            highest_score: 95,
            lowest_score: 30,
            average_percentage: 67.5,
          },
          filters_applied: {
            startDate: '2025-09-01',
            endDate: '2025-09-30',
          },
          generated_at: '2025-10-14T12:00:00.000Z',
        },
      },
    },
  })
  async getSubmittedAssessments(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('search') search?: string,
  ): Promise<any> {
    return this.assessmentService.getSubmittedAssessments(
      page || 1,
      limit || 10,
      search,
    );
  }

  @Get(':id')
  @UseGuards(JwtUserAuthGuard)
  @ApiOperation({ summary: 'Get assessment by ID with modules and questions' })
  @ApiResponse({
    status: 200,
    description: 'Assessment retrieved successfully',
  })
  async getAssessmentById(
    @Param('id') assesssmentId: string,
    @Request() req: any, // ✅ Get from authenticated request
    // @Query('userId') userId: string,
  ): Promise<any> {
    const userId = req.user?.id || req.user?._id;
    return this.assessmentService.getAssessmentById(assesssmentId, userId);
  }

  @Patch(':id')
  @UseGuards(RolesGuard)
  @Roles(UserTypes.admin)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Update an assessment (Admin only)',
    description:
      'Update an existing assessment with its modules, questions, and service recommendations. Only admins can update assessments.',
  })
  @ApiParam({
    name: 'id',
    description: 'Assessment ID',
    type: 'string',
    example: '507f1f77bcf86cd799439011',
  })
  @ApiBody({
    type: UpdateAssessmentDto,
    description: 'Assessment update data',
    examples: {
      basicUpdate: {
        summary: 'Basic assessment update',
        value: {
          title: 'Updated Digital Maturity Assessment',
          description: 'Updated description for better clarity',
          is_active: true,
        },
      },
      updateExistingModule: {
        summary: 'Update existing module',
        value: {
          modules: [
            {
              id: '68dd2f298117c98763ffc774',
              title: 'Updated Module Title',
              description: 'Updated description for this specific module',
              order: 1,
              max_points: 25,
            },
          ],
        },
      },
      addNewQuestion: {
        summary: 'Add new question to assessment',
        value: {
          questions: [
            {
              type: 'multiple_choice',
              question: 'How would you rate your AI adoption?',
              step: 15,
              module_id: '68f0c71326b429a820bcddd5',
              options: [
                { id: 'ai-1', text: 'No AI tools', points: 1 },
                { id: 'ai-2', text: 'Basic AI tools', points: 3 },
                { id: 'ai-3', text: 'Advanced AI', points: 5 },
              ],
            },
          ],
        },
      },
      // 🆕 NEW: Add file upload question
      addFileUploadQuestion: {
        summary: 'Add file upload question',
        value: {
          questions: [
            {
              type: 'file_upload',
              question: 'Upload your business registration certificate',
              description:
                'Please provide a clear copy of your official business registration document',
              step: 10,
              module_id: '68f0c71326b429a820bcddd5',
              upload_instructions:
                'Accepted formats: PDF, JPG, PNG. Maximum size: 5MB per file',
              allowed_file_types: [
                'application/pdf',
                'image/jpeg',
                'image/png',
              ],
              max_file_size: 5,
              min_files: 1,
              max_files: 3,
              is_required: true,
              max_points: 10,
            },
          ],
        },
      },
      // 🆕 NEW: Update existing file upload question
      updateFileUploadQuestion: {
        summary: 'Update file upload question',
        value: {
          questions: [
            {
              id: '68dd2f2c8117c98763ffc778',
              question: 'Upload updated business documents',
              upload_instructions:
                'Updated instructions: Please upload clear, legible documents',
              allowed_file_types: ['application/pdf', 'image/*', '.docx'],
              max_file_size: 10,
              max_files: 5,
            },
          ],
        },
      },
      // 🆕 NEW: Add module with file upload question
      addModuleWithFileUpload: {
        summary: 'Add new module with file upload question',
        value: {
          modules: [
            {
              temp_id: 'temp_docs_module',
              title: 'Document Verification',
              description: 'Upload required business documents',
              order: 4,
            },
          ],
          questions: [
            {
              module_id: 'temp_docs_module',
              type: 'file_upload',
              question: 'Upload business license',
              step: 1,
              upload_instructions: 'PDF or image format, max 5MB',
              allowed_file_types: ['application/pdf', 'image/*'],
              max_file_size: 5,
              min_files: 1,
              max_files: 2,
              is_required: true,
              max_points: 15,
            },
            {
              module_id: 'temp_docs_module',
              type: 'file_upload',
              question: 'Upload company logo (optional)',
              step: 2,
              upload_instructions: 'High-resolution image only',
              allowed_file_types: ['image/jpeg', 'image/png', 'image/svg+xml'],
              max_file_size: 2,
              min_files: 0,
              max_files: 1,
              is_required: false,
              max_points: 5,
            },
          ],
        },
      },
      addNewModuleAndNewQuestion: {
        summary: 'Add New Module and New Question to it',
        value: {
          modules: [
            {
              temp_id: 'temp_module_1',
              title: 'New Module: Advanced Topics',
              description: 'This is a brand new module',
              order: 3,
            },
            {
              id: 'existing_module_id_123',
              title: 'Updated Existing Module',
              order: 1,
            },
          ],
          questions: [
            {
              module_id: 'temp_module_1',
              type: 'multiple_choice',
              step: 1,
              question: 'What is the capital of France?',
              options: [
                { text: 'Paris', points: 10 },
                { text: 'London', points: 0 },
                { text: 'Berlin', points: 0 },
              ],
            },
            {
              module_id: 'existing_module_id_123',
              type: 'short_text',
              step: 2,
              question: 'Describe your experience',
              placeholder: 'Type your answer here...',
              max_character: 500,
            },
            {
              id: 'existing_question_id_456',
              question: 'Updated question text',
            },
          ],
        },
      },
      updateExistingQuestion: {
        summary: 'Update existing question',
        value: {
          questions: [
            {
              id: '507f1f77bcf86cd799439013',
              question: 'Updated: What is your digital skill level?',
              options: [
                { id: 'opt-1', text: 'Beginner', points: 2 },
                { id: 'opt-2', text: 'Intermediate', points: 5 },
                { id: 'opt-3', text: 'Advanced', points: 8 },
                { id: 'opt-4', text: 'Expert', points: 10 },
              ],
            },
          ],
        },
      },
      deleteQuestion: {
        summary: 'Delete a question',
        value: {
          questions: [
            {
              id: '68dd2f2c8117c98763ffc778',
              toDelete: true,
            },
          ],
        },
      },
      // 🆕 NEW: Delete module with its questions
      deleteModuleAndQuestions: {
        summary: 'Delete module and its questions',
        value: {
          modules: [
            {
              id: '68dd2f298117c98763ffc774',
              toDelete: true,
            },
          ],
          questions: [
            {
              id: '68dd2f2c8117c98763ffc778',
              toDelete: true,
            },
            {
              id: '68dd2f2c8117c98763ffc779',
              toDelete: true,
            },
          ],
        },
      },
      mixedOperations: {
        summary: 'Update, delete, and create questions',
        value: {
          questions: [
            {
              id: '68dd2f2c8117c98763ffc778',
              question: 'Updated question',
            },
            {
              id: '68dd2f2c8117c98763ffc779',
              toDelete: true,
            },
            {
              type: 'short_text',
              question: 'New question',
              step: 15,
              module_id: '68f0c71326b429a820bcddd5',
              placeholder: 'Enter your answer',
            },
          ],
        },
      },
      // 🆕 NEW: Complex workflow with file uploads
      complexFileUploadWorkflow: {
        summary: 'Complex: Create module, add file upload, move questions',
        value: {
          modules: [
            {
              temp_id: 'temp_verification',
              title: 'Business Verification',
              description: 'Upload all required verification documents',
              order: 1,
            },
            {
              id: 'old_module_id',
              toDelete: true,
            },
          ],
          questions: [
            // Move existing question to new module
            {
              id: 'existing_question_1',
              module_id: 'temp_verification',
            },
            // Add new file upload question
            {
              module_id: 'temp_verification',
              type: 'file_upload',
              question: 'Upload business registration',
              step: 1,
              upload_instructions: 'PDF format preferred, max 5MB',
              allowed_file_types: ['application/pdf', 'image/*'],
              max_file_size: 5,
              min_files: 1,
              max_files: 2,
              is_required: true,
              max_points: 20,
            },
            // Add another file upload
            {
              module_id: 'temp_verification',
              type: 'file_upload',
              question: 'Upload tax identification documents',
              step: 2,
              upload_instructions: 'Any official tax documents',
              allowed_file_types: ['application/pdf', '.docx'],
              max_file_size: 10,
              min_files: 1,
              max_files: 5,
              is_required: true,
              max_points: 15,
            },
            // Delete questions from old module
            {
              id: 'old_question_1',
              toDelete: true,
            },
            {
              id: 'old_question_2',
              toDelete: true,
            },
          ],
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Assessment updated successfully',
    type: UpdateAssessmentResDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Bad Request - Invalid data provided',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Can only update own assessments',
  })
  @ApiResponse({
    status: 404,
    description: 'Assessment not found',
  })
  async updateAssessment(
    @Param('id') assessmentId: string,
    @Body() updateAssessmentDto: UpdateAssessmentDto,
  ): Promise<UpdateAssessmentResDto> {
    return await this.assessmentService.updateAssessment(
      assessmentId,
      updateAssessmentDto,
    );
  }

  @Delete(':id')
  @ApiOperation({
    summary: 'Delete an assessment and all related data',
    description:
      'Deletes an assessment along with all its questions, modules, and service recommendations. Cannot delete published assessments or assessments with user submissions.',
  })
  @ApiParam({
    name: 'id',
    description: 'Assessment ID',
    example: '507f1f77bcf86cd799439011',
  })
  @ApiResponse({
    status: 200,
    description: 'Assessment deleted successfully.',
    schema: {
      example: {
        success: true,
        message: 'Assessment deleted successfully',
        data: {
          deleted_assessment_id: '507f1f77bcf86cd799439011',
          deleted_assessment_title: 'Business Readiness Assessment',
          deleted_items: {
            questions: 25,
            modules: 5,
            recommendations: 10,
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description:
      'Cannot delete published assessment or assessment with submissions.',
    schema: {
      example: {
        code: 400,
        message:
          'Cannot delete a published assessment. Please unpublish it first.',
        success: false,
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Assessment not found.',
  })
  async deleteAssessment(@Param('id') assessmentId: string): Promise<any> {
    return this.assessmentService.deleteAssessment(assessmentId);
  }
}
