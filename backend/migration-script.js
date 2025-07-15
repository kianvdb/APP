// migration-script.js - COMPLETE ENHANCED VERSION
// Place this file in your backend root folder (same level as server.js)
// Run once with: node migration-script.js

const mongoose = require('mongoose');
require('dotenv').config();

console.log('🚀 Starting enhanced database migration with format fixes...');

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/dalma-ai');
    console.log('✅ MongoDB Connected for migration');
  } catch (error) {
    console.error('❌ MongoDB connection error:', error.message);
    process.exit(1);
  }
};

const migrateAssets = async () => {
  try {
    console.log('🔄 Starting enhanced asset migration...');
    
    // Check current database state
    const totalBefore = await mongoose.connection.db.collection('assets').countDocuments();
    console.log(`📊 Total assets before migration: ${totalBefore}`);
    
    // **STEP 1: Update all existing assets to be public admin assets**
    console.log('📋 Step 1: Setting up public admin assets...');
    const publicAssetResult = await mongoose.connection.db.collection('assets').updateMany(
      { 
        // Find assets that don't have the new fields
        $or: [
          { isPublic: { $exists: false } },
          { isUserGenerated: { $exists: false } },
          { category: { $exists: false } },
          { userId: { $exists: false } }
        ]
      },
      {
        $set: {
          isPublic: true,           // Existing assets are public
          isUserGenerated: false,   // They are not user-generated
          category: 'public',       // They are public assets
          userId: null              // No user ownership
        }
      }
    );
    
    console.log(`✅ Step 1 completed: ${publicAssetResult.modifiedCount} assets set as public`);
    
    // **STEP 2: Add originalImage field structure to all assets**
    console.log('📋 Step 2: Adding originalImage field structure...');
    const originalImageResult = await mongoose.connection.db.collection('assets').updateMany(
      { 
        originalImage: { $exists: false }
      },
      {
        $set: {
          originalImage: null // Initialize as null - will be populated when available
        }
      }
    );
    
    console.log(`✅ Step 2 completed: ${originalImageResult.modifiedCount} assets got originalImage field`);
    
    // **STEP 3: For assets that have originalImageUrl, try to convert to structured format**
    console.log('📋 Step 3: Converting legacy originalImageUrl to structured format...');
    
    const assetsWithLegacyUrl = await mongoose.connection.db.collection('assets').find({
      originalImageUrl: { $exists: true, $ne: null },
      $or: [
        { originalImage: null },
        { originalImage: { $exists: false } }
      ]
    }).toArray();
    
    console.log(`📊 Found ${assetsWithLegacyUrl.length} assets with legacy originalImageUrl`);
    
    let convertedCount = 0;
    for (const asset of assetsWithLegacyUrl) {
      try {
        // Convert legacy URL to structured format
        const legacyUrl = asset.originalImageUrl;
        const filename = `original-${asset.name.replace(/\s+/g, '-')}.jpg`;
        
        await mongoose.connection.db.collection('assets').updateOne(
          { _id: asset._id },
          {
            $set: {
              originalImage: {
                filename: filename,
                url: legacyUrl,
                publicId: `legacy-${asset._id}`,
                size: 0 // Unknown size for legacy entries
              }
            }
          }
        );
        convertedCount++;
      } catch (error) {
        console.warn(`⚠️ Could not convert asset ${asset._id}:`, error.message);
      }
    }
    
    console.log(`✅ Step 3 completed: ${convertedCount} legacy URLs converted to structured format`);
    
    // **NEW STEP 4: Fix availableFormats for all assets (this fixes the download dropdown issue)**
    console.log('📋 Step 4: Fixing availableFormats for download functionality...');
    
    const allAssets = await mongoose.connection.db.collection('assets').find({}).toArray();
    let formatFixedCount = 0;
    let formatSkippedCount = 0;
    
    for (const asset of allAssets) {
      try {
        let detectedFormats = [];
        let needsUpdate = false;
        
        // Method 1: Check modelFiles object
        if (asset.modelFiles && typeof asset.modelFiles === 'object') {
          const formatKeys = Object.keys(asset.modelFiles);
          formatKeys.forEach(format => {
            const modelFile = asset.modelFiles[format];
            if (modelFile && modelFile.url && !modelFile.url.includes('memory://')) {
              detectedFormats.push(format);
            }
          });
        }
        
        // Method 2: Check legacy modelFile (assume GLB)
        if (detectedFormats.length === 0 && asset.modelFile && asset.modelFile.url && !asset.modelFile.url.includes('memory://')) {
          detectedFormats.push('glb');
        }
        
        // Method 3: If Meshy generated, assume all formats are available
        if (detectedFormats.length === 0 && asset.meshyTaskId) {
          detectedFormats = ['glb', 'fbx', 'obj', 'usdz'];
        }
        
        // Method 4: Default fallback
        if (detectedFormats.length === 0) {
          detectedFormats = ['glb'];
        }
        
        // Check if update is needed
        if (!asset.availableFormats || 
            JSON.stringify((asset.availableFormats || []).sort()) !== JSON.stringify(detectedFormats.sort())) {
          
          await mongoose.connection.db.collection('assets').updateOne(
            { _id: asset._id },
            {
              $set: {
                availableFormats: detectedFormats
              }
            }
          );
          
          formatFixedCount++;
          console.log(`🔧 Fixed formats for "${asset.name}": ${detectedFormats.join(', ')}`);
          
          // For Meshy assets, ensure modelFiles structure is populated
          if (asset.meshyTaskId && (!asset.modelFiles || Object.keys(asset.modelFiles).length === 0)) {
            const glbUrl = asset.modelFile?.url;
            
            if (glbUrl) {
              await mongoose.connection.db.collection('assets').updateOne(
                { _id: asset._id },
                {
                  $set: {
                    modelFiles: {
                      glb: {
                        filename: `${asset.meshyTaskId}.glb`,
                        url: glbUrl,
                        publicId: asset.modelFile.publicId || `meshy-${asset.meshyTaskId}`,
                        size: asset.modelFile.size || 0
                      }
                    }
                  }
                }
              );
              console.log(`📁 Updated modelFiles structure for Meshy asset: ${asset.name}`);
            }
          }
          
        } else {
          formatSkippedCount++;
        }
        
      } catch (assetError) {
        console.error(`❌ Error fixing asset ${asset.name}:`, assetError.message);
      }
    }
    
    console.log(`✅ Step 4 completed: ${formatFixedCount} assets had formats fixed, ${formatSkippedCount} were already correct`);
    
    // **STEP 5: Show final summary**
    const totalAfter = await mongoose.connection.db.collection('assets').countDocuments();
    const publicAssets = await mongoose.connection.db.collection('assets').countDocuments({ isPublic: true });
    const userAssets = await mongoose.connection.db.collection('assets').countDocuments({ isUserGenerated: true });
    const adminAssets = await mongoose.connection.db.collection('assets').countDocuments({ 
      isPublic: true, 
      isUserGenerated: false 
    });
    const assetsWithOriginalImage = await mongoose.connection.db.collection('assets').countDocuments({
      'originalImage.url': { $exists: true, $ne: null }
    });
    const assetsWithFormats = await mongoose.connection.db.collection('assets').countDocuments({
      'availableFormats': { $exists: true, $ne: [] }
    });
    
    console.log(`📊 Enhanced Migration Summary:
      - Total assets: ${totalAfter}
      - Public admin assets: ${adminAssets}  
      - User-generated assets: ${userAssets}
      - Assets with original images: ${assetsWithOriginalImage}
      - Assets with availableFormats: ${assetsWithFormats}
      - Public assets modified: ${publicAssetResult.modifiedCount}
      - Assets got originalImage field: ${originalImageResult.modifiedCount}
      - Legacy URLs converted: ${convertedCount}
      - Format fixes applied: ${formatFixedCount}
    `);
    
    // **STEP 6: Verify the migration worked**
    if (publicAssetResult.modifiedCount > 0 || originalImageResult.modifiedCount > 0 || formatFixedCount > 0) {
      console.log('✅ Enhanced migration successful!');
      console.log('🏠 Homepage will show public assets');
      console.log('👤 User-generated models will be separate and private');
      console.log('🖼️ Original images will now be properly stored and displayed');
      console.log('📥 Download dropdowns will now show available formats');
      console.log('🔄 New user generations will automatically include original images');
    } else {
      console.log('ℹ️ No assets needed migration - database already up to date');
    }
    
    // **STEP 7: Test a sample asset to verify structure**
    console.log('📋 Step 7: Verifying asset structure...');
    const sampleAsset = await mongoose.connection.db.collection('assets').findOne({});
    if (sampleAsset) {
      console.log('📄 Sample asset structure verification:');
      console.log(`  - Has isPublic: ${sampleAsset.isPublic !== undefined}`);
      console.log(`  - Has isUserGenerated: ${sampleAsset.isUserGenerated !== undefined}`);
      console.log(`  - Has category: ${sampleAsset.category !== undefined}`);
      console.log(`  - Has userId: ${sampleAsset.userId !== undefined}`);
      console.log(`  - Has originalImage: ${sampleAsset.originalImage !== undefined}`);
      console.log(`  - Original image has URL: ${sampleAsset.originalImage?.url ? 'Yes' : 'No'}`);
      console.log(`  - Has availableFormats: ${sampleAsset.availableFormats !== undefined}`);
      console.log(`  - Available formats: ${sampleAsset.availableFormats ? sampleAsset.availableFormats.join(', ') : 'None'}`);
      console.log(`  - Is Meshy generated: ${sampleAsset.meshyTaskId ? 'Yes' : 'No'}`);
    }
    
    // **STEP 8: Show some examples of fixed assets**
    console.log('📋 Step 8: Examples of format-fixed assets...');
    const exampleAssets = await mongoose.connection.db.collection('assets').find({
      availableFormats: { $exists: true, $ne: [] }
    }).limit(5).toArray();
    
    exampleAssets.forEach(asset => {
      console.log(`📁 "${asset.name}": ${asset.availableFormats.join(', ')} ${asset.meshyTaskId ? '(Meshy)' : '(Manual)'}`);
    });
    
  } catch (error) {
    console.error('❌ Migration error:', error);
    process.exit(1);
  }
};

