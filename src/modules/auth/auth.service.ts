/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/restrict-template-expressions */
/* eslint-disable @typescript-eslint/no-unsafe-enum-comparison */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-require-imports */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unused-vars */
import * as bcrypt from 'bcryptjs';
import { Inject, Injectable, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

import { JwtUserPayload } from './interfaces/jwt-user-payload.interface';
import { LoginReqDto, LoginResDto } from './dtos/login.dto';
import { SignupReqDto, SignupResDto } from './dtos/signup.dto';

import { MailerService } from '../mailer/mailer.service';
import { Constants } from '../../shared/constants';

import { TokenQueryService } from '../token/token.query-service';
import { BadRequestException } from '../../exceptions/bad-request.exception';
import { UnauthorizedException } from '../../exceptions/unauthorized.exception';
// import {
//   forgotPasswordOtpEmail,
//   otpEmail,
//   registrationEmail,
// } from '../mailer/mailer.constants';
import { VerifyAccountDto } from './dtos/verify-email.dto';
// import { ResendEmailCodeReqDto } from './dtos/resend-email.dto';
import { ResetPasswordReqDto } from './dtos/reset-password.dto';
import { User } from '../user/user.schema';
// import { UserService } from '../user/user.service';
import { Types } from 'mongoose';
import { Repositories, UserTypes } from 'src/shared/enums';
import { BaseRepository } from '../repository/base.repository';
import { BusinessProfile } from '../profile/schemas/business.owner.schema';
import { LogoutResDto } from './dtos/logout.dto';
import { RefreshToken } from './schemas/refresh-token.schema';
import { AdminProfile } from '../profile/schemas/admin.schema';
import {
  forgotPasswordEmail,
  otpEmail,
  registrationEmail,
} from '../mailer/mailer.constants';
import {
  ChangePasswordReqDto,
  ChangePasswordResDto,
} from './dtos/change-password.dto';

@Injectable()
export class AuthService {
  private readonly SALT_ROUNDS = 10;
  private readonly logger = new Logger(AuthService.name);

  private convertJwtExpiryToMs(expiry: string | number): number {
    if (typeof expiry === 'number') return expiry * 1000; // seconds → ms

    const match = expiry.match(/^(\d+)([smhd])$/);
    if (!match) throw new Error(`Invalid expiry format: ${expiry}`);

    const value = parseInt(match[1], 10);
    const unit = match[2];

    switch (unit) {
      case 's':
        return value * 1000;
      case 'm':
        return value * 60 * 1000;
      case 'h':
        return value * 60 * 60 * 1000;
      case 'd':
        return value * 24 * 60 * 60 * 1000;
      default:
        throw new Error(`Unsupported time unit: ${unit}`);
    }
  }

  constructor(
    @Inject(Repositories.UserRepository)
    private readonly userRepository: BaseRepository<User>,
    private readonly jwtService: JwtService,
    private readonly mailService: MailerService,
    private readonly tokenQueryService: TokenQueryService,
    @Inject(Repositories.BusinessOwnerRepository)
    private readonly businessProfileRepository: BaseRepository<BusinessProfile>,
    @Inject(Repositories.AdminRepository)
    private readonly adminProfileRepository: BaseRepository<AdminProfile>,

    @Inject(Repositories.RefreshTokenRepository)
    private readonly refreshTokenRepository: BaseRepository<RefreshToken>,
  ) {}

  // In auth.service.ts

  async signup(signupReqDto: SignupReqDto): Promise<SignupResDto> {
    const { first_name, last_name, business_name, role, password } =
      signupReqDto;
    const email = signupReqDto.email.toLowerCase();

    const user = await this.userRepository.findOne({ email });
    if (user) {
      throw BadRequestException.RESOURCE_ALREADY_EXISTS(
        `User with email ${email} already exists`,
      );
    }
    const saltOrRounds = this.SALT_ROUNDS;
    const hashedPassword = await bcrypt.hash(password, saltOrRounds);
    const token = this.generateCode().toString();

    const { fullToken, verificationLink: generatedLink } =
      await this.generateVerificationLink(
        token,
        email,
        'registration',
        'auth/verification',
        // '/',
      );

    const userPayload: Partial<User> = {
      first_name,
      last_name,
      business_name,
      email,
      role: role as UserTypes,
      password: hashedPassword,
      is_verified: false,
      profile_picture: '',
      is_in_recovery: false,
    };

    const createUser = await this.userRepository.create(userPayload);

    // Add the business profile creation logic here
    if (role === UserTypes.business_owner) {
      try {
        await this.businessProfileRepository.create({
          user_id: createUser._id,
          business_name: signupReqDto.business_name,
          email: signupReqDto.email,
        });
      } catch (error) {
        this.logger.error('Failed to create business profile:', error);
      }
    } else if (role === UserTypes.admin) {
      try {
        await this.adminProfileRepository.create({
          user_id: createUser._id,
          email: signupReqDto.email,
        });
      } catch (error) {
        this.logger.error('Failed to create admin profile:', error);
      }
    }
    await this.tokenQueryService.create({
      value: fullToken.trim(), // normalize
      type: 'registration',
      userType: role as UserTypes,
      userId: createUser._id,
      expiresIn: new Date(Date.now() + Constants.tokenExpiry),
    });

    const mailBody = registrationEmail(createUser, generatedLink);

    await this.mailService.sendMail({
      to: email,
      subject: 'Welcome to DigiPlus Alliance',
      text: `Welcome to DigiPlus Alliance, ${first_name}!`,
      html: mailBody,
    });

    return {
      success: true,
      message: 'User created successfully',
    };
  }

  /**
   * Handle Google Sign-In
   */
  async googleLogin(googleUser: any): Promise<any> {
    try {
      const { email, first_name, last_name, profile_picture, google_id } =
        googleUser;

      let user = await this.userRepository.findOne({ email });

      if (!user) {
        user = await this.userRepository.create({
          email,
          first_name,
          last_name,
          profile_picture,
          google_id,
          role: UserTypes.business_owner,
          is_verified: true,
          password: 'GOOGLE_AUTH_USER',
          isGoogleUser: true,
        });

        await this.businessProfileRepository.create({
          user_id: user._id,
          email: user.email,
          business_name: `${first_name} ${last_name}`,
        });

        this.logger.log(`New user created via Google: ${user._id}`);
      } else {
        if (!user.google_id) {
          await this.userRepository.update(
            { _id: user._id },
            {
              google_id,
              profile_picture: profile_picture || user.profile_picture,
              is_verified: true,
            },
          );
        }

        await this.userRepository.update(
          { _id: user._id },
          { last_login: new Date() },
        );

        this.logger.log(`User logged in via Google: ${user._id}`);
      }

      const payload = {
        sub: user._id,
        email: user.email,
        role: user.role,
        first_name: user.first_name,
        last_name: user.last_name,
      };

      const access_token = await this.jwtService.signAsync(payload);

      this.logger.log(`User logged in via Google: ${user.email}`);

      return {
        success: true,
        message: 'Google authentication successful',
        data: {
          access_token,
          user: {
            id: user._id,
            email: user.email,
            first_name: user.first_name,
            last_name: user.last_name,
            role: user.role,
            profile_picture: user.profile_picture,
            is_verified: user.is_verified,
          },
        },
      };
    } catch (error) {
      this.logger.error('Error in Google login:', error);
      throw error;
    }
  }
  async verifyEmail(
    verifyAccountDto: VerifyAccountDto,
  ): Promise<SignupResDto & { resetToken?: string }> {
    let verificationCode: string = '',
      verificationFor: string = '',
      email: string = '';

    await this.jwtService
      .verifyAsync(verifyAccountDto.token)
      .then((result) => {
        verificationCode = result.code;
        verificationFor = result.verificationFor;
        email = result.email;
      })
      .catch(() => {
        throw UnauthorizedException.UNAUTHORIZED_ACCESS(
          'Invalid verification link',
        );
      });

    if (!email || !verificationCode || !verificationFor) {
      throw UnauthorizedException.UNAUTHORIZED_ACCESS(
        'Invalid verification link',
      );
    }

    const user = await this.userRepository.findOne({ email });
    if (!user) {
      throw UnauthorizedException.UNAUTHORIZED_ACCESS('Invalid credentials');
    }

    const receivedToken = verifyAccountDto.token;
    const findToken = await this.tokenQueryService.findToken({
      userId: user._id,
      type: verificationFor,
      // value: verificationCode,
      value: receivedToken,
      userType: user.role,
    });

    if (!findToken) {
      throw UnauthorizedException.UNAUTHORIZED_ACCESS(
        'Invalid verification link',
      );
    }

    user.is_verified = true;

    let resetToken: string | undefined = undefined;

    if (verificationFor === 'password-reset') {
      user.is_verified_for_recovery = true;
      const payload = {
        user: user._id,
        email: user.email,
        first_name: user.first_name,
        last_name: user.last_name,
      };
      resetToken = await this.jwtService.signAsync(payload, {
        expiresIn: Constants.resetTokenExpiry,
      });
    }

    await this.userRepository.update({ _id: user._id }, user);

    await this.tokenQueryService.deleteToken(findToken._id as Types.ObjectId);

    return {
      success: true,
      message:
        verificationFor === 'password-reset'
          ? 'Verification successful, please reset your password'
          : 'Email verified successfully',
      resetToken,
    };
  }

  async forgotPassword(email: string): Promise<SignupResDto> {
    const user = await this.userRepository.findOne({
      email: email.toLowerCase(),
    });

    if (!user) {
      return {
        success: true,
        message:
          'If the email is registered, a password reset link has been sent.',
      };
    }

    // Generate reset token directly with user info
    const resetToken = await this.jwtService.signAsync(
      {
        user: user._id,
        email: user.email,
        type: 'password-reset',
      },
      {
        expiresIn: Constants.resetTokenExpiry,
      },
    );

    const resetLink = `${process.env.CLIENT_URL}/auth/reset-password?token=${resetToken}`;

    await this.mailService.sendMail({
      to: email,
      subject: 'Password Reset Request',
      html: forgotPasswordEmail(user, resetLink),
    });

    return {
      success: true,
      message: 'A password reset link has been sent to your email.',
    };
  }

  async resetPassword(
    resetPasswordReqDto: ResetPasswordReqDto,
  ): Promise<SignupResDto> {
    const { password, resetToken } = resetPasswordReqDto;

    try {
      const decoded = await this.jwtService.verifyAsync(resetToken);

      if (decoded.type !== 'password-reset') {
        throw new Error('Invalid token type');
      }

      const user = await this.userRepository.findOne({ email: decoded.email });
      if (!user) {
        throw new Error('User not found');
      }

      const newHashedPassword = await bcrypt.hash(password, this.SALT_ROUNDS);

      await this.userRepository.update(
        { _id: user._id },
        { password: newHashedPassword },
      );
      await this.refreshTokenRepository.deleteMany({ user: user._id });

      return { success: true, message: 'Password reset successfully.' };
    } catch (error) {
      throw UnauthorizedException.INVALID_RESET_PASSWORD_TOKEN(
        'Invalid or expired reset token',
      );
    }
  }

  //change password
  async changePassword(
    userId: Types.ObjectId,
    changePasswordReqDto: ChangePasswordReqDto,
  ): Promise<ChangePasswordResDto> {
    const { oldPassword, newPassword } = changePasswordReqDto;

    // Find the user
    const user = await this.userRepository.findOne({ _id: userId });
    if (!user) {
      throw UnauthorizedException.RESOURCE_NOT_FOUND('User not found');
    }

    // Verify the old password
    const isOldPasswordValid = await bcrypt.compare(oldPassword, user.password);
    if (!isOldPasswordValid) {
      throw UnauthorizedException.UNAUTHORIZED_ACCESS(
        'Current password is incorrect',
      );
    }

    // Check if new password is the same as old password
    const isSamePassword = await bcrypt.compare(newPassword, user.password);
    if (isSamePassword) {
      throw BadRequestException.BAD_REQUEST(
        'New password must be different from the current password',
      );
    }

    const hashedNewPassword = await bcrypt.hash(newPassword, this.SALT_ROUNDS);

    await this.userRepository.update(
      { _id: userId },
      { password: hashedNewPassword },
    );

    await this.refreshTokenRepository.deleteMany({ user: userId });

    return {
      success: true,
      message:
        'Password changed successfully. Please login again on all devices.',
    };
  }

  generateCode(): number {
    const OTP_MIN = 100000;
    const OTP_MAX = 999999;
    return Math.floor(Math.random() * (OTP_MAX - OTP_MIN + 1)) + OTP_MIN;
  }

  async generateVerificationLink(
    code: string,
    email: string,
    verificationFor: string,
    linkFor?: string,
  ): Promise<{ fullToken: string; verificationLink: string }> {
    const token = await this.jwtService.signAsync(
      { code, email, verificationFor },
      {
        expiresIn: Constants.tokenExpiry,
      },
    );

    const baseUrl = process.env.CLIENT_URL;
    const url = linkFor ? `${baseUrl}/${linkFor}` : `${baseUrl}`;
    const verificationLink = `${url}?token=${token}`;

    // Return both the full JWT and the final link
    return { fullToken: token, verificationLink };
  }

  async login(loginReqDto: LoginReqDto): Promise<LoginResDto> {
    const { password } = loginReqDto;

    const email = loginReqDto.email.toLowerCase();
    const user = await this.userRepository.findOne({ email });
    if (!user) {
      throw UnauthorizedException.UNAUTHORIZED_ACCESS('Invalid credentials');
    }

    // if (!user.is_verified) {
    //   throw UnauthorizedException.UNAUTHORIZED_ACCESS(
    //     'Account not verified. Please check your email.',
    //   );
    // }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      if (user.locked_until && user.locked_until < new Date()) {
        await this.userRepository.update(
          { _id: user._id },
          { locked_until: null, login_attempts: 2 },
        );
        throw UnauthorizedException.UNAUTHORIZED_ACCESS('Invalid credentials');
      }
      if (user.login_attempts === 0) {
        await this.userRepository.update(
          { _id: user._id },
          { lockedUntil: new Date(Date.now() + Constants.lockedAccountTime) },
        );
        throw UnauthorizedException.UNAUTHORIZED_ACCESS(
          'Account locked. Please contact support.',
        );
      }

      await this.userRepository.update(
        { _id: user._id },
        { loginAttempts: user.login_attempts ? user.login_attempts - 1 : 2 },
      );

      throw UnauthorizedException.UNAUTHORIZED_ACCESS('Invalid credentials');
    }

    const payload: JwtUserPayload = {
      user: user._id,
      email: user.email,
      role: user.role,
    };

    // Generate access token with short expiry
    const accessToken = await this.jwtService.signAsync(payload, {
      expiresIn: Constants.accessTokenExpiry,
    });

    // Generate refresh token with longer expiry
    const refreshToken = await this.jwtService.signAsync(payload, {
      expiresIn: Constants.refreshTokenExpiry,
    });

    const refreshTokenExpiryMs = this.convertJwtExpiryToMs(
      Constants.refreshTokenExpiry,
    );

    await this.refreshTokenRepository.create({
      token: refreshToken,
      user: user._id,
      expiresAt: new Date(Date.now() + refreshTokenExpiryMs),
    });
    const businessProfile = await this.businessProfileRepository.findOne({
      userId: user._id,
    });

    await this.userRepository.update(
      { _id: user._id },
      {
        login_attempts: 3,
        locked_until: null,
        is_in_recovery: false,
        is_verified_for_recovery: false,
        last_login: new Date(),
      },
    );

    const {
      password: userPassword,
      isInRecovery,
      isVerifiedForRecovery,
      lockedUntil,
      ...otherData
    } = user.toObject();

    return {
      message: 'Login successful',
      accessToken,
      refreshToken,
      user: { ...otherData, onboarded: businessProfile ? true : false },
    };
  }

  async logout(
    accessToken: string,
    refreshToken: string,
  ): Promise<LogoutResDto> {
    try {
      if (refreshToken) {
        const decodedRefreshToken = this.jwtService.decode(refreshToken);
        if (decodedRefreshToken) {
          const foundRefreshToken = await this.refreshTokenRepository.findOne({
            token: refreshToken,
            user: decodedRefreshToken.user,
          });

          if (foundRefreshToken) {
            await this.refreshTokenRepository.delete({
              _id: foundRefreshToken._id,
            });
          }
        }
      }

      return {
        message: 'Logout successful',
      };
    } catch (error) {
      this.logger.error('Logout error:', error);
      throw UnauthorizedException.UNAUTHORIZED_ACCESS('Failed to logout');
    }
  }

  async refreshToken(refreshToken: string): Promise<string> {
    try {
      // Verify the refresh token is valid and not expired
      const decoded = await this.jwtService.verifyAsync(refreshToken);

      if (!decoded || !decoded.user) {
        throw UnauthorizedException.INVALID_RESET_PASSWORD_TOKEN(
          'Invalid refresh token',
        );
      }

      // Check if refresh token exists in database and is not expired
      const storedToken = await this.refreshTokenRepository.findOne({
        token: refreshToken,
        expiresAt: { $gt: new Date() },
      });

      if (!storedToken) {
        throw UnauthorizedException.INVALID_RESET_PASSWORD_TOKEN(
          'Refresh token expired or invalid',
        );
      }

      // Generate new access token
      const newAccessToken = await this.jwtService.signAsync(
        {
          user: new Types.ObjectId(decoded.user as string),
          email: decoded.email,
          role: decoded.role,
        },
        { expiresIn: Constants.accessTokenExpiry },
      );

      return newAccessToken;
    } catch (error) {
      this.logger.error('Refresh token error:', error);
      throw UnauthorizedException.UNAUTHORIZED_ACCESS(
        'Failed to refresh token',
      );
    }
  }

  async requestVerificationLink(email: string): Promise<SignupResDto> {
    const user = await this.userRepository.findOne({
      email: email.toLowerCase(),
    });
    if (!user) {
      throw UnauthorizedException.RESOURCE_NOT_FOUND('User Not Found');
    }

    if (user.is_verified) {
      throw UnauthorizedException.UNAUTHORIZED_ACCESS('Email already verified');
    }

    const token = this.generateCode().toString();
    const { fullToken, verificationLink } = await this.generateVerificationLink(
      token,
      email,
      'registration',
      'auth/verification',
    );

    const findToken = await this.tokenQueryService.findAToken({
      userId: user._id,
      type: 'registration',
      userType: user.role,
    });

    if (findToken) {
      if (findToken.expiresIn && findToken.expiresIn > new Date()) {
        throw BadRequestException.RESOURCE_ALREADY_EXISTS(
          'Verification link already sent',
        );
      } else {
        await this.tokenQueryService.updateToken({
          _id: findToken._id,
          value: fullToken,
          expiresIn: new Date(Date.now() + Constants.tokenExpiry),
          userId: user._id,
          type: 'registration',
          userType: user.role,
        });
        const mailBody = otpEmail(user.first_name, verificationLink);

        await this.mailService.sendMail({
          to: email,
          subject: 'Please verify your email address',
          text: `Welcome to DigiPlus, ${user.first_name}!`,
          html: mailBody,
        });

        return {
          success: true,
          message: 'Verification link sent successfully',
        };
      }
    } else {
      await this.tokenQueryService.create({
        value: fullToken,
        type: 'registration',
        userType: user.role,
        userId: user._id,
        expiresIn: new Date(Date.now() + Constants.tokenExpiry),
      });

      const mailBody = otpEmail(user.first_name, verificationLink);

      await this.mailService.sendMail({
        to: email,
        subject: 'Please verify your email address',
        text: `Welcome to DigiPlus, ${user.first_name}!`,
        html: mailBody,
      });

      return {
        success: true,
        message: 'Verification link sent successfully',
      };
    }
  }

  private async generateRandomPassword(): Promise<string> {
    const randomBytes = require('crypto').randomBytes(16);
    const randomPassword = randomBytes.toString('hex');
    const saltOrRounds = this.SALT_ROUNDS;
    return await bcrypt.hash(randomPassword, saltOrRounds);
  }
}
