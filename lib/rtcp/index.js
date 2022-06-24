/*
        0                   1                   2                   3
        0 1 2 3 4 5 6 7 8 9 0 1 2 3 4 5 6 7 8 9 0 1 2 3 4 5 6 7 8 9 0 1
       +-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
header |V=2|P|    SC   |      PT       |             length            |
       +=+=+=+=+=+=+=+=+=+=+=+=+=+=+=+=+=+=+=+=+=+=+=+=+=+=+=+=+=+=+=+=+
 */
/** @ignore */
const RTCP_VERSION = 2;
/** @ignore */
const COMMON_HEADER_LENGTH = 4;
/**
 * ```ts
 * import { RtcpPacketType } from 'rtp.js';
 * ```
 */
export var RtcpPacketType;
(function (RtcpPacketType) {
    RtcpPacketType[RtcpPacketType["SR"] = 200] = "SR";
    RtcpPacketType[RtcpPacketType["RR"] = 201] = "RR";
    RtcpPacketType[RtcpPacketType["SDES"] = 202] = "SDES";
    RtcpPacketType[RtcpPacketType["BYE"] = 203] = "BYE";
    RtcpPacketType[RtcpPacketType["APP"] = 204] = "APP";
    RtcpPacketType[RtcpPacketType["RTPFB"] = 205] = "RTPFB";
    RtcpPacketType[RtcpPacketType["PSFB"] = 206] = "PSFB";
    RtcpPacketType[RtcpPacketType["XR"] = 207] = "XR";
})(RtcpPacketType || (RtcpPacketType = {}));
/**
 * ```ts
 * import { isRtcp } from 'rtp.js';
 * ```
 *
 * Inspect the given buffer and return a boolean indicating whether it could be
 * a valid RTCP packet or not.
 *
 * ```ts
 * if (isRtcp(buffer)) {
 *   console.log('it seems a valid RTCP packet');
 * }
 * ```
 */
export function isRtcp(buffer) {
    const firstByte = buffer.readUInt8(0);
    return (Buffer.isBuffer(buffer) &&
        buffer.length >= COMMON_HEADER_LENGTH &&
        // DOC: https://tools.ietf.org/html/draft-ietf-avtcore-rfc5764-mux-fixes
        (firstByte > 127 && firstByte < 192) &&
        // RTCP Version must be 2.
        (firstByte >> 6) === RTCP_VERSION &&
        // RTCP packet types defined by IANA:
        // http://www.iana.org/assignments/rtp-parameters/rtp-parameters.xhtml#rtp-parameters-4
        // RFC 5761 (RTCP-mux) states this range for secure RTCP/RTP detection.
        (buffer.readUInt8(1) >= 192 && buffer.readUInt8(1) <= 223));
}
/**
 * ```ts
 * import { RtcpPacket } from 'rtp.js';
 * ```
 *
 * Representation of a base RTCP packet.
 */
export class RtcpPacket {
    /**
     * @ignore
     *
     * @param PacketType.
     */
    constructor(packetType, buffer) {
        // Number of bytes of padding.
        this.padding = 0;
        // Whether serialization is needed due to modifications.
        this.serializationNeeded = false;
        this.packetType = packetType;
        this.buffer = buffer;
    }
    /**
     * @ignore
     *
     * @param Buffer.
     */
    static getCount(buffer) {
        return buffer.readUInt8(0) & 0x1F;
    }
    /**
     * @ignore
     *
     * @param Buffer.
     */
    static getLength(buffer) {
        return buffer.readUInt16BE(2);
    }
    /**
     * @ignore
     */
    dump() {
        return {
            version: this.getVersion(),
            count: this.getCount(),
            length: this.getLength(),
            padding: this.getPadding()
        };
    }
    /**
     * Get the RTCP version of the packet (always 2).
     */
    getVersion() {
        return this.buffer.readUInt8(0) >> 6;
    }
    /**
     * Get the padding (in bytes) after the packet payload.
     */
    getPadding() {
        return this.padding;
    }
    /**
     * Set the padding (in bytes) after the packet payload.
     */
    setPadding(padding) {
        this.serializationNeeded = true;
        this.padding = padding;
        // Update padding bit.
        const bit = padding ? 1 : 0;
        this.setPaddingBit(bit);
    }
    /**
     * Get the RTCP header count value.
     */
    getCount() {
        return this.buffer.readUInt8(0) & 0x1F;
    }
    /**
     * Get the RTCP packet type.
     */
    getPacketType() {
        return this.buffer.readUInt8(1);
    }
    /**
     * Get the RTCP packet length.
     */
    getLength() {
        return this.buffer.readUInt16BE(2);
    }
    /**
     * Set the RTCP header count value.
     */
    setCount(count) {
        this.buffer.writeUInt8(this.buffer.readUInt8() | (count & 0x1F), 0);
    }
    /**
     * Serialize RTCP packet into a new buffer.
     */
    serialize(length) {
        const padding = this.padding ?? 0;
        // Allocate new buffer.
        const newBuffer = Buffer.alloc(length + padding);
        this.buffer.copy(newBuffer, 0, 0, COMMON_HEADER_LENGTH);
        this.buffer = newBuffer;
        this.writeCommonHeader();
        this.setLength(((length + padding) / 4) - 1);
        // Write padding.
        if (this.padding > 0) {
            if (this.padding > 255) {
                throw new TypeError(`padding (${this.padding} bytes) cannot be higher than 255`);
            }
            this.buffer.fill(0, length, length + padding - 1);
            this.buffer.writeUInt8(padding, length + this.padding - 1);
        }
    }
    writeCommonHeader() {
        this.setVersion();
        this.setPacketType(this.packetType);
    }
    /**
     * Set the RTCP version of the packet (always 2).
     */
    setVersion() {
        this.buffer.writeUInt8(this.buffer.readUInt8() | (RTCP_VERSION << 6), 0);
    }
    /**
     * Set the RTCP packet type.
     */
    setPacketType(count) {
        this.buffer.writeUInt8(count, 1);
    }
    /**
     * Set the RTCP packet length.
     */
    setLength(length) {
        this.buffer.writeUInt16BE(length, 2);
    }
    /**
     * Set the padding bit.
     */
    setPaddingBit(bit) {
        this.buffer.writeUInt8(this.buffer.readUInt8(0) | (bit << 5), 0);
    }
}
