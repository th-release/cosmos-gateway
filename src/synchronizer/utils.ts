export function uint8ArrayToHex(uint8Array: Uint8Array): string {
    return Array.from(uint8Array)
        .map(byte => byte.toString(16).padStart(2, '0'))
        .join('');
}

export function hexStringToUint8Array(hexString: string): Uint8Array {
    const hex = hexString.length % 2 ? '0' + hexString : hexString;
    
    const uint8Array = new Uint8Array(hex.length / 2);
    
    for (let i = 0; i < hex.length; i += 2) {
        uint8Array[i / 2] = parseInt(hex.substr(i, 2), 16);
    }
    
    return uint8Array;
}