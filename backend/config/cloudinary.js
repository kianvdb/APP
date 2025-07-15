const cloudinary = require('cloudinary').v2;
const streamifier = require('streamifier');

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// Helper function to upload buffer to Cloudinary
const uploadFromBuffer = (buffer, options) => {
  return new Promise((resolve, reject) => {
    const uploadOptions = {
      resource_type: 'raw',
      ...options
    };

    const uploadStream = cloudinary.uploader.upload_stream(
      uploadOptions,
      (error, result) => {
        if (error) reject(error);
        else resolve(result);
      }
    );

    streamifier.createReadStream(buffer).pipe(uploadStream);
  });
};

// Upload model file from buffer
const uploadModelFromBuffer = async (buffer, filename, folder = 'dalma-ai/models') => {
  try {
    const result = await uploadFromBuffer(buffer, {
      resource_type: 'raw',
      folder: folder,
      public_id: filename.replace(/\.[^/.]+$/, ''), // Remove file extension
      filename_override: filename,
      use_filename: true,
      unique_filename: false,
      overwrite: true,
      invalidate: true
    });

    return {
      url: result.secure_url,
      publicId: result.public_id,
      filename: filename,
      size: result.bytes
    };
  } catch (error) {
    console.error('Error uploading model to Cloudinary:', error);
    throw error;
  }
};

// Upload image from buffer
const uploadImageFromBuffer = async (buffer, filename, folder = 'dalma-ai/images') => {
  return new Promise((resolve, reject) => {
    const uploadOptions = {
      resource_type: 'image',
      folder: folder,
      public_id: filename.replace(/\.[^/.]+$/, ''), // Remove file extension
      filename_override: filename,
      use_filename: true,
      unique_filename: false,
      overwrite: true,
      invalidate: true
    };

    const uploadStream = cloudinary.uploader.upload_stream(
      uploadOptions,
      (error, result) => {
        if (error) {
          console.error('Error uploading image to Cloudinary:', error);
          reject(error);
        } else {
          resolve({
            url: result.secure_url,
            publicId: result.public_id,
            filename: filename,
            size: result.bytes
          });
        }
      }
    );

    streamifier.createReadStream(buffer).pipe(uploadStream);
  });
};

// Upload original image from base64
const uploadOriginalImageFromBase64 = async (base64String, filename) => {
  try {
    const result = await cloudinary.uploader.upload(base64String, {
      resource_type: 'image',
      folder: 'dalma-ai/originals',
      public_id: filename.replace(/\.[^/.]+$/, ''),
      filename_override: filename,
      use_filename: true,
      unique_filename: false,
      overwrite: true,
      invalidate: true
    });

    return {
      url: result.secure_url,
      publicId: result.public_id,
      filename: filename,
      size: result.bytes
    };
  } catch (error) {
    console.error('Error uploading original image to Cloudinary:', error);
    throw error;
  }
};

// Delete file from Cloudinary
const deleteFile = async (publicId, resourceType = 'raw') => {
  try {
    const result = await cloudinary.uploader.destroy(publicId, {
      resource_type: resourceType,
      invalidate: true
    });
    return result;
  } catch (error) {
    console.error('Error deleting file from Cloudinary:', error);
    throw error;
  }
};

// Get file info from Cloudinary
const getFileInfo = async (publicId, resourceType = 'raw') => {
  try {
    const result = await cloudinary.api.resource(publicId, {
      resource_type: resourceType
    });
    return result;
  } catch (error) {
    console.error('Error getting file info from Cloudinary:', error);
    throw error;
  }
};

module.exports = {
  cloudinary,
  uploadModelFromBuffer,
  uploadImageFromBuffer,
  uploadOriginalImageFromBase64,
  deleteFile,
  getFileInfo
};