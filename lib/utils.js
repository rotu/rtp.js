/**
 * Clones the given object/array/Buffer/etc.
 */
export function clone(data) {
    if (Buffer.isBuffer(data)) {
        return Buffer.from(data);
    }
    else if (data === undefined) {
        return undefined;
    }
    else if (Number.isNaN(data)) {
        return NaN;
    }
    else {
        return JSON.parse(JSON.stringify(data));
    }
}
/**
 * Returns the given size padded to 4 bytes.
 */
export function padTo4Bytes(size) {
    // If size is not multiple of 32 bits then pad it.
    if (size & 0x03) {
        return (size & 0xFFFC) + 4;
    }
    else {
        return size;
    }
}
