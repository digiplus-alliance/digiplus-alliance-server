import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  Inject,
  Logger,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Service, ServiceDocument } from './schemas/service.schema';
import { CreateServiceDto } from './dto/create-service.dto';
import { UpdateServiceDto } from './dto/update-service.dto';
import { UploadService } from 'src/modules/cloudinary/cloudinary.service';
import { ServicesTypes } from 'src/shared/enums';

@Injectable()
export class ServicesService {
  private readonly logger = new Logger(ServicesService.name);

  constructor(
    @InjectModel(Service.name) private serviceModel: Model<ServiceDocument>,
    private readonly uploadService: UploadService,
  ) {}
  async create(
    createServiceDto: CreateServiceDto,
    imageFiles?: Express.Multer.File[],
  ): Promise<ServiceDocument> {
    try {
      // Check if service with same name already exists
      const existingService = await this.serviceModel.findOne({
        name: createServiceDto.name,
        deletedAt: null,
      });

      if (existingService) {
        throw new ConflictException(
          `Service with name '${createServiceDto.name}' already exists`,
        );
      }

      let mainImage = '';
      let additionalImages: string[] = [];

      // Upload images if provided
      if (imageFiles && imageFiles.length > 0) {
        // Validate image files
        this.validateImageFiles(imageFiles);

        const uploadPromises = imageFiles.map(async (file, index) => {
          const serviceName = createServiceDto.name
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-') // Replace any non-alphanumeric chars with dash
            .replace(/^-+|-+$/g, ''); // Remove leading/trailing dashes
          const fileName = `${serviceName}-${Date.now()}-${index}`;
          const uploadResult = await this.uploadService.uploadImage(
            file,
            fileName,
            'services',
          );
          return uploadResult.secure_url;
        });

        const uploadedUrls = await Promise.all(uploadPromises);

        // First image becomes the main image
        mainImage = uploadedUrls[0];
        // Rest go to additional images
        additionalImages = uploadedUrls.slice(1);
      }

      // Create service data
      const serviceData = {
        ...createServiceDto,
        image: mainImage,
        images: additionalImages,
      };

      const service = new this.serviceModel(serviceData);
      return await service.save();
    } catch (error) {
      if (
        error instanceof ConflictException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }

      this.logger.error('Service creation error:', error);
      // throw new BadRequestException('Failed to create service with images');

      throw new BadRequestException(
        `Failed to create service: ${error.message || 'Unknown error'}`,
      );
    }
  }

async update(
  id: string,
  updateServiceDto: UpdateServiceDto,
  imageFiles?: Express.Multer.File[],
): Promise<ServiceDocument> {
  if (!id) {
    throw new BadRequestException('Service ID is required');
  }

  if (!Types.ObjectId.isValid(id)) {
    throw new BadRequestException('Invalid service ID format');
  }

  try {
    // Check if service exists
    const service = await this.findOne(id);

    // If name is being updated, check for conflicts
    if (updateServiceDto.name && updateServiceDto.name !== service.name) {
      const existingService = await this.serviceModel.findOne({
        name: updateServiceDto.name,
        _id: { $ne: id },
        deletedAt: null,
      });

      if (existingService) {
        throw new ConflictException(
          `Service with name '${updateServiceDto.name}' already exists`,
        );
      }
    }

    const updateData: Partial<Service> = { ...updateServiceDto };

    // Upload new images if provided
    if (imageFiles && imageFiles.length > 0) {
      this.validateImageFiles(imageFiles);

      const uploadPromises = imageFiles.map(async (file, index) => {
        const serviceName = (updateServiceDto.name || service.name)
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-+|-+$/g, '');
        const fileName = `${serviceName}-${Date.now()}-${index}`;
        const uploadResult = await this.uploadService.uploadImage(
          file,
          fileName,
          'services',
        );
        return uploadResult.secure_url;
      });

      const newUploadedUrls = await Promise.all(uploadPromises);

      // First uploaded image becomes the new main image
      updateData.image = newUploadedUrls[0];

      // Rest go to images array (along with existing images)
      const existingImages = service.images || [];
      
      // If there are more than 1 new images, add the rest to the images array
      if (newUploadedUrls.length > 1) {
        updateData.images = [...existingImages, ...newUploadedUrls.slice(1)];
      } else {
        // Keep existing images if only one new image was uploaded (which became the main image)
        updateData.images = existingImages;
      }
    }

    const updatedService = await this.serviceModel.findOneAndUpdate(
      { _id: id, deletedAt: null },
      updateData,
      { new: true, runValidators: true },
    );

    if (!updatedService) {
      throw new NotFoundException(`Service with ID '${id}' not found`);
    }

    return updatedService;
  } catch (error) {
    if (
      error instanceof NotFoundException ||
      error instanceof ConflictException ||
      error instanceof BadRequestException
    ) {
      throw error;
    }
    this.logger.error('Service update error:', error);
    throw new BadRequestException(
      `Failed to update service: ${error.message || 'Unknown error'}`,
    );
  }
}

 async updateMainImage(
  id: string,
  imageFile: Express.Multer.File,
): Promise<ServiceDocument> {
  if (!id) {
    throw new BadRequestException('Service ID is required');
  }

  if (!Types.ObjectId.isValid(id)) {
    throw new BadRequestException('Invalid service ID format');
  }

  if (!imageFile) {
    throw new BadRequestException('Image file is required');
  }

  try {
    const service = await this.findOne(id);

    // Validate single image file
    this.validateImageFiles([imageFile]);

    const serviceName = service.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
    const fileName = `${serviceName}-main-${Date.now()}`;
    const uploadResult = await this.uploadService.uploadImage(
      imageFile,
      fileName,
      'services',
    );

    const updatedService = await this.serviceModel.findOneAndUpdate(
      { _id: id, deletedAt: null },
      { image: uploadResult.secure_url },
      { new: true, runValidators: true },
    );

    if (!updatedService) {
      throw new NotFoundException(`Service with ID '${id}' not found`);
    }

    return updatedService;
  } catch (error) {
    if (
      error instanceof NotFoundException ||
      error instanceof BadRequestException
    ) {
      throw error;
    }
    this.logger.error('Main image update error:', error);
    throw new BadRequestException(
      `Failed to update main image: ${error.message || 'Unknown error'}`,
    );
  }
}


  async uploadServiceImages(
  id: string,
  imageFiles: Express.Multer.File[],
  replaceExisting: boolean = false,
): Promise<{ success: boolean; urls: string[] }> {
  if (!id) {
    throw new BadRequestException('Service ID is required');
  }

  if (!Types.ObjectId.isValid(id)) {
    throw new BadRequestException('Invalid service ID format');
  }

  if (!imageFiles || imageFiles.length === 0) {
    throw new BadRequestException('At least one image file is required');
  }

  try {
    const service = await this.findOne(id);

    // Validate image files
    this.validateImageFiles(imageFiles);

    const serviceName = service.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');

    const uploadPromises = imageFiles.map(async (file, index) => {
      const fileName = `${serviceName}-${Date.now()}-${index}`;
      const uploadResult = await this.uploadService.uploadImage(
        file,
        fileName,
        'services',
      );
      return uploadResult.secure_url;
    });

    const uploadedImageUrls = await Promise.all(uploadPromises);

    // Update service with new images
    const updateData: Partial<Service> = {};

    if (replaceExisting) {
      // Replace all images - first becomes main image
      updateData.image = uploadedImageUrls[0];
      updateData.images =
        uploadedImageUrls.length > 1 ? uploadedImageUrls.slice(1) : [];
    } else {
      // Append to existing images - do NOT change main image
      const existingImages = service.images || [];
      updateData.images = [...existingImages, ...uploadedImageUrls];
    }

    await this.serviceModel.findOneAndUpdate(
      { _id: id, deletedAt: null },
      updateData,
      { new: true, runValidators: true },
    );

    return { success: true, urls: uploadedImageUrls };
  } catch (error) {
    if (
      error instanceof NotFoundException ||
      error instanceof BadRequestException
    ) {
      throw error;
    }
    this.logger.error('Service images upload error:', error);
    throw new BadRequestException(
      `Failed to upload service images: ${error.message || 'Unknown error'}`,
    );
  }
}

  private validateImageFiles(files: Express.Multer.File[]): void {
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    const maxSize = 5 * 1024 * 1024; // 5MB

    for (const file of files) {
      if (!allowedTypes.includes(file.mimetype)) {
        throw new BadRequestException(
          `Invalid image format. Allowed formats: ${allowedTypes.join(', ')}`,
        );
      }

      if (file.size > maxSize) {
        throw new BadRequestException('Image size must be less than 5MB');
      }
    }
  }

  async findAll(): Promise<ServiceDocument[]> {
    try {
      return await this.serviceModel
        .find({ deletedAt: null })
        .sort({ createdAt: -1 })
        .exec();
    } catch (error) {
      throw new BadRequestException('Failed to retrieve services');
    }
  }

  async findOne(id: string): Promise<ServiceDocument> {
    if (!id) {
      throw new BadRequestException('Service ID is required');
    }

    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid service ID format');
    }

    try {
      const service = await this.serviceModel.findOne({
        _id: id,
        deletedAt: null,
      });

      if (!service) {
        throw new NotFoundException(`Service with ID '${id}' not found`);
      }

      return service;
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }
      throw new BadRequestException('Failed to retrieve service');
    }
  }

  async remove(id: string): Promise<void> {
    if (!id) {
      throw new BadRequestException('Service ID is required');
    }

    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid service ID format');
    }

    try {
      // Check if service exists
      await this.findOne(id);

      // Soft delete
      const deletedService = await this.serviceModel.findOneAndUpdate(
        { _id: id, deletedAt: null },
        { deletedAt: new Date() },
        { new: true },
      );

      if (!deletedService) {
        throw new NotFoundException(`Service with ID '${id}' not found`);
      }
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }
      throw new BadRequestException('Failed to delete service');
    }
  }

  async findByName(name: string): Promise<ServiceDocument> {
    if (!name) {
      throw new BadRequestException('Service name is required');
    }

    try {
      const service = await this.serviceModel.findOne({
        name: name.trim(),
        deletedAt: null,
      });

      if (!service) {
        throw new NotFoundException(`Service with name '${name}' not found`);
      }

      return service;
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }
      throw new BadRequestException('Failed to search service by name');
    }
  }

  async searchServices(searchTerm: string): Promise<ServiceDocument[]> {
    if (!searchTerm) {
      return await this.findAll();
    }

    try {
      const searchRegex = new RegExp(searchTerm, 'i');

      return await this.serviceModel
        .find({
          deletedAt: null,
          $or: [
            { name: searchRegex },
            { short_description: searchRegex },
            { long_description: searchRegex },
          ],
        })
        .sort({ createdAt: -1 })
        .exec();
    } catch (error) {
      throw new BadRequestException('Failed to search services');
    }
  }

  async getServicesByPriceRange(
    minPrice?: number,
    maxPrice?: number,
  ): Promise<ServiceDocument[]> {
    try {
      const priceFilter: any = {};

      if (minPrice !== undefined) {
        priceFilter.$gte = minPrice;
      }

      if (maxPrice !== undefined) {
        priceFilter.$lte = maxPrice;
      }

      const filter: any = { deletedAt: null };
      if (Object.keys(priceFilter).length > 0) {
        filter.price = priceFilter;
      }

      return await this.serviceModel.find(filter).sort({ price: 1 }).exec();
    } catch (error) {
      throw new BadRequestException('Failed to filter services by price range');
    }
  }

  async getServicesCount(): Promise<number> {
    try {
      return await this.serviceModel.countDocuments({ deletedAt: null });
    } catch (error) {
      throw new BadRequestException('Failed to count services');
    }
  }

  getAvailableServiceTypes(): string[] {
    return Object.values(ServicesTypes);
  }
}
