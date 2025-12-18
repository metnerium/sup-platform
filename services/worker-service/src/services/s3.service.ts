import AWS from 'aws-sdk';
import { config } from '../config';
import logger from '../utils/logger';

class S3Service {
  private s3: AWS.S3;

  constructor() {
    this.s3 = new AWS.S3({
      region: config.aws.region,
      accessKeyId: config.aws.accessKeyId,
      secretAccessKey: config.aws.secretAccessKey,
    });
  }

  async uploadFile(key: string, buffer: Buffer, contentType: string): Promise<string> {
    try {
      const params = {
        Bucket: config.aws.s3Bucket,
        Key: key,
        Body: buffer,
        ContentType: contentType,
      };

      const result = await this.s3.upload(params).promise();
      logger.info('File uploaded to S3', { key, location: result.Location });
      return result.Location;
    } catch (error) {
      logger.error('Failed to upload file to S3', { error, key });
      throw error;
    }
  }

  async getFile(key: string): Promise<Buffer> {
    try {
      const params = {
        Bucket: config.aws.s3Bucket,
        Key: key,
      };

      const result = await this.s3.getObject(params).promise();
      return result.Body as Buffer;
    } catch (error) {
      logger.error('Failed to get file from S3', { error, key });
      throw error;
    }
  }

  async deleteFile(key: string): Promise<void> {
    try {
      const params = {
        Bucket: config.aws.s3Bucket,
        Key: key,
      };

      await this.s3.deleteObject(params).promise();
      logger.info('File deleted from S3', { key });
    } catch (error) {
      logger.error('Failed to delete file from S3', { error, key });
      throw error;
    }
  }

  async getSignedUrl(key: string, expiresIn: number = 3600): Promise<string> {
    try {
      const params = {
        Bucket: config.aws.s3Bucket,
        Key: key,
        Expires: expiresIn,
      };

      return this.s3.getSignedUrl('getObject', params);
    } catch (error) {
      logger.error('Failed to generate signed URL', { error, key });
      throw error;
    }
  }
}

export const s3Service = new S3Service();
export default s3Service;
