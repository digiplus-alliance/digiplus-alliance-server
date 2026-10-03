import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  HttpCode,
  ValidationPipe,
  Put,
  UseInterceptors,
  UploadedFile,
  UseGuards,
} from '@nestjs/common';
import { ProfileService } from './profile.service';
import { BusinessOwnerProfileBaseDto } from './dtos/business-owner.dto';
import { AdminProfileBaseDto } from './dtos/admin.dto';
import { UpdateBusinessProfileDto } from './dtos/update-business-profile.dto';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiOkResponse,
  ApiTags,
} from '@nestjs/swagger';
import { BusinessProfileResDto } from './dtos/business-profile.res.dto';
// import { AdminProfileResDto } from './dtos/admin-profile.res.dto';
import { AdminProfileResDto } from './dtos/admin-profile.res.dto';
import { GetUser } from '../auth/decorators/get-user.decorator';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtUserAuthGuard } from '../auth/guards/jwt-user-auth.guard';
import { UpdateAdminProfileDto } from './dtos/update-admin-profile.dto';

@ApiBearerAuth()
@ApiTags('Profile')
@UseGuards(JwtUserAuthGuard)
@Controller('profile')
export class ProfileController {
  constructor(private readonly profileService: ProfileService) {}

  @ApiOkResponse({
    type: BusinessProfileResDto,
  })
  @HttpCode(200)
  @Get('business')
  async getBusinessProfile(@GetUser() user) {
    return await this.profileService.getBusinessProfile(user._id);

    // Make sure you pass the value (string) to the service
    // return this.profileService.getBusinessProfile(user._id?.toString());
  }

  // @ApiOkResponse({
  //   type: BusinessProfileResDto,
  // })
  // @HttpCode(200)
  // @Patch('business')
  // async updateBusinessProfile(
  //   @GetUser() user,
  //   @Body(ValidationPipe) businessProfile: UpdateBusinessProfileDto, // Corrected DTO
  // ) {
  //   return await this.profileService.updateBusinessProfile({
  //     ...businessProfile,
  //     userId: user._id,
  //   });
  // }
  @Patch('business')
  @ApiConsumes('multipart/form-data')
  @ApiBody({ type: UpdateBusinessProfileDto })
  @UseInterceptors(FileInterceptor('org_logo'))
  async updateBusinessProfile(
    @GetUser() user,
    @UploadedFile() file: Express.Multer.File,
    @Body(ValidationPipe) businessProfile: UpdateBusinessProfileDto,
  ) {
    return await this.profileService.updateBusinessProfile(
      { ...businessProfile, userId: user._id }, // ✅ only DTO + userId
      file, // ✅ pass file separately
    );
  }

  // New endpoint for admins
  @ApiOkResponse({
    type: AdminProfileResDto,
  })
  @HttpCode(200)
  @Get('admin')
  async getAdminProfile(@GetUser() user) {
    return await this.profileService.getAdminProfile(user._id);
  }

  // New endpoint for admins
  @ApiOkResponse({
    type: AdminProfileResDto,
  })
  @HttpCode(200)
  @Patch('admin')
  async updateAdminProfile(
    @GetUser() user,
    @Body(ValidationPipe) adminProfile: UpdateAdminProfileDto,
  ) {
    return await this.profileService.updateAdminProfile({
      ...adminProfile,
      userId: user._id,
    });
  }

  @HttpCode(201)
  @ApiOkResponse({
    type: AdminProfileResDto,
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        org_logo: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
  @Post('uploadlogo')
  @UseInterceptors(FileInterceptor('org_logo'))
  async uploadLogo(@GetUser() user, @UploadedFile() file: Express.Multer.File) {
    return await this.profileService.uploadLogo(file, user._id);
  }
}
