import { Inject, Injectable, Logger } from '@nestjs/common';
import { InternalServerErrorException } from '../../exceptions/internal-server-error.exception';

import { Token } from './token.schema';
import { Types } from 'mongoose';
import { Identifier } from 'src/shared/types';
import { Repositories } from 'src/shared/enums';
import { BaseRepository } from '../repository/base.repository';

@Injectable()
export class TokenQueryService {
  private readonly logger = new Logger(TokenQueryService.name);

  constructor(
    @Inject(Repositories.TokenRepository)
    private readonly tokenRepository: BaseRepository<Token>,
  ) {}

  async create(token: Token): Promise<Token> {
    try {
      return await this.tokenRepository.create(token);
    } catch (error) {
      this.logger.error('Error creating token:', error);
      throw InternalServerErrorException.INTERNAL_SERVER_ERROR(error);
    }
  }

  async findToken(token: Token): Promise<Token | null> {
    try {
      return await this.tokenRepository.findOne({
        userId: token.userId,
        type: token.type,
        value: token.value,
        expiresIn: { $gt: new Date() },
        userType: token.userType,
      });
    } catch (error) {
      throw InternalServerErrorException.INTERNAL_SERVER_ERROR(error);
    }
  }

  async updateToken(token: Token): Promise<Token | null> {
    try {
      return await this.tokenRepository.findOneAndUpdate(
        token._id as any,
        { value: token.value, expiresIn: token.expiresIn },
        { new: true },
      );
    } catch (error) {
      throw InternalServerErrorException.INTERNAL_SERVER_ERROR(error);
    }
  }

  async findAToken(tokenIfo: Partial<Token>): Promise<Token | null> {
    try {
      return await this.tokenRepository.findOne({
        userId: tokenIfo.userId,
        type: tokenIfo.type,
        userType: tokenIfo.userType,
      });
    } catch (error) {
      throw InternalServerErrorException.INTERNAL_SERVER_ERROR(error);
    }
  }

  async findById(tokenId: string): Promise<Token | null> {
    try {
      return await this.tokenRepository.findById(tokenId);
    } catch (error) {
      throw InternalServerErrorException.INTERNAL_SERVER_ERROR(error);
    }
  }
  async deleteToken(tokenId: Identifier): Promise<Token | null> {
    try {
      return await this.tokenRepository.findByIdAndDelete(tokenId as string);
    } catch (error) {
      throw InternalServerErrorException.INTERNAL_SERVER_ERROR(error);
    }
  }

  async deleteMany(filter: any): Promise<void> {
    try {
      await this.tokenRepository.deleteMany(filter);
    } catch (error) {
      this.logger.error('Error deleting multiple tokens:', error);
      throw InternalServerErrorException.INTERNAL_SERVER_ERROR(error);
    }
  }
}
