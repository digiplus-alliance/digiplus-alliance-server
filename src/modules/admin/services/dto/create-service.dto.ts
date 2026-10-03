import {
  IsNotEmpty,
  IsString,
  IsNumber,
  IsPositive,
  Length,
  IsEnum,
  IsOptional,
  ValidateIf,
  Min,
  ValidationArguments,
  ValidatorConstraint,
  ValidatorConstraintInterface,
  Validate,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PricingUnit, ServicesTypes } from 'src/shared/enums';

// Custom validator for price based on pricing_unit
@ValidatorConstraint({ name: 'isPriceRequiredForPaidServices', async: false })
export class IsPriceRequiredForPaidServices implements ValidatorConstraintInterface{
  validate(price: number | undefined, args: ValidationArguments) {
    const obj = args.object as any;
    
    // If pricing_unit is equity_based, price is optional
    if (obj.pricing_unit === PricingUnit.EQUITY_BASED) {
      return true;
    }
    
    // For all other pricing units, price is required
    return price !== undefined && price !== null && price >= 0;
  }

  defaultMessage(args: ValidationArguments) {
    const obj = args.object as any;
    if (obj.pricing_unit === PricingUnit.EQUITY_BASED) {
      return 'Price is not required for equity-based services';
    }
    return 'Price is required for paid services';
  }
}

export class CreateServiceDto {
  @ApiProperty({
    description: 'Service name',
    example: 'Web Development',
  })
  @IsNotEmpty()
  @IsString()
  @Length(1, 255)
  @Transform(({ value }) => value?.trim())
  name: string;

  @ApiProperty({
    enum: ServicesTypes,
    description: 'Service type/category',
  })
  @IsEnum(ServicesTypes)
  service_type: ServicesTypes;

  @ApiProperty({
     description: 'Service base price (optional for equity-based services, required for all others)',
    example: 2000,
    required: false,
  })
  @IsNotEmpty()
  @Type(() => Number)
  @IsNumber()
@Min(0) // Changed from @IsPositive()
  @Validate(IsPriceRequiredForPaidServices)
  price: number;



  @ApiPropertyOptional({
   description: 'Discounted price (only applicable for paid services)',
    example: 1500,
  })
  @IsOptional()
  @Transform(({ value }) => {
    if (value === '' || value === null || value === undefined) {
      return undefined;
    }
    return Number(value);
  })
  @ValidateIf((o, value) => value !== undefined)
  @IsNumber()
@Min(0)
  // @IsOptional()
  // @ValidateIf(
  //   (o, value) => value !== '' && value !== null && value !== undefined,
  // )
  // @Type(() => Number)
  // @IsNumber()
  // @IsPositive()
  discounted_price?: number;

  @ApiProperty({
    description: 'Pricing unit',
    enum: PricingUnit,
    example: PricingUnit.ONE_TIME_PAYMENT,
    default: PricingUnit.ONE_TIME_PAYMENT,
  })
  @IsOptional()
  @IsEnum(PricingUnit)
  pricing_unit?: PricingUnit;

  @ApiPropertyOptional({
    description: 'Short description',
    maxLength: 500,
  })
  @IsOptional()
  @IsString()
  @Length(1, 500)
  short_description?: string;

  @ApiPropertyOptional({
    description: 'Detailed description',
  })
  @IsOptional()
  @IsString()
  long_description?: string;

  // No image fields here - they come from file uploads
  @ApiProperty({
    type: 'array',
    items: {
      type: 'string',
      format: 'binary',
    },
    description: 'Image files to upload (first image becomes main image)',
  })
  images?: Express.Multer.File[];
}
