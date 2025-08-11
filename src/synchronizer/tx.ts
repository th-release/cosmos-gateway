import { DecodedTxRaw, decodeTxRaw } from "@cosmjs/proto-signing";
import { CosmosTransaction } from "./types";
import { Repository } from "typeorm";
import { TransactionEntity } from "src/entities/transaction.entity";
import { databaseLoader } from "src/utils/db-loader";
import { toHex } from "@cosmjs/encoding";
import { sha256 } from '@cosmjs/crypto';
import { uint8ArrayToHex } from "./utils";

export class Transaction {
    public repository: Repository<TransactionEntity> = databaseLoader.getRepository(TransactionEntity);

    public async save(entity: TransactionEntity | TransactionEntity[]): Promise<TransactionEntity | TransactionEntity[]> {
        return await this.repository.save(entity as any)
    }

    public async deleteAll() {
        return await this.repository.deleteAll()
    }

    public decodeCosmosTransaction(data: Uint8Array<ArrayBufferLike>): CosmosTransaction {
        try {
            const hash = toHex(sha256(data))

            const decodedTx: DecodedTxRaw = decodeTxRaw(data);

            const signerInfo = decodedTx.authInfo.signerInfos.map((v, _) => {
                return {
                    publicKey: {
                        typeUrl: v.publicKey.typeUrl,
                        value: uint8ArrayToHex(v.publicKey.value)
                    },
                    modeInfo: v.modeInfo,
                    sequence: Number(v.sequence)
                }
            })

            const authInfo = {
                fee: decodedTx.authInfo.fee,
                tip: decodedTx.authInfo.tip,
                signerInfos: signerInfo
            }
        
            return {
                hash,
                authInfo: authInfo,
                body: {
                    extensionOptions: decodedTx.body.extensionOptions,
                    memo: decodedTx.body.memo,
                    messages: decodedTx.body.messages as any[],
                    nonCriticalExtensionOptions: decodedTx.body.nonCriticalExtensionOptions,
                    timeoutHeight: decodedTx.body.timeoutHeight
                },
                signatures: decodedTx.signatures.map((v) => {
                    return uint8ArrayToHex(v)
                })
            };
        } catch (error) {
            console.error('Failed to decode transaction:', error);
            throw error;
        }
    }
    
    public transactionFromJSON(jsonString: string): CosmosTransaction {
        const parsed = JSON.parse(jsonString);
        
        return {
            ...parsed,
            raw: {
                bodyBytes: new Uint8Array(Buffer.from(parsed.raw.bodyBytes, 'base64')),
                authInfoBytes: new Uint8Array(Buffer.from(parsed.raw.authInfoBytes, 'base64')),
                signatures: parsed.raw.signatures.map((sig: string) => 
                new Uint8Array(Buffer.from(sig, 'base64'))
                ),
            }
        };
    }  
}