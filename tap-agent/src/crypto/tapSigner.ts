import nacl from 'tweetnacl';
import bs58 from 'bs58';
import { TAPSignature, TAPRequestData } from '../../../shared/types.js';

export class TAPSigner {
  private keyPair: nacl.SignKeyPair;
  private keyId: string;

  constructor(privateKeyBase58?: string, keyId?: string) {
    if (privateKeyBase58) {
      const privateKey = bs58.decode(privateKeyBase58);
      this.keyPair = nacl.sign.keyPair.fromSecretKey(privateKey);
      this.keyId = keyId || this.generateKeyId();
    } else {
      this.keyPair = nacl.sign.keyPair();
      this.keyId = this.generateKeyId();
    }
  }

  private generateKeyId(): string {
    return bs58.encode(this.keyPair.publicKey);
  }

  public getPublicKey(): string {
    return bs58.encode(this.keyPair.publicKey);
  }

  public getKeyId(): string {
    return this.keyId;
  }

  public signTAPRequest(requestData: TAPRequestData): TAPSignature {
    const created = Math.floor(Date.now() / 1000);
    const expires = created + 480; // 8 minutes
    
    const signatureInput = `sig2=("@authority" "@path");created=${created};keyid="${this.keyId}";expires=${expires};nonce="${requestData.nonce}";tag="${requestData.tag}"`;
    
    const signatureBase = this.createSignatureBase(
      requestData.authority,
      requestData.path,
      created,
      this.keyId,
      expires,
      requestData.nonce,
      requestData.tag
    );

    const signature = nacl.sign.detached(
      new TextEncoder().encode(signatureBase),
      this.keyPair.secretKey
    );

    const signatureB64 = this.base64UrlEncode(signature);

    return {
      'Signature-Input': signatureInput,
      'Signature': `sig2=:${signatureB64}:`
    };
  }

  private createSignatureBase(
    authority: string,
    path: string,
    created: number,
    keyid: string,
    expires: number,
    nonce: string,
    tag: string
  ): string {
    return `"@authority": ${authority}\n` +
           `"@path": ${path}\n` +
           `"@signature-params": sig2=("@authority" "@path");` +
           `created=${created};` +
           `keyid="${keyid}";` +
           `expires=${expires};` +
           `nonce="${nonce}";` +
           `tag="${tag}"`;
  }

  private base64UrlEncode(data: Uint8Array): string {
    return btoa(String.fromCharCode(...data))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '');
  }

  public verifySignature(
    signatureBase: string,
    signature: string,
    publicKey?: Uint8Array
  ): boolean {
    try {
      const sigBytes = this.base64UrlDecode(signature);
      const pubKey = publicKey || this.keyPair.publicKey;
      
      return nacl.sign.detached.verify(
        new TextEncoder().encode(signatureBase),
        sigBytes,
        pubKey
      );
    } catch (error) {
      return false;
    }
  }

  private base64UrlDecode(data: string): Uint8Array {
    const base64 = data
      .replace(/-/g, '+')
      .replace(/_/g, '/');
    
    const padding = '='.repeat((4 - (base64.length % 4)) % 4);
    const binaryString = atob(base64 + padding);
    
    return new Uint8Array(
      Array.from(binaryString, char => char.charCodeAt(0))
    );
  }
}