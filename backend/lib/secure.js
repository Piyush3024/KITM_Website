import crypto from 'crypto';

// Secret key for encoding/decoding - store this in environment variables
const SECRET_KEY = process.env.SECRET_KEY || 'your-secret-key-change-this';

// Base62 characters for shorter encoding
const BASE62_CHARS = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';

/**
 * Converts a number to base62 string for shorter representation
 * @param {number} num - The number to convert
 * @returns {string} - Base62 encoded string
 */
function toBase62(num) {
    if (num === 0) return '0';
    
    let result = '';
    while (num > 0) {
        result = BASE62_CHARS[num % 62] + result;
        num = Math.floor(num / 62);
    }
    return result;
}

/**
 * Converts a base62 string back to number
 * @param {string} str - Base62 encoded string
 * @returns {number} - Decoded number
 */
function fromBase62(str) {
    let result = 0;
    for (let i = 0; i < str.length; i++) {
        const char = str[i];
        const value = BASE62_CHARS.indexOf(char);
        if (value === -1) {
            throw new Error('Invalid base62 character');
        }
        result = result * 62 + value;
    }
    return result;
}

/**
 * Creates a simple hash of the input for obfuscation
 * @param {string} input - Input to hash
 * @returns {string} - Short hash
 */
function createShortHash(input) {
    const hash = crypto.createHmac('sha256', SECRET_KEY)
        .update(input.toString())
        .digest('hex');
    // Take first 8 characters for shorter hash
    return hash.substring(0, 8);
}

/**
 * Encodes an ID to make it shorter and obfuscated
 * @param {number} id - The ID to encode
 * @returns {string} - Encoded ID
 */
export function encodeId(id) {
    try {
    
        if (!id || typeof id !== 'number') {
            throw new Error('Invalid ID provided');
        }

        // Convert to base62 for shorter representation
        const base62Id = toBase62(id);
        
        // Create a short hash for verification
        const hash = createShortHash(id);
        
        // Combine base62 ID with short hash (separated by a delimiter)
        const encoded = `${base62Id}-${hash}`;
        
        return encoded;
    } catch (error) {
        console.error('Error encoding ID:', error);
        throw new Error('Failed to encode ID');
    }
}

/**
 * Decodes an encoded ID back to original number
 * @param {string} encodedId - The encoded ID to decode
 * @returns {number} - Original ID
 */
export function decodeId(encodedId) {
    try {
        if (!encodedId || typeof encodedId !== 'string') {
            throw new Error('Invalid encoded ID provided');
        }

        // Split the encoded ID
        const parts = encodedId.split('-');
        if (parts.length !== 2) {
            throw new Error('Invalid encoded ID format');
        }

        const [base62Id, providedHash] = parts;
        
        // Decode from base62
        const originalId = fromBase62(base62Id);
        
        // Verify the hash
        const expectedHash = createShortHash(originalId);
        if (providedHash !== expectedHash) {
            throw new Error('Invalid encoded ID - hash verification failed');
        }
        
        return originalId;
    } catch (error) {
        console.error('Error decoding ID:', error);
        throw new Error('Failed to decode ID');
    }
}

// Alternative simpler version using just base62 (if you don't need hash verification)

/**
 * Simple encode function using only base62 (shorter but less secure)
 * @param {number} id - The ID to encode
 * @returns {string} - Encoded ID
 */
export function simpleEncodeId(id) {
    try {
        if (!id || typeof id !== 'number') {
            throw new Error('Invalid ID provided');
        }
        return toBase62(id);
    } catch (error) {
        console.error('Error encoding ID:', error);
        throw new Error('Failed to encode ID');
    }
}

/**
 * Simple decode function using only base62
 * @param {string} encodedId - The encoded ID to decode
 * @returns {number} - Original ID
 */
export function simpleDecodeId(encodedId) {
    try {
        if (!encodedId || typeof encodedId !== 'string') {
            throw new Error('Invalid encoded ID provided');
        }
        return fromBase62(encodedId);
    } catch (error) {
        console.error('Error decoding ID:', error);
        throw new Error('Failed to decode ID');
    }
}

// // Example usage and testing
// if (process.env.NODE_ENV === 'development') {
//     // Test the functions
//     const testId = 12345;
//     console.log('Original ID:', testId);
    
//     const encoded = encodeId(testId);
//     console.log('Encoded ID:', encoded);
    
//     const decoded = decodeId(encoded);
//     console.log('Decoded ID:', decoded);
    
//     console.log('Match:', testId === decoded);
    
//     // Test simple version
//     const simpleEncoded = simpleEncodeId(testId);
//     console.log('Simple Encoded:', simpleEncoded);
    
//     const simpleDecoded = simpleDecodeId(simpleEncoded);
//     console.log('Simple Decoded:', simpleDecoded);
// }