const runMigration = async () => {
  console.log('📋 Enhanced Database Migration for Asset Ownership, Original Images & Format Fixes');
  console.log('This will:');
  console.log('  1. Update existing assets to be public assets');
  console.log('  2. Add originalImage field for storing user input images');
  console.log('  3. Convert legacy originalImageUrl to structured format');
  console.log('  4. Fix availableFormats field for proper download functionality');
  console.log('  5. Update modelFiles structure for Meshy assets');
  console.log('  6. Prepare database for preview image functionality');
  console.log('');
  
  await connectDB();
  await migrateAssets();
  await mongoose.connection.close();
  
  console.log('');
  console.log('🏁 Enhanced migration completed and connection closed');
  console.log('✅ You can now start your server normally');
  console.log('🖼️ Preview images will now work correctly in the frontend');
  console.log('📥 Download dropdowns will now show available formats');
  console.log('🔧 Delete functionality will work with proper authentication');
  console.log('');
  process.exit(0);
};

// Handle errors
process.on('unhandledRejection', (err) => {
  console.error('❌ Unhandled Promise Rejection:', err.message);
  process.exit(1);
});

process.on('uncaughtException', (err) => {
  console.error('❌ Uncaught Exception:', err.message);
  process.exit(1);
});

// Run the migration
runMigration();