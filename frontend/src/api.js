// api.js - Fixed with proper protocol detection, correct API paths, and using fetch API
const getProxyUrl = () => {
    const protocol = window.location.protocol;
    const hostname = window.location.hostname;
    const isDev = hostname === 'localhost' || hostname === '127.0.0.1';
    
    if (isDev) {
        return `http://${hostname}:3000/api`;  // Added /api for development
    } else {
        // In production, always use HTTPS if the page is HTTPS
        return protocol === 'https:' 
            ? `https://${hostname}/api`
            : `${protocol}//${hostname}/api`;  // Added /api
    }
};

const proxyUrl = getProxyUrl();
console.log('📡 API Proxy URL:', proxyUrl);

/**
 * 📌 Upload een afbeelding naar de backend om een 3D-model te genereren.
 * @param {File} imageFile - De afbeelding die omgezet moet worden naar een 3D-model.
 * @param {string} topology - Optioneel: gewenste mesh topologie ('triangle' of 'quad'). Default is 'triangle'.
 * @param {string} shouldTexture - Optioneel: of het model een textuur moet hebben. Default is 'true'.
 * @param {boolean} enablePBR - Optioneel: of PBR (Physically Based Rendering) moet ingeschakeld zijn. Default is false.
 * @param {string} symmetryMode - Optioneel: de symmetrie-modus ('auto', 'on', 'off'). Default is 'auto'.
 * @param {number} polycount - Optioneel: gewenste polycount (100 tot 300000). Default is 30000.
 * @returns {Promise<string>} - De taskId die gebruikt wordt om de status op te volgen.
 */
async function createModel(
  imageFile,
  topology = 'triangle',
  shouldTexture = 'true',  // String to match main.js
  enablePBR = false,
  symmetryMode = 'auto',
  polycount = 30000
) {
  const formData = new FormData();
  formData.append('image', imageFile);
  formData.append('topology', topology);
  formData.append('shouldTexture', shouldTexture);
  formData.append('symmetryMode', symmetryMode);
  formData.append('enablePBR', enablePBR);
  formData.append('targetPolycount', polycount);

  try {
    console.log('📤 Sending request to:', `${proxyUrl}/generateModel`);
    const response = await fetch(`${proxyUrl}/generateModel`, {
      method: 'POST',
      body: formData,
      credentials: 'include'  // Important for cookies
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    console.log("📥 Response van backend:", data);
    
    if (data?.taskId) {
      return data.taskId;
    } else {
      throw new Error("❌ Geen taskId ontvangen van backend.");
    }
  } catch (error) {
    console.error('❌ Fout bij aanmaken van model:', error);
    throw error;
  }
}

/**
 * 📌 Poll de status van het gegenereerde model.
 * @param {string} taskId - De unieke ID van de Meshy-taak.
 * @returns {Promise<Object>} - De statusinformatie van de taak.
 */
async function getModelStatus(taskId) {
  try {
    console.log('📊 Checking status for:', taskId);
    const response = await fetch(`${proxyUrl}/getModel/${taskId}`, {
      method: 'GET',
      credentials: 'include'
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    
    if (!data?.status) {
      throw new Error(`❌ Geen geldige status ontvangen voor taskId ${taskId}`);
    }

    return data;
  } catch (error) {
    console.error("❌ Fout bij ophalen van modelstatus:", error);
    throw error;
  }
}

/**
 * 📌 Haal het gegenereerde GLB-bestand op van de backend.
 * @param {string} taskId - De unieke ID van de Meshy-taak.
 * @param {string} format - Optioneel: formaat van het model (bijvoorbeeld 'glb', 'gltf', 'usdz', etc.).
 * @returns {Promise<Blob>} - Het modelbestand als blob.
 */
async function fetchModelBlob(taskId, format = 'glb') {
  try {
    const response = await fetch(`${proxyUrl}/proxyModel/${taskId}?format=${format}`, {
      method: 'GET',
      credentials: 'include'
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const contentType = response.headers.get('content-type');
    
    if (!contentType?.includes("model/gltf-binary") && format === 'glb') {
      console.warn("⚠️ Content-Type might not be GLB, but continuing...");
    }

    return await response.blob();
  } catch (error) {
    console.error("❌ Fout bij ophalen van model via proxy:", error);
    throw error;
  }
}

// Make functions globally available
window.createModel = createModel;
window.getModelStatus = getModelStatus;
window.fetchModelBlob = fetchModelBlob;

console.log('📋 API.js loaded successfully with functions:', {
    createModel: typeof createModel,
    getModelStatus: typeof getModelStatus,
    fetchModelBlob: typeof fetchModelBlob,
    apiUrl: proxyUrl
